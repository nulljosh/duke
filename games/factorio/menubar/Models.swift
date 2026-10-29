import SwiftUI
import Darwin
import Carbon.HIToolbox

extension Status {
    /// The game reports ok even when a skill threw, so also read the message.
    var worked: Bool { ok && !message.contains("Exception") && !message.contains("Error occurred") }
}

struct Status: Decodable {
    let step: Int
    let skill: String
    let ok: Bool
    let message: String
    let updated_at: Double
}

struct Research: Decodable {
    let current: String
    let percent: Int
    let techs: Int
    let queue: [String]
    let labs: Int?
    let labs_working: Int?
    let moving: Bool?   // research progress changed in the last 90 s; labs flip faster than we sample

    /// "advanced-circuit" -> "Advanced circuit"
    static func nice(_ name: String) -> String {
        let t = name.replacingOccurrences(of: "-", with: " ")
        return t.prefix(1).uppercased() + t.dropFirst()
    }
}

struct Milestone: Identifiable {
    let id: Int
    let title: String
    let eta: String?
    let done: Bool

    /// Parses the "Real save run" checklist in roadmap.md. One source of truth: edit the roadmap, the menu bar follows.
    static func load(_ path: String) -> [Milestone] {
        guard let text = try? String(contentsOfFile: path, encoding: .utf8) else { return [] }
        var inSection = false
        var out: [Milestone] = []
        for line in text.split(separator: "\n", omittingEmptySubsequences: false) {
            if line.hasPrefix("## ") { inSection = line.hasPrefix("## Real save run"); continue }
            guard inSection else { continue }
            let t = line.trimmingCharacters(in: .whitespaces)
            let done = t.hasPrefix("- [x]")
            guard done || t.hasPrefix("- [ ]") else { continue }
            let body = String(t.dropFirst(6))
            let parts = body.components(separatedBy: " ETA ")
            let title = parts[0].components(separatedBy: ". ")[0].trimmingCharacters(in: CharacterSet(charactersIn: ". "))
            let eta = parts.count > 1 ? parts[1].trimmingCharacters(in: CharacterSet(charactersIn: ". ")) : nil
            out.append(Milestone(id: out.count, title: title, eta: eta, done: done))
        }
        return out
    }
}

/// Live position of the player, read from live.json (written ~5 times a second by scripts/livefeed.py while someone watches).
struct LiveFrame: Decodable { let cx: Double; let cy: Double; let w: Double; let h: Double; let ppt: Double }
struct LivePos: Decodable { let x: Double; let y: Double }
struct MiniMeta: Decodable { let x0: Double; let y0: Double; let w: Double; let h: Double }   // minimap.json: tile coords of the picture's top-left and the span it covers
struct HotbarSlot: Decodable { let name: String; let count: Int }
struct HotbarData: Decodable { let slots: [HotbarSlot] }
struct Event: Decodable { let t: Double; let kind: String; let text: String }
struct EventData: Decodable { let events: [Event] }
struct EngineerData: Decodable { let item: String; let t: Double; let label: String? }
struct CombatData: Decodable { let t: Double; let player: [Double]; let enemies: [[Double]]; let turrets: [[Double]] }  // enemies: [x,y,kind,size], turrets: [x,y,firing]
struct SiloData: Decodable { let x: Double; let y: Double; let parts: Int; let status: String; let launched: Int; let t: Double; let rocket: Int?; let rocket_status: String? }
