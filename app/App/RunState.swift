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
let surfDateFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

// Shared by ContentView and MenuBarPanel — one uptime string, not two copies.
// `started` is run.mjs's process start time, so this resets on every restart
// (a switch doesn't touch it, only relaunching the runner does).
func uptimeString(since started: String) -> String {
    guard let start = surfDateFormatter.date(from: started) else { return "" }
    // A clock adjustment (or a started timestamp slightly in the future) would
    // otherwise render "running -1h -3m".
    let secs = max(0, Int(Date().timeIntervalSince(start)))
    let h = secs / 3600, m = (secs % 3600) / 60
    let duration = h > 0 ? "\(h)h \(m)m" : "\(m)m"
    // String(localized:) — a plain interpolated literal never touches the catalog.
    return String(localized: "running \(duration)")
}

// count/hour since `started` — nil before a minute has elapsed, matching
// xpPerMinute's own guard against a noisy rate right after a restart.
func perHourRate(_ count: Int, since started: String) -> Double? {
    guard let start = surfDateFormatter.date(from: started) else { return nil }
    let hours = Date().timeIntervalSince(start) / 3600
    guard hours > 1.0 / 60, count > 0 else { return nil }
    return Double(count) / hours
}

struct RunState: Decodable {
    let at, started, track: String
    let username: String?
    let paused: Bool?
    let voiceOn: Bool?
    let streak, xpGoal, hearts, maxHearts, league, puzzleStep, puzzleTotal: Int?
    let xpGoalMetToday: Bool?
    let lessons, puzzles, matches, misses: Int
    let xp0, xp, xpToday: Int?
    let last: String?
    let prompt, answer: String?
    let choices: [String]?
    let grid: [[String]]?
    let progress: CourseProgress?
}

// Course completion, straight off Duolingo's own path data (run.mjs's
// progress()). etaHours is nil until the runner has measured a real rate.
struct CourseProgress: Decodable {
    let passed, total, unitsDone, unitsTotal, remaining: Int
    let pct: Double
    let levelsPerHour, etaHours: Double?

    /// "1d 4h" / "27h" / "45m" — nil when there's no measured rate yet.
    var etaText: String? {
        guard let h = etaHours, h > 0 else { return nil }
        if h < 1 { return "\(Int((h * 60).rounded()))m" }
        // Round ONCE, then split. Deriving days from the truncated value and
        // hours from the rounded one dropped the carry: 47.8h rendered "1d"
        // (days = 47/24 = 1, hrs = 48 % 24 = 0) instead of ~2d.
        let totalHours = Int(h.rounded())
        if totalHours < 24 { return "\(totalHours)h" }
        let days = totalHours / 24, hrs = totalHours % 24
        return hrs > 0 ? "\(days)d \(hrs)h" : "\(days)d"
    }
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
        case "puzzle": return ok == true ? String(localized: "Solved puzzle") : String(localized: "Missed puzzle")
        case "match-over": return String(localized: "Match finished")
        case "switch": return String(localized: "Switched to \(track ?? "?")")
        case "math": return String(localized: "Math lesson")
        case "story-end": return String(localized: "Finished story")
        case "rotate": return String(localized: "Rotated course")
        case "track-complete": return String(localized: "Finished \(track ?? "the course")!")
        case "auto-advance": return String(localized: "Moved on to \(track ?? "the next track")")
        case "all-complete": return String(localized: "Every track finished")
        default: return ev ?? String(localized: "Working…")
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
    @Published var switching = false
    @AppStorage("cruiseHost") var host = "localhost:8737"
    // The runner's reads are open; pause/resume/switch need this, since the
    // tunnel puts those routes on the public internet. Printed by run.mjs on
    // first start and stored in scripts/api-token.txt.
    @AppStorage("cruiseToken") var token = ""
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

    // Narration: reads the current question/answer (or move) out loud through
    // the Mac's own speakers via `say`, macOS-only, off by default. Good for a
    // machine that's already on the desk all day — see run.mjs's speakOut().
    func toggleVoice() {
        mutate("voice?on=\((!(state?.voiceOn ?? false)))")
    }

    // ponytail: run.mjs owns the rotation order and the actual timer/count
    // logic (persisted to cycle.json so it survives this app not running) —
    // this just flips the switch and sets mode/value.
    func setCycle(enabled: Bool, mode: String, value: Int, scope: String = "core") {
        mutate("cycle?enabled=\(enabled)&mode=\(mode)&value=\(value)&scope=\(scope)")
    }

    func switchTrack(_ t: String) {
        // ponytail: run.mjs clears prompt/choices/grid the instant it honors the
        // switch, but the new track's own content can take a few seconds to load
        // — without this, the panel just sat on the old track's stale content
        // with nothing to show a click landed.
        switching = true
        mutate("switch?track=\(t)")
        Task { try? await Task.sleep(for: .seconds(15)); switching = false }
    }

    func quit() {
        mutate("quit")
    }

    func reload() {
        Task {
            guard let stateURL = URL(string: "http://\(host)/state"),
                  let logURL = URL(string: "http://\(host)/log") else { return }
            do {
                // /state stays readable without a token, but the runner withholds
                // username/streak/league from anonymous callers — send ours so the
                // panel still shows them.
                var stateReq = URLRequest(url: stateURL)
                stateReq.setValue(token, forHTTPHeaderField: "X-Pwnlingo-Token")
                let (sData, _) = try await URLSession.shared.data(for: stateReq)
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
                    // switching clears once there's something real to show: chess
                    // has a fen (checked on the next tick below), everything else
                    // has a prompt/choices/grid. A screenshot-only widget type
                    // never sets any of those, so switchTrack()'s own timeout is
                    // what clears switching in that case.
                    if self.switching, s.track != "chess",
                       s.prompt != nil || s.answer != nil || !(s.choices?.isEmpty ?? true) || !(s.grid?.isEmpty ?? true) {
                        self.switching = false
                    }
                    if let at = surfDateFormatter.date(from: s.at) {
                        self.stale = Date().timeIntervalSince(at) > 90
                    }
                }
                if s.track == "chess", let fenURL = URL(string: "http://\(host)/fen"),
                   let (fData, _) = try? await URLSession.shared.data(from: fenURL),
                   let f = try? JSONDecoder().decode(FenResponse.self, from: fData).fen {
                    await MainActor.run { self.fen = f; self.switching = false }
                }
            } catch {
                await MainActor.run { self.unreachable = true }
            }
        }
    }

    @AppStorage("soundEnabled") private var soundEnabled = false

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

// clrs.cc Blue, the one brand colour (brand/tokens.css --accent), and Surf Sans, bundled on macOS.
// Elsewhere the custom font falls back to the system face at the same size.
extension Color {
    static let surf = Color(red: 0x00 / 255, green: 0x74 / 255, blue: 0xD9 / 255)
}

extension Font {
    static func surf(_ style: Font.TextStyle, _ weight: Font.Weight = .regular) -> Font {
        let size: CGFloat = switch style {
        case .title3: 15
        case .callout: 12
        case .caption, .caption2: 10
        default: 13
        }
        return .custom("Surf Sans", size: size, relativeTo: style).weight(weight)
    }
}
