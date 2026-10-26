import SwiftUI

/// Today's XP against the account's daily goal, the ring Busuu and Duolingo put on their home screens.
/// A met goal shows a check.
struct GoalRing: View {
    let today: Int
    let goal: Int
    var size: CGFloat = 28

    var body: some View {
        let p = goal > 0 ? min(1, Double(today) / Double(goal)) : 0
        ZStack {
            Circle().stroke(Color.surf.opacity(0.2), lineWidth: size / 8)
            Circle().trim(from: 0, to: p)
                .stroke(Color.surf, style: StrokeStyle(lineWidth: size / 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            if p >= 1 {   // ponytail: no percent inside, at 24pt it read as a second XP number
                Image(systemName: "checkmark").font(.system(size: size * 0.38, weight: .bold)).foregroundStyle(Color.surf)
            }
        }
        .frame(width: size, height: size)
        .accessibilityElement()
        .accessibilityLabel("Daily goal")
        .accessibilityValue("\(today) of \(goal) XP")
    }
}
