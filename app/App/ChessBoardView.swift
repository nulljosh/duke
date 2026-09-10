import SwiftUI

// ponytail: FEN → grid is a solved, bounded problem (8x8, one glyph per square).
// Recreating Duolingo's own lesson widgets natively is not — screenshot stays for those.
private let glyphs: [Character: String] = [
    "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
    "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟",
]

struct ChessBoardView: View {
    let fen: String

    private var ranks: [[Character?]] {
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

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let cell = size / 8
            VStack(spacing: 0) {
                ForEach(0..<8, id: \.self) { r in
                    HStack(spacing: 0) {
                        ForEach(0..<8, id: \.self) { c in
                            let dark = (r + c) % 2 == 1
                            ZStack {
                                Rectangle().fill(dark ? Color(red: 0.46, green: 0.59, blue: 0.34) : Color(red: 0.93, green: 0.93, blue: 0.82))
                                if let piece = ranks.indices.contains(r) ? ranks[r][safe: c].flatMap({ $0 }) : nil,
                                   let g = glyphs[piece] {
                                    Text(g).font(.system(size: cell * 0.7))
                                }
                            }
                            .frame(width: cell, height: cell)
                        }
                    }
                }
            }
            .frame(width: size, height: size)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
