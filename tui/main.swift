import Foundation
import SwiftTUI

// ponytail: static render, not a live dashboard. `surf-tui` prints the
// runner's current state as a terminal card and exits — the house pattern for
// apps whose logic lives server-side (same shape as cadence/wordroot/curvely).
// A redraw loop would be a bigger UI than checking on it over SSH needs.
//
// Host comes from SURF_HOST so this works against the tunnel from anywhere:
//   SURF_HOST=pwnlingo-status.heyitsmejosh.com surf-tui

struct RunState: Decodable {
    let at, started, track: String
    let username: String?
    let paused: Bool?
    let streak, xpGoal, hearts, maxHearts, league: Int?
    let lessons, puzzles, matches, misses: Int
    let xp0, xp: Int?
    let last: String?
}

let leagueNames = ["Bronze", "Silver", "Gold", "Sapphire", "Ruby",
                   "Emerald", "Amethyst", "Pearl", "Obsidian", "Diamond"]
let trackNames = ["math": "Math", "chess": "Chess", "music": "Music",
                  "es": "Spanish", "el": "Greek", "fr": "French", "de": "German"]

let host = ProcessInfo.processInfo.environment["SURF_HOST"] ?? "localhost:8737"

// run.mjs timestamps carry fractional seconds; a default ISO8601DateFormatter
// returns nil for those, which silently blanks elapsed time and disables the
// stuck check. Same formatter the GUI apps use.
let surfDateFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

func fetchState() -> RunState? {
    guard let url = URL(string: "http://\(host)/state") else { return nil }
    var result: RunState?
    let semaphore = DispatchSemaphore(value: 0)
    URLSession.shared.dataTask(with: url) { data, _, _ in
        if let data { result = try? JSONDecoder().decode(RunState.self, from: data) }
        semaphore.signal()
    }.resume()
    _ = semaphore.wait(timeout: .now() + 8)
    return result
}

func elapsed(since started: String) -> String {
    guard let start = surfDateFormatter.date(from: started) else { return "" }
    let secs = Int(Date().timeIntervalSince(start))
    let h = secs / 3600, m = (secs % 3600) / 60
    return h > 0 ? "\(h)h \(m)m" : "\(m)m"
}

/// Stale means the runner stopped writing its heartbeat — the same 90s rule the
/// GUI apps use, which is how a hung browser session looks different from idle.
func isStale(_ s: RunState) -> Bool {
    guard let at = surfDateFormatter.date(from: s.at) else { return false }
    return Date().timeIntervalSince(at) > 90
}

struct StatusCard: View {
    let state: RunState?
    let host: String

    var body: some View {
        VStack(alignment: .leading) {
            if let s = state {
                Text("Surf: \(trackNames[s.track] ?? s.track)").bold()
                if let u = s.username {
                    Text("\(u)\(s.league.flatMap { leagueNames.indices.contains($0) ? "  ·  \(leagueNames[$0]) League" : nil } ?? "")")
                }

                if let xp0 = s.xp0, let xp = s.xp {
                    Text("+\(xp - xp0) XP in \(elapsed(since: s.started))")
                }

                if s.track == "chess" {
                    Text("\(s.puzzles) puzzles  ·  \(s.misses) misses  ·  \(s.matches) matches")
                } else {
                    Text("\(s.lessons) lessons")
                }

                if let streak = s.streak, let h = s.hearts, let m = s.maxHearts {
                    Text("\(streak) day streak  ·  \(h)/\(m) hearts")
                }

                if isStale(s) {
                    Text("STUCK: no update in 90s+").bold()
                } else if s.paused == true {
                    Text("PAUSED").bold()
                } else {
                    Text("running  ·  \(s.last ?? "")")
                }
            } else {
                Text("Can't reach \(host)").bold()
                Text("Is run.mjs up? Set SURF_HOST for a remote one.")
            }
        }
        .padding()
        .border()
    }
}

Application(rootView: StatusCard(state: fetchState(), host: host)).start()
