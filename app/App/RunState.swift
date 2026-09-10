import Foundation
import SwiftUI
#if os(macOS)
import AppKit
#else
import AudioToolbox
#endif

struct RunState: Decodable {
    let at, started, track: String
    let username: String?
    let paused: Bool?
    let lessons, puzzles, matches, misses: Int
    let xp0, xp: Int?
    let last: String?
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
    private var timer: Timer?
    private var lastEventId: String?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.reload() }
        }
        reload()
    }

    func togglePause() {
        let endpoint = (state?.paused ?? false) ? "resume" : "pause"
        guard let url = URL(string: "http://\(host)/\(endpoint)") else { return }
        var req = URLRequest(url: url); req.httpMethod = "POST"
        Task { _ = try? await URLSession.shared.data(for: req); reload() }
    }

    func switchTrack(_ t: String) {
        guard let url = URL(string: "http://\(host)/switch?track=\(t)") else { return }
        var req = URLRequest(url: url); req.httpMethod = "POST"
        Task { _ = try? await URLSession.shared.data(for: req); reload() }
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
                    if let at = ISO8601DateFormatter().date(from: s.at) {
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
        #else
        AudioServicesPlaySystemSound(ev.ok == false ? 1053 : 1057)
        #endif
    }
}
