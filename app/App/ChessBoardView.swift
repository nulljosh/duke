import SwiftUI

// ponytail: FEN → grid is a solved, bounded problem (8x8, one glyph per square).
// Recreating Duolingo's own lesson widgets natively is not — screenshot stays for those.
private func glyph(for piece: Character) -> String {
    switch Character(piece.lowercased()) {
    case "k": return "♚"
    case "q": return "♛"
    case "r": return "♜"
    case "b": return "♝"
    case "n": return "♞"
    case "p": return "♟"
    default: return "?"
    }
}

private struct PlacedPiece: Identifiable {
    let id: UUID
    var piece: Character
    var row: Int
    var col: Int
}

private func parseBoard(_ fen: String) -> [[Character?]] {
    let board = fen.split(separator: " ").first.map(String.init) ?? fen
    return board.split(separator: "/").map { rank -> [Character?] in
        var row: [Character?] = []
        for ch in rank {
            if let n = ch.wholeNumberValue { row.append(contentsOf: Array(repeating: nil, count: n)) }
            else { row.append(ch) }
        }
        return row
    }
}

// Diffs the previous placed pieces against a new FEN so SwiftUI can animate each
// piece sliding to its new square instead of popping in/out. A piece keeps its
// identity if it's still on the same square, or (for a real move) by matching the
// nearest same-type piece that vanished elsewhere — good enough for real games;
// promotions/captures just spawn or drop an id, which is fine, they don't slide anyway.
private func diffPieces(_ old: [PlacedPiece], toFEN fen: String) -> [PlacedPiece] {
    let board = parseBoard(fen)
    var newSquares: [(Int, Int, Character)] = []
    for r in 0..<8 { for c in 0..<8 { if let p = board[r][c] { newSquares.append((r, c, p)) } } }

    var oldByPos: [String: PlacedPiece] = [:]
    for p in old { oldByPos["\(p.row),\(p.col)"] = p }

    var remainingOld = old
    var result: [PlacedPiece] = []
    var unmatched: [(Int, Int, Character)] = []

    for sq in newSquares {
        if let match = oldByPos["\(sq.0),\(sq.1)"], let idx = remainingOld.firstIndex(where: { $0.id == match.id }) {
            result.append(PlacedPiece(id: match.id, piece: sq.2, row: sq.0, col: sq.1))
            remainingOld.remove(at: idx)
        } else {
            unmatched.append(sq)
        }
    }

    for sq in unmatched {
        let candidates = remainingOld.enumerated().filter { $0.element.piece == sq.2 }
        if let best = candidates.min(by: { abs($0.element.row - sq.0) + abs($0.element.col - sq.1) < abs($1.element.row - sq.0) + abs($1.element.col - sq.1) }) {
            result.append(PlacedPiece(id: best.element.id, piece: sq.2, row: sq.0, col: sq.1))
            remainingOld.remove(at: best.offset)
        } else {
            result.append(PlacedPiece(id: UUID(), piece: sq.2, row: sq.0, col: sq.1))
        }
    }
    return result
}

private struct PieceGlyph: View {
    let piece: Character
    let size: CGFloat
    private var isWhite: Bool { piece.isUppercase }
    private var symbol: String { glyph(for: piece) }
    private let outlineOffsets: [(CGFloat, CGFloat)] = [(-1, -1), (1, -1), (-1, 1), (1, 1)]

    var body: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                Text(symbol).font(.system(size: size))
                    .foregroundStyle(isWhite ? .black : .white)
                    .offset(x: outlineOffsets[i].0, y: outlineOffsets[i].1)
            }
            Text(symbol).font(.system(size: size))
                .foregroundStyle(isWhite ? .white : .black)
        }
        .shadow(color: .black.opacity(0.35), radius: 1.5, y: 1)
    }
}

struct ChessBoardView: View {
    let fen: String
    @State private var pieces: [PlacedPiece] = []

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let cell = size / 8
            ZStack(alignment: .topLeading) {
                VStack(spacing: 0) {
                    ForEach(0..<8, id: \.self) { r in
                        HStack(spacing: 0) {
                            ForEach(0..<8, id: \.self) { c in
                                let dark = (r + c) % 2 == 1
                                Rectangle()
                                    .fill(dark ? Color(red: 0.46, green: 0.59, blue: 0.34) : Color(red: 0.93, green: 0.93, blue: 0.82))
                                    .frame(width: cell, height: cell)
                            }
                        }
                    }
                }
                ForEach(pieces) { p in
                    PieceGlyph(piece: p.piece, size: cell * 0.72)
                        .frame(width: cell, height: cell)
                        .position(x: CGFloat(p.col) * cell + cell / 2, y: CGFloat(p.row) * cell + cell / 2)
                }
            }
            .frame(width: size, height: size)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .onAppear { pieces = diffPieces([], toFEN: fen) }
        .onChange(of: fen) { _, newFEN in
            withAnimation(.easeInOut(duration: 0.35)) {
                pieces = diffPieces(pieces, toFEN: newFEN)
            }
        }
    }
}
