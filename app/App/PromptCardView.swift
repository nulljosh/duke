import SwiftUI

// ponytail: native card for the language/math prompt/choices/answer/grid
// (run.mjs exposes these via solveLang()'s ledger row and math.js's widget())
// — same idea as ChessBoardView: render the actual elements, not a
// screenshot of the page. choices (the answer tile row) and grid (a
// pattern/data table) are the "move by move" equivalent of the chess board.
// A widget type with nothing textual (geometry/SVG/number-line/drag) has
// every field nil here — that's the one case that still falls back to the
// cropped screenshot, decided by the caller, not this view.
struct PromptCardView: View {
    let prompt: String?
    let answer: String?
    let choices: [String]?
    let grid: [[String]]?

    var body: some View {
        VStack(spacing: 8) {
            if let prompt {
                Text(prompt).font(.surf(.title3, .medium)).multilineTextAlignment(.center)
                    .lineLimit(3).fixedSize(horizontal: false, vertical: true)
            }
            if let grid, !grid.isEmpty {
                Grid(horizontalSpacing: 8, verticalSpacing: 4) {
                    ForEach(0..<grid.count, id: \.self) { r in
                        GridRow {
                            ForEach(0..<grid[r].count, id: \.self) { c in
                                Text(grid[r][c]).font(.callout.monospacedDigit())
                            }
                        }
                    }
                }
            }
            if let choices, !choices.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(choices, id: \.self) { choice in
                        Text(choice)
                            .font(.surf(.callout))
                            .padding(.horizontal, 12).padding(.vertical, 4)
                            .background(choice == answer ? Color.surf.opacity(0.25) : Color.primary.opacity(0.08),
                                        in: Capsule())
                            .foregroundStyle(choice == answer ? Color.surf : .primary)
                    }
                }
            } else if let answer {
                Text(answer).font(.surf(.callout)).foregroundStyle(Color.surf).multilineTextAlignment(.center)
            }
            if prompt == nil && (grid?.isEmpty ?? true) && (choices?.isEmpty ?? true) && answer == nil {
                Image(systemName: "book.closed").font(.largeTitle).foregroundStyle(.secondary)
                    .accessibilityHidden(true)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// ponytail: SwiftUI has no built-in wrapping HStack — this is the minimum
// Layout implementation to wrap chips onto multiple lines.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width.isFinite ? width : x, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
