import Foundation
import SwiftUI
#if os(macOS)
import AppKit
#elseif os(watchOS)
import WatchKit
#else
import AudioToolbox
#endif

// ponytail: run.mjs writes `new Date().toISOString()`, which carries fractional
// seconds ("…:05.132Z"). A default ISO8601DateFormatter refuses those and
// returns nil, which silently disabled every timestamp feature in the apps —
// the "stuck" warning could never fire because the parse failed before the
// comparison. Every client parses through this one formatter now.
let pwnlingoDateFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

struct RunState: Decodable {
    let at, started, track: String
    let username: String?
    let paused: Bool?
    let streak, xpGoal, hearts, maxHearts, league, puzzleStep, puzzleTotal: Int?
    let xpGoalMetToday: Bool?
    let lessons, puzzles, matches, misses: Int
    let xp0, xp: Int?
    let last: String?
    let prompt, answer: String?
    let choices: [String]?
    let grid: [[String]]?
}

struct FenResponse: Decodable { let fen: String? }

struct LogEvent: Decodable, Identifiable {
    var id: String { at + (ev ?? "") + (String(describing: ok) ) }
    let at: String
    let ev: String?
    let ok: Bool?
    let moves: [String]?
    let mv: String?
    let track: String?

    var summary: String {
        switch ev {
        case "puzzle": return ok == true ? "Solved puzzle" : "Missed puzzle"
        case "match-over": return "Match finished"
        case "switch": return "Switched to \(track ?? "?")"
        case "math": return "Math lesson"
        case "story-end": return "Finished story"
        case "rotate": return "Rotated course"
        default: return ev ?? "Working…"
        }
    }
}

// ponytail: plain polling over the LAN endpoint run.mjs serves (/state, /log)
// — no push, no websocket, a status readout doesn't need either.
@MainActor
final class Poller: ObservableObject {
    static let shared = Poller()
    @Published var state: RunState?
    @Published var events: [LogEvent] = []
    @Published var fen: String?
    @Published var stale = false
    @Published var unreachable = false
    @AppStorage("pwnlingoHost") var host = "localhost:8737"
    // The runner's reads are open; pause/resume/switch need this, since the
    // tunnel puts those routes on the public internet. Printed by run.mjs on
    // first start and stored in scripts/api-token.txt.
    @AppStorage("pwnlingoToken") var token = ""
    private var timer: Timer?
    private var lastEventId: String?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.reload() }
        }
        reload()
    }

    private func mutate(_ pathAndQuery: String) {
        guard let url = URL(string: "http://\(host)/\(pathAndQuery)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(token, forHTTPHeaderField: "X-Pwnlingo-Token")
        Task { _ = try? await URLSession.shared.data(for: req); reload() }
    }

    func togglePause() {
        mutate((state?.paused ?? false) ? "resume" : "pause")
    }

    // ponytail: run.mjs owns the rotation order and the actual timer/count
    // logic (persisted to cycle.json so it survives this app not running) —
    // this just flips the switch and sets mode/value.
    func setCycle(enabled: Bool, mode: String, value: Int) {
        mutate("cycle?enabled=\(enabled)&mode=\(mode)&value=\(value)")
    }

    func switchTrack(_ t: String) {
        mutate("switch?track=\(t)")
    }

    func quit() {
        mutate("quit")
    }

    func reload() {
        Task {
            guard let stateURL = URL(string: "http://\(host)/state"),
                  let logURL = URL(string: "http://\(host)/log") else { return }
            do {
                let (sData, _) = try await URLSession.shared.data(from: stateURL)
                let s = try JSONDecoder().decode(RunState.self, from: sData)
                let (lData, _) = try await URLSession.shared.data(from: logURL)
                let evs = (try? JSONDecoder().decode([LogEvent].self, from: lData)) ?? []
                await MainActor.run {
                    self.state = s
                    self.events = evs.reversed()
                    self.unreachable = false
                    if let newest = self.events.first, newest.id != self.lastEventId {
                        self.lastEventId = newest.id
                        self.playSound(for: newest)
                    }
                    if s.track != "chess" { self.fen = nil }
                    if let at = pwnlingoDateFormatter.date(from: s.at) {
                        self.stale = Date().timeIntervalSince(at) > 90
                    }
                }
                if s.track == "chess", let fenURL = URL(string: "http://\(host)/fen"),
                   let (fData, _) = try? await URLSession.shared.data(from: fenURL),
                   let f = try? JSONDecoder().decode(FenResponse.self, from: fData).fen {
                    await MainActor.run { self.fen = f }
                }
            } catch {
                await MainActor.run { self.unreachable = true }
            }
        }
    }

    @AppStorage("soundEnabled") private var soundEnabled = true

    private func playSound(for ev: LogEvent) {
        guard soundEnabled else { return }
        #if os(macOS)
        NSSound(named: ev.ok == false ? "Basso" : "Pop")?.play()
        #elseif os(watchOS)
        // No AudioToolbox system sounds on the watch — a tap is the equivalent.
        WKInterfaceDevice.current().play(ev.ok == false ? .failure : .success)
        #else
        AudioServicesPlaySystemSound(ev.ok == false ? 1053 : 1057)
        #endif
    }
}
