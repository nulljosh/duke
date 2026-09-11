#if os(macOS)
import SwiftUI

/// Menu bar title: live XP, or a warning glyph when the runner has gone quiet.
struct MenuBarLabel: View {
    @ObservedObject private var poller = Poller.shared
    // XP by default. The question is available but off by default on purpose:
    // prompts change every few seconds, and a title that resizes with them
    // shoves every other menu bar icon sideways each time. Truncated hard for
    // the same reason — the dropdown card carries the full prompt and choices.
    @AppStorage("menuBarShows") private var menuBarShows = "xp"

    private var questionTitle: String? {
        guard let p = poller.state?.prompt, !p.isEmpty else { return nil }
        return p.count > 24 ? String(p.prefix(23)) + "\u{2026}" : p
    }

    var body: some View {
        Group {
            if poller.stale {
                Image(systemName: "exclamationmark.triangle.fill")
                    .accessibilityLabel(Text("Runner has gone quiet"))
            } else if menuBarShows == "question", let q = questionTitle {
                Text(q)
            } else if let s = poller.state, let n = s.xpToday ?? (s.xp0.flatMap { a in s.xp.map { $0 - a } }) {
                Text("+\(n)")
            } else {
                Image(systemName: "gamecontroller")
                    .accessibilityLabel("pwnlingo")
            }
        }
        .task { poller.start() }
    }
}

/// What drops down from the menu bar: the board if there is one, the numbers
/// that matter, and pause. Deliberately not the whole ContentView — a menu bar
/// panel that needs scrolling defeats the point.
struct MenuBarPanel: View {
    @ObservedObject private var poller = Poller.shared
    @Environment(\.openSettings) private var openSettings
    @AppStorage("backgroundRun") private var backgroundRun = true
    @AppStorage("startTrack") private var startTrack = "chess"

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let s = poller.state {
                if poller.switching {
                    ProgressView().frame(width: 220, height: 140)
                } else if s.track == "chess", let fen = poller.fen {
                    ChessBoardView(fen: fen)
                        .frame(width: 220, height: 220)
                        .opacity(s.paused == true ? 0.5 : 1)
                } else if s.prompt != nil || s.answer != nil || !(s.choices?.isEmpty ?? true) || !(s.grid?.isEmpty ?? true) {
                    PromptCardView(prompt: s.prompt, answer: s.answer, choices: s.choices, grid: s.grid)
                        .frame(width: 220, height: 140)
                        .opacity(s.paused == true ? 0.5 : 1)
                } else {
                    AuthedImage(url: URL(string: "http://\(poller.host)/screenshot?t=\(s.at)"), token: poller.token)
                        .frame(width: 220, height: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .opacity(s.paused == true ? 0.5 : 1)
                }

                HStack {
                    if let u = s.username {
                        Text(u).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    // Today's gain, not the session's: xp0 resets on every
                    // restart, so the session number reads low after a crash.
                    if let today = s.xpToday {
                        Text("+\(today) XP today")
                            .font(.title3.monospacedDigit().bold())
                            .foregroundStyle(.green)
                    } else if let xp0 = s.xp0, let xp = s.xp {
                        Text("+\(xp - xp0) XP")
                            .font(.title3.monospacedDigit().bold())
                            .foregroundStyle(.green)
                    }
                }

                HStack(spacing: 14) {
                    if s.track == "chess" {
                        Text("\(s.puzzles) puzzles")
                        Text("\(s.misses) misses").foregroundStyle(s.misses > 0 ? .red : .secondary)
                    } else {
                        Text("\(s.lessons) lessons")
                    }
                    if let streak = s.streak { Text("\(streak) day streak") }
                }
                .font(.caption)
                .foregroundStyle(.secondary)

                HStack(spacing: 4) {
                    Text(uptimeString(since: s.started))
                    if let rate = perHourRate(s.track == "chess" ? s.puzzles : s.lessons, since: s.started) {
                        Text("· \(rate, specifier: "%.0f")/hr")
                    }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)

                // Two different things, deliberately not merged: the bar is the
                // task in flight right now, the line under it is the whole course.
                VStack(alignment: .leading, spacing: 3) {
                    if let step = s.puzzleStep, let total = s.puzzleTotal, total > 0 {
                        progressBar(min(1, max(0, Double(step) / Double(total))))
                        Text("Move \(min(step + 1, total)) of \(total) in this puzzle")
                            .font(.caption2).foregroundStyle(.secondary)
                    } else if let p = s.progress {
                        // Nothing in flight — fall back to the course bar so the row isn't dead.
                        progressBar(min(1, max(0, p.pct / 100)))
                    }

                    if let p = s.progress {
                        // The countdown is about finishing the ENTIRE track, not
                        // the current puzzle — say so in words, don't make it guessable.
                        Text(courseCountdown(p, track: s.track))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                if poller.stale {
                    Label("No update in 90s+", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption).foregroundStyle(.red)
                }

                Divider()

                HStack {
                    Button(s.paused == true ? "Resume" : "Pause") { poller.togglePause() }
                    Spacer()
                    Menu(trackNames[s.track] ?? s.track.capitalized) {
                        ForEach(otherTracks, id: \.self) { t in
                            Button(trackNames[t] ?? t.capitalized) { poller.switchTrack(t) }
                        }
                        Menu("Language") {
                            ForEach(languages, id: \.code) { lang in
                                Button(lang.name) { poller.switchTrack(lang.code) }
                            }
                        }
                    }
                }

                HStack {
                    Button("Settings…") { openSettings() }
                    Spacer()
                    Button("Quit") {
                        if !backgroundRun { poller.quit() }
                        NSApplication.shared.terminate(nil)
                    }
                }
            } else if poller.unreachable {
                Label("Not running", systemImage: "wifi.slash")
                    .foregroundStyle(.secondary)
                Button("Start \(trackNames[startTrack] ?? startTrack)") { SolverProcess.start(track: startTrack) }
                Button("Settings…") { openSettings() }
            } else {
                ProgressView()
            }
        }
        .padding(12)
        .frame(width: 250)
        .task { poller.start() }
    }

    @ViewBuilder private func progressBar(_ fraction: Double) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.primary.opacity(0.12))
                Capsule().fill(Color.accentColor).frame(width: geo.size.width * fraction)
            }
        }
        .frame(height: 4)
    }

    private func courseCountdown(_ p: CourseProgress, track: String) -> String {
        let name = trackNames[track] ?? track.capitalized
        let pct = String(format: "%.1f%%", p.pct)
        // No measured rate yet → say how much is left, never invent a duration.
        // Each piece goes through the catalog; a plain interpolation would not.
        let left = p.etaText.map { String(localized: "~\($0) until all of \(name) is done") }
            ?? String(localized: "\(p.remaining) levels until all of \(name) is done")
        return String(localized: "\(pct) of \(name)") + " · " + left
    }
}
#endif
