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

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let s = poller.state {
                if s.track == "chess", let fen = poller.fen {
                    ChessBoardView(fen: fen)
                        .frame(width: 220, height: 220)
                        .opacity(s.paused == true ? 0.5 : 1)
                }

                HStack {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(trackNames[s.track] ?? s.track.capitalized).font(.headline)
                        if let u = s.username {
                            Text(u).font(.caption).foregroundStyle(.secondary)
                        }
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

                if poller.stale {
                    Label("No update in 90s+", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption).foregroundStyle(.red)
                }

                Divider()

                HStack {
                    Button(s.paused == true ? "Resume" : "Pause") { poller.togglePause() }
                    Spacer()
                    Button("Settings…") { openSettings() }
                    Button("Quit") { NSApplication.shared.terminate(nil) }
                }
            } else if poller.unreachable {
                Label("Can't reach \(poller.host)", systemImage: "wifi.slash")
                    .foregroundStyle(.red)
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
