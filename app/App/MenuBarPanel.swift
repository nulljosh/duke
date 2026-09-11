#if os(macOS)
import SwiftUI

/// Menu bar title: live XP, or a warning glyph when the runner has gone quiet.
struct MenuBarLabel: View {
    @ObservedObject private var poller = Poller.shared

    var body: some View {
        Group {
            if poller.stale {
                Image(systemName: "exclamationmark.triangle.fill")
            } else if let s = poller.state, let xp0 = s.xp0, let xp = s.xp {
                Text("+\(xp - xp0)")
            } else {
                Image(systemName: "gamecontroller")
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
                    if let xp0 = s.xp0, let xp = s.xp {
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

                if let p = s.progress {
                    VStack(alignment: .leading, spacing: 3) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.primary.opacity(0.12))
                                Capsule().fill(Color.accentColor)
                                    .frame(width: geo.size.width * min(1, max(0, p.pct / 100)))
                            }
                        }
                        .frame(height: 4)
                        HStack(spacing: 4) {
                            Text("\(p.pct, specifier: "%.1f")% of \(trackNames[s.track] ?? s.track.capitalized)")
                            Spacer()
                            // No measured rate yet → show what's left, not a fabricated ETA.
                            Text(p.etaText.map { "~\($0) left" } ?? "\(p.remaining) levels left")
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
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
}
#endif
