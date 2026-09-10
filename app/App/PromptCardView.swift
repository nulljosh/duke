import SwiftUI

// ponytail: native flashcard for the language track's prompt/choices/answer
// (run.mjs exposes these via ledgerRow(), see CLAUDE.md's solveLang() notes) —
// same idea as ChessBoardView: render the data, not a screenshot of the page.
// choices (the actual tile row) is the "move by move" equivalent for
// multiple-choice/select types; translate/word-bank types have no fixed pool
// so it falls back to just the prompt+answer text. Math has no exposed
// question data at all yet (autoLesson() never surfaces choices/prompt beyond
// __duo.prompt()'s plain text), so it stays screenshot-only for now.
struct PromptCardView: View {
    let prompt: String?
    let answer: String?
    let choices: [String]?

    var body: some View {
        VStack(spacing: 12) {
            if let prompt {
                Text(prompt).font(.title3.weight(.medium)).multilineTextAlignment(.center)
            }
            if let choices, !choices.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(choices, id: \.self) { choice in
                        Text(choice)
                            .font(.callout)
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .background(choice == answer ? Color.green.opacity(0.25) : Color.black.opacity(0.06),
                                        in: Capsule())
                            .foregroundStyle(choice == answer ? .green : .primary)
                    }
                }
            } else if let answer {
                Text(answer).font(.callout).foregroundStyle(.green).multilineTextAlignment(.center)
            }
            if prompt == nil && (choices?.isEmpty ?? true) && answer == nil {
                Image(systemName: "book.closed").font(.largeTitle).foregroundStyle(.secondary)
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
