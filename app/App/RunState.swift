import Foundation
import SwiftUI

struct RunState: Decodable {
    let at, started, track: String
    let lessons, puzzles, matches, misses: Int
    let xp0, xp: Int?
    let last: String?
}

struct LogEvent: Decodable, Identifiable {
    var id: String { at + (ev ?? "") + (String(describing: ok) ) }
    let at: String
    let ev: String?
    let ok: Bool?
    let moves: [String]?
    let mv: String?
    let track: String?
}

// ponytail: plain polling over the LAN endpoint run.mjs serves (/state, /log)
// — no push, no websocket, a status readout doesn't need either.
@MainActor
final class Poller: ObservableObject {
    @Published var state: RunState?
    @Published var events: [LogEvent] = []
    @Published var stale = false
    @Published var unreachable = false
    @AppStorage("pwnlingoHost") var host = "192.168.100.129:8737"
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.reload() }
        }
        reload()
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
                    if let at = ISO8601DateFormatter().date(from: s.at) {
                        self.stale = Date().timeIntervalSince(at) > 90
                    }
                }
            } catch {
                await MainActor.run { self.unreachable = true }
            }
        }
    }
}
