#if os(watchOS)
import SwiftUI

// ponytail: the phone layout does not fit here and shrinking it would just make
// everything unreadable. A watch glance answers one question — "is it running,
// and how much has it earned" — so that is all this shows, with the board and
// the pause control one tap away.
struct WatchView: View {
    @ObservedObject private var poller = Poller.shared

    var body: some View {
        NavigationStack {
            Group {
                if let s = poller.state {
                    List {
                        Section {
                            if let xp0 = s.xp0, let xp = s.xp {
                                Text("+\(xp - xp0) XP")
                                    .font(.system(.title2, design: .rounded).bold())
                                    .foregroundStyle(.green)
                            }
                            Text(trackNames[s.track] ?? s.track.capitalized)
                                .font(.headline)
                            if poller.stale {
                                Label("Stuck", systemImage: "exclamationmark.triangle.fill")
                                    .font(.caption).foregroundStyle(.red)
                            } else if s.paused == true {
                                Label("Paused", systemImage: "pause.fill")
                                    .font(.caption).foregroundStyle(.orange)
                            }
                        }

                        Section {
                            LabeledContent(s.track == "chess" ? "Puzzles" : "Lessons",
                                           value: "\(s.track == "chess" ? s.puzzles : s.lessons)")
                            if s.track == "chess" {
                                LabeledContent("Misses", value: "\(s.misses)")
                            }
                            if let streak = s.streak {
                                LabeledContent("Streak", value: "\(streak)")
                            }
                            if let h = s.hearts, let m = s.maxHearts {
                                LabeledContent("Hearts", value: "\(h)/\(m)")
                            }
                        }
                        .font(.caption)

                        Section {
                            Button {
                                poller.togglePause()
                            } label: {
                                Label(s.paused == true ? "Resume" : "Pause",
                                      systemImage: s.paused == true ? "play.fill" : "pause.fill")
                            }
                            if s.track == "chess", let fen = poller.fen {
                                NavigationLink("Board") {
                                    ChessBoardView(fen: fen)
                                        .padding(4)
                                        .navigationTitle("Board")
                                }
                            }
                        }
                    }
                } else if poller.unreachable {
                    Label("Can't reach Mac", systemImage: "wifi.slash")
                        .font(.caption).foregroundStyle(.red)
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Pwnlingo")
        }
        .task { poller.start() }
    }
}
#endif
