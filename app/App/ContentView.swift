import SwiftUI

let otherTracks = ["math", "chess", "music"]
// ponytail: courseIdFor() in run.mjs already accepts any 2-letter code via its
// generic 'DUOLINGO_<CODE>_EN' fallback (zh/nl are the only hardcoded overrides) —
// this list only drives what shows up in the picker, not what the runner can play.
let languages: [(code: String, name: String)] = [
    ("es", "Spanish"), ("fr", "French"), ("de", "German"), ("it", "Italian"),
    ("pt", "Portuguese"), ("ja", "Japanese"), ("zh", "Chinese"), ("ko", "Korean"),
    ("ru", "Russian"), ("ar", "Arabic"), ("hi", "Hindi"), ("nl", "Dutch"),
    ("sv", "Swedish"), ("tr", "Turkish"), ("el", "Greek"), ("pl", "Polish"),
    ("cy", "Welsh"), ("ga", "Irish"), ("hu", "Hungarian"), ("da", "Danish"),
    ("id", "Indonesian"), ("vi", "Vietnamese"), ("uk", "Ukrainian"), ("ro", "Romanian"),
    ("cs", "Czech"), ("he", "Hebrew"), ("yi", "Yiddish"), ("sw", "Swahili"),
    ("hw", "Hawaiian"), ("la", "Latin"), ("eo", "Esperanto"), ("zu", "Zulu"),
    ("gd", "Scottish Gaelic"), ("fi", "Finnish"), ("tl", "Tagalog"), ("ht", "Haitian Creole"),
    ("gn", "Guarani"), ("nv", "Navajo"), ("kl", "Klingon"),
]
let tracks = otherTracks + languages.map(\.code)
let trackNames: [String: String] = Dictionary(uniqueKeysWithValues: languages.map { ($0.code, $0.name) })
    .merging(["math": "Math", "chess": "Chess", "music": "Music"]) { a, _ in a }

struct ContentView: View {
    @ObservedObject private var poller = Poller.shared
    @State private var showFullScreenshot = false
    #if !os(macOS)
    @State private var editingHost = false
    #endif

    var body: some View {
        VStack(spacing: 14) {
            if let s = poller.state {
                if s.track == "chess", let fen = poller.fen {
                    // live-rendered from FEN, no screenshot needed for chess
                    ChessBoardView(fen: fen)
                        .frame(maxWidth: .infinity)
                        .opacity(s.paused == true ? 0.5 : 1)
                } else {
                    // ponytail: cache-bust with s.at (already ticks every poll) instead of a second timer
                    Button { showFullScreenshot = true } label: {
                        AsyncImage(url: screenshotURL(s)) { img in
                            img.resizable().aspectRatio(contentMode: .fit)
                        } placeholder: { Color.black.opacity(0.05) }
                            .aspectRatio(1400.0 / 900.0, contentMode: .fit)
                            .frame(maxWidth: .infinity)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                    .help("Click to enlarge")
                }

                if let u = s.username {
                    Text(u).font(.caption).foregroundStyle(.secondary)
                }
                Text(trackNames[s.track] ?? s.track.capitalized).font(.title2.bold())
                if let xp0 = s.xp0, let xp = s.xp {
                    Text("+\(xp - xp0) XP").font(.largeTitle.monospacedDigit().bold()).foregroundStyle(.green)
                    if let rate = xpPerMinute(s, gained: xp - xp0) {
                        Text("\(rate, specifier: "%.1f") XP/min").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                HStack(spacing: 28) {
                    if s.track == "chess" {
                        stat("Puzzles", s.puzzles)
                        stat("Misses", s.misses, tint: s.misses > 0 ? .red : nil)
                        stat("Matches", s.matches)
                    } else {
                        stat("Lessons", s.lessons)
                    }
                }
                if let missRate = missRate(s) {
                    Text("\(missRate, specifier: "%.0f")% miss rate").font(.caption2).foregroundStyle(.secondary)
                }
                Text(elapsed(since: s.started)).font(.caption2).foregroundStyle(.secondary)
                Button { poller.togglePause() } label: {
                    Label(s.paused == true ? "Resume" : "Pause", systemImage: s.paused == true ? "play.fill" : "pause.fill")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                Group {
                    if poller.stale {
                        Label("Stuck — no update in 90s+", systemImage: "exclamationmark.triangle.fill")
                            .font(.caption).foregroundStyle(.red)
                    } else if let last = poller.events.first {
                        Text(last.summary).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                .frame(height: 14)
                .padding(.bottom, 14)
            } else if poller.unreachable {
                Label("Can't reach \(poller.host)", systemImage: "wifi.slash").foregroundStyle(.red)
            } else {
                ProgressView()
            }
        }
        .padding(.top, 8)
        .padding(.horizontal, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        #if !os(macOS)
        .overlay(alignment: .topTrailing) {
            Button { editingHost = true } label: { Image(systemName: "gearshape") }
                .buttonStyle(.plain)
                .padding(14)
        }
        #endif
        .task { poller.start() }
        .frame(minWidth: 320, idealWidth: 420, minHeight: 420, idealHeight: 640)
        #if !os(macOS)
        .sheet(isPresented: $editingHost) {
            VStack(spacing: 12) {
                Text("Mac address").font(.headline)
                TextField("host:port", text: $poller.host).textFieldStyle(.roundedBorder)
                Button("Done") { editingHost = false; poller.reload() }
            }
            .padding()
            .frame(width: 260)
        }
        #endif
        .sheet(isPresented: $showFullScreenshot) {
            VStack(spacing: 0) {
                if let s = poller.state {
                    AsyncImage(url: screenshotURL(s)) { img in
                        img.resizable().aspectRatio(contentMode: .fit)
                    } placeholder: { ProgressView() }
                }
                Button("Close") { showFullScreenshot = false }
                    .padding()
            }
            .frame(minWidth: 700, minHeight: 480)
        }
    }

    private func screenshotURL(_ s: RunState) -> URL? {
        URL(string: "http://\(poller.host)/screenshot?t=\(s.at)")
    }

    private func elapsed(since started: String) -> String {
        guard let start = ISO8601DateFormatter().date(from: started) else { return "" }
        let secs = Int(Date().timeIntervalSince(start))
        let h = secs / 3600, m = (secs % 3600) / 60
        return h > 0 ? "running \(h)h \(m)m" : "running \(m)m"
    }

    private func xpPerMinute(_ s: RunState, gained: Int) -> Double? {
        guard let start = ISO8601DateFormatter().date(from: s.started) else { return nil }
        let mins = Date().timeIntervalSince(start) / 60
        guard mins > 1, gained > 0 else { return nil }
        return Double(gained) / mins
    }

    private func missRate(_ s: RunState) -> Double? {
        guard s.track == "chess" else { return nil }
        let total = s.puzzles + s.misses
        guard total > 0 else { return nil }
        return Double(s.misses) / Double(total) * 100
    }

    @ViewBuilder private func stat(_ label: String, _ value: Int, tint: Color? = nil) -> some View {
        VStack {
            Text("\(value)").font(.title3.monospacedDigit().bold()).foregroundStyle(tint ?? .primary)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }
}
