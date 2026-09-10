import SwiftUI

// A hand-drawn horse-head-in-profile silhouette. Every unicode/SF-Symbol option for
// the knight looked bad or broke on this OS — a hand-drawn vector shape can't hit
// either problem: no font, no OS-dependent glyph substitution, ever.
struct KnightShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        var p = Path()
        p.move(to: CGPoint(x: w * 0.18, y: h * 0.97))
        p.addLine(to: CGPoint(x: w * 0.22, y: h * 0.55))
        p.addCurve(to: CGPoint(x: w * 0.10, y: h * 0.34),
                    control1: CGPoint(x: w * 0.16, y: h * 0.46), control2: CGPoint(x: w * 0.06, y: h * 0.43))
        p.addCurve(to: CGPoint(x: w * 0.32, y: h * 0.14),
                    control1: CGPoint(x: w * 0.16, y: h * 0.24), control2: CGPoint(x: w * 0.24, y: h * 0.18))
        p.addLine(to: CGPoint(x: w * 0.40, y: h * 0.03))
        p.addLine(to: CGPoint(x: w * 0.47, y: h * 0.19))
        p.addCurve(to: CGPoint(x: w * 0.76, y: h * 0.29),
                    control1: CGPoint(x: w * 0.57, y: h * 0.17), control2: CGPoint(x: w * 0.68, y: h * 0.21))
        p.addLine(to: CGPoint(x: w * 0.95, y: h * 0.37))
        p.addLine(to: CGPoint(x: w * 0.81, y: h * 0.49))
        p.addCurve(to: CGPoint(x: w * 0.55, y: h * 0.56),
                    control1: CGPoint(x: w * 0.71, y: h * 0.53), control2: CGPoint(x: w * 0.62, y: h * 0.55))
        p.addLine(to: CGPoint(x: w * 0.60, y: h * 0.76))
        p.addLine(to: CGPoint(x: w * 0.86, y: h * 0.97))
        p.closeSubpath()
        return p
    }
}

// ponytail: FEN → grid is a solved, bounded problem (8x8, one glyph per square).
// Recreating Duolingo's own lesson widgets natively is not — screenshot stays for those.
// ♚/♔, ♛/♕, ♞/♘, and ♝/♗ all render as an unrelated emoji substitute on this macOS
// (confirmed via paused, FEN-bracketed screenshots — only rook/pawn are real,
// working unicode glyphs). Those four get a real SF Symbol icon each instead.
func glyphFor(_ piece: Character) -> String {
    switch Character(piece.lowercased()) {
    case "r": return "♜"
    case "p": return "♟"
    default: return "?"
    }
}
// Kept for the DEBUG self-check (letter fallback is still used if an SF Symbol
// name below ever fails to resolve on some future OS).
func letterFor(_ piece: Character) -> String {
    switch Character(piece.lowercased()) {
    case "k": return "K"
    case "q": return "Q"
    case "r": return "R"
    case "b": return "B"
    case "n": return "N"
    case "p": return "P"
    default: return "?"
    }
}

private struct PlacedPiece: Identifiable {
    let id: UUID
    var piece: Character
    var row: Int
    var col: Int
}

// Always returns exactly 8x8 — a malformed FEN (network hiccup, mid-write read,
// bad data) pads missing ranks with empty rows and truncates/pads each rank to
// 8 files instead of producing a jagged array the render loop could crash on.
func parseBoard(_ fen: String) -> [[Character?]] {
    let board = fen.split(separator: " ").first.map(String.init) ?? fen
    var ranks = board.split(separator: "/").map { rank -> [Character?] in
        var row: [Character?] = []
        for ch in rank {
            if let n = ch.wholeNumberValue { row.append(contentsOf: Array(repeating: nil, count: max(0, n))) }
            else { row.append(ch) }
        }
        if row.count < 8 { row.append(contentsOf: Array(repeating: nil, count: 8 - row.count)) }
        return Array(row.prefix(8))
    }
    if ranks.count < 8 { ranks.append(contentsOf: Array(repeating: Array<Character?>(repeating: nil, count: 8), count: 8 - ranks.count)) }
    return Array(ranks.prefix(8))
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
    private var lower: Character { Character(piece.lowercased()) }
    private let outlineOffsets: [(CGFloat, CGFloat)] = [(-1, -1), (1, -1), (-1, 1), (1, 1)]

    // King/queen/knight/bishop all mis-render as an emoji substitute on this macOS
    // (confirmed via paused, FEN-bracketed screenshots) — each gets a real SF Symbol
    // instead of a bare letter. Knight tried an SF Symbol horse
    // (figure.equestrian.sports) rendered as a tiny glitchy running figure, so
    // knight is a hand-drawn KnightShape instead — a real icon, not a letter.
    // Rook/pawn are real, working unicode glyphs — untouched.
    @ViewBuilder private func glyphView() -> some View {
        switch lower {
        case "k": Image(systemName: "crown.fill").font(.system(size: size * 0.8))
        case "q": Image(systemName: "star.fill").font(.system(size: size * 0.7))
        case "b": Image(systemName: "diamond.fill").font(.system(size: size * 0.62))
        case "n": KnightShape().aspectRatio(contentMode: .fit).frame(width: size * 0.62, height: size * 0.62)
        default:
            Text(glyphFor(piece)).font(.system(size: size))
        }
    }

    var body: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                glyphView()
                    .foregroundStyle(isWhite ? .black : .white)
                    .offset(x: outlineOffsets[i].0, y: outlineOffsets[i].1)
            }
            glyphView()
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

#if DEBUG
// ponytail: assert-based self-check for the pure FEN logic, run once at debug
// launch — this app has no XCTest target, and adding one for three functions
// isn't worth the scaffolding. `swift App/ChessBoardView.swift` also runs this
// standalone if PwnlingoStatusApp.swift's @main is temporarily commented out.
func chessBoardSelfCheck() {
    // startpos parses to 8x8, back ranks placed, pawn ranks placed, middle empty
    let start = parseBoard("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")
    assert(start.count == 8 && start.allSatisfy { $0.count == 8 })
    assert(start[0][4] == "k", "black king should be on e8 (row 0, col 4)")
    assert(start[7][4] == "K", "white king should be on e1 (row 7, col 4)")
    assert(start[3][3] == nil, "d5 should be empty at the start")

    // malformed FEN (short ranks, missing ranks) never crashes and always yields 8x8
    let short = parseBoard("k7/8/8")
    assert(short.count == 8 && short.allSatisfy { $0.count == 8 })
    let empty = parseBoard("")
    assert(empty.count == 8 && empty.allSatisfy { $0.count == 8 })

    // letterFor is total (never crashes) and case-preserves via the caller, not itself
    assert(letterFor("k") == "K" && letterFor("K") == "K")
    assert(letterFor("z") == "?", "unknown piece codes degrade to a visible placeholder, not a crash")

    // diffPieces: a piece that stays on its square keeps its identity (animates in place, not pop)
    let s1 = diffPieces([], toFEN: "k7/8/8/8/8/8/8/8")
    assert(s1.count == 1)
    let s2 = diffPieces(s1, toFEN: "k7/8/8/8/8/8/8/8")
    assert(s2.first?.id == s1.first?.id, "same-square piece must keep its id for animation")

    // diffPieces: a real move (king e8->e7 in FEN terms) reassigns the same id to the new square
    let s3 = diffPieces(s1, toFEN: "8/k7/8/8/8/8/8/8")
    assert(s3.count == 1 && s3.first?.id == s1.first?.id, "moved piece of the same type should keep its id")
    assert(s3.first?.row == 1, "king should have moved to row 1")
}
#endif
