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
let leagueNames = ["Bronze", "Silver", "Gold", "Sapphire", "Ruby", "Emerald", "Amethyst", "Pearl", "Obsidian", "Diamond"]

struct ContentView: View {
    @ObservedObject private var poller = Poller.shared
    #if !os(macOS)
    @State private var editingHost = false
    #endif

    var body: some View {
        ZStack(alignment: .bottom) {
            background
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            if let s = poller.state {
                overlayPanel(s)
                    .padding(14)
            }
            if poller.state == nil {
                if poller.unreachable {
                    Label("Can't reach \(poller.host)", systemImage: "wifi.slash")
                        .foregroundStyle(.red)
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                        .padding(14)
                } else {
                    ProgressView()
                }
            }
        }
        #if !os(macOS)
        .overlay(alignment: .topTrailing) {
            Button { editingHost = true } label: { Image(systemName: "gearshape") }
                .buttonStyle(.plain)
                .padding(14)
                .background(.ultraThinMaterial, in: Circle())
                .padding(10)
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
    }

    // ponytail: board/screenshot now fills the whole window as background art
    // (Apple Music "now playing" style) instead of a small card — the overlay
    // panel below floats on top with a frosted material so text stays legible.
    @ViewBuilder private var background: some View {
        if let s = poller.state {
            if s.track == "chess", let fen = poller.fen {
                // ponytail: no blur layer — a .cover crop chopped off board edges,
                // and the blurred-letterbox compromise for that turned out to be
                // its own eyesore. Plain contained board on a plain background:
                // shows the whole board, nothing extra to look at.
                ChessBoardView(fen: fen, cover: false)
                    .opacity(s.paused == true ? 0.5 : 1)
            } else {
                AsyncImage(url: screenshotURL(s)) { img in
                    img.resizable().aspectRatio(contentMode: .fit)
                } placeholder: { Color.clear }
            }
        } else {
            Color.black.opacity(0.05)
        }
    }

    @ViewBuilder private func overlayPanel(_ s: RunState) -> some View {
        VStack(spacing: 8) {
            if let progress = puzzleProgress(s) {
                // ponytail: real progress through the CURRENT puzzle's move plan
                // (run.mjs knows the full solution upfront), not a daily/session
                // metric. Resets empty between puzzles.
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.black.opacity(0.15))
                        Capsule().fill(Color.green).frame(width: geo.size.width * progress)
                    }
                }
                .frame(height: 4)
            }
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if let u = s.username {
                        Text(u).font(.caption).foregroundStyle(.secondary)
                    }
                    Text(trackNames[s.track] ?? s.track.capitalized).font(.title3.bold())
                    if let league = s.league, leagueNames.indices.contains(league) {
                        Text("\(leagueNames[league]) League").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if let xp0 = s.xp0, let xp = s.xp {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("+\(xp - xp0) XP").font(.title2.monospacedDigit().bold()).foregroundStyle(.green)
                        if let rate = xpPerMinute(s, gained: xp - xp0) {
                            Text("\(rate, specifier: "%.1f") XP/min").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
            }

            HStack(spacing: 16) {
                if let streak = s.streak {
                    Label("\(streak)", systemImage: "flame.fill").foregroundStyle(.orange)
                }
                if let hearts = s.hearts, let maxHearts = s.maxHearts {
                    Label("\(hearts)/\(maxHearts)", systemImage: "heart.fill").foregroundStyle(.red)
                }
                if let goal = s.xpGoal {
                    Label("\(goal)", systemImage: s.xpGoalMetToday == true ? "checkmark.circle.fill" : "target")
                        .foregroundStyle(s.xpGoalMetToday == true ? .green : .secondary)
                }
                Spacer()
                if s.track == "chess" {
                    stat("Puzzles", s.puzzles)
                    stat("Misses", s.misses, tint: s.misses > 0 ? .red : nil)
                    stat("Matches", s.matches)
                } else {
                    stat("Lessons", s.lessons)
                }
            }
            .font(.caption).labelStyle(.titleAndIcon)

            Divider()

            HStack {
                Group {
                    if poller.stale {
                        Label("Stuck — no update in 90s+", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    } else if let last = poller.events.first {
                        Text(last.summary).foregroundStyle(.secondary).lineLimit(1)
                    }
                    if let missRate = missRate(s) {
                        Text("· \(missRate, specifier: "%.0f")% miss").foregroundStyle(.secondary)
                    }
                }
                .font(.caption2)
                Spacer()
                Text(elapsed(since: s.started)).font(.caption2).foregroundStyle(.secondary)
                Button { poller.togglePause() } label: {
                    Image(systemName: s.paused == true ? "play.fill" : "pause.fill")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(12)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(.white.opacity(0.35), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.2), radius: 12, y: 4)
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

    private func puzzleProgress(_ s: RunState) -> CGFloat? {
        guard s.track == "chess", let step = s.puzzleStep, let total = s.puzzleTotal, total > 0 else { return nil }
        return min(1, max(0, CGFloat(step) / CGFloat(total)))
    }

    private func missRate(_ s: RunState) -> Double? {
        guard s.track == "chess" else { return nil }
        let total = s.puzzles + s.misses
        guard total > 0 else { return nil }
        return Double(s.misses) / Double(total) * 100
    }

    @ViewBuilder private func stat(_ label: String, _ value: Int, tint: Color? = nil) -> some View {
        VStack(spacing: 0) {
            Text("\(value)").font(.callout.monospacedDigit().bold()).foregroundStyle(tint ?? .primary)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
    }
}
