import SwiftUI
import Darwin
import Carbon.HIToolbox

/// The eased position, alone in its own object: it changes 60 times a second while the engineer walks, and only the camera, the marker and the minimap need it.
/// Every view that observed MarkerModel for it used to redraw at that rate (the hotbar decoding icons, the feed, the dots).
@MainActor
final class Glide: ObservableObject {
    @Published var shown: CGPoint?
}

@MainActor
final class MarkerModel: ObservableObject {
    @Published var pos: CGPoint?
    let glide = Glide()
    var shown: CGPoint? { get { glide.shown } set { glide.shown = newValue } }   // eased toward pos about 60 times a second: the marker and the camera follow this, so neither jumps
    private var ease: Timer?
    @Published var heading: Double = 90   // degrees, 0 = east, 90 = south (screen y grows down)
    @Published var moving = false
    @Published var step = 0
    @Published var frame: LiveFrame?
    @Published var dots: [[Double]] = []   // [x, y, code] per machine, from live_status.json: 0 working, 1 waiting, 2 stuck
    @Published var mini: NSImage?
    @Published var miniMeta: MiniMeta?
    @Published var hotbar: [HotbarSlot] = []
    @Published var events: [Event] = []
    @Published var engineer: EngineerData?
    @Published var combat: CombatData?
    @Published var silo: SiloData?
    private var miniStamp: Date?
    private let miniPath = NSString(string: "~/Documents/Code/conveyer/minimap.png").expandingTildeInPath
    private let miniMetaPath = NSString(string: "~/Documents/Code/conveyer/minimap.json").expandingTildeInPath
    private var dotsStamp: Date?
    private let dotsPath = NSString(string: "~/Documents/Code/conveyer/live_status.json").expandingTildeInPath
    private var timer: Timer?
    private var pollEvery = 0.2
    private var streamSource: DispatchSourceFileSystemObject?
    private let streamPath = NSString(string: "~/Documents/Code/conveyer/stream.json").expandingTildeInPath
    private var frameStamp: Date?
    private let livePath = NSString(string: "~/Documents/Code/conveyer/live.json").expandingTildeInPath
    private let framePath = NSString(string: "~/Documents/Code/conveyer/frame.json").expandingTildeInPath
    private var hotbarStamp: Date?
    private let hotbarPath = NSString(string: "~/Documents/Code/conveyer/hotbar.json").expandingTildeInPath
    private var eventsStamp: Date?
    private let eventsPath = NSString(string: "~/Documents/Code/conveyer/events.json").expandingTildeInPath
    private var engineerStamp: Date?
    private let engineerPath = NSString(string: "~/Documents/Code/conveyer/engineer.json").expandingTildeInPath
    private var combatStamp: Date?
    private let combatPath = NSString(string: "~/Documents/Code/conveyer/combat.json").expandingTildeInPath
    private var siloStamp: Date?
    private let siloPath = NSString(string: "~/Documents/Code/conveyer/silo.json").expandingTildeInPath

    func start() {
        guard timer == nil else { return }
        read()
        schedulePoll(0.2)
        watchStream()
    }
    func stop() { timer?.invalidate(); timer = nil; ease?.invalidate(); ease = nil; streamSource?.cancel(); streamSource = nil }

    private func schedulePoll(_ every: Double) {
        timer?.invalidate(); pollEvery = every
        timer = Timer.scheduledTimer(withTimeInterval: every, repeats: true) { _ in Task { @MainActor in self.read() } }
    }

    /// stream.py replaces stream.json atomically (rename), so the watch fires on every frame and is re-opened after each one.
    /// While stream.json is fresh the 0.2 s poll slows to 1 s and only covers the files stream.py does not write; without stream.py it stays at 0.2 s.
    private func watchStream() {
        streamSource?.cancel(); streamSource = nil
        let fd = open(streamPath, O_EVTONLY)
        guard fd >= 0 else { return }
        let src = DispatchSource.makeFileSystemObjectSource(fileDescriptor: fd, eventMask: [.write, .delete, .rename], queue: .main)
        src.setEventHandler { [weak self] in
            guard let self else { return }
            MainActor.assumeIsolated { self.read(); self.watchStream() }
        }
        src.setCancelHandler { close(fd) }
        streamSource = src; src.resume()
    }

    /// Glide the marker toward pos at 60 Hz, but only while it is not there yet.
    private func startEase() {
        guard ease == nil else { return }
        ease = Timer.scheduledTimer(withTimeInterval: 1.0 / 60, repeats: true) { _ in Task { @MainActor in
            guard let p = self.pos else { return }
            guard let c = self.shown else { self.shown = p; return }
            let dx = p.x - c.x, dy = p.y - c.y
            if abs(dx) < 0.005 && abs(dy) < 0.005 { self.ease?.invalidate(); self.ease = nil; return }   // arrived: the timer stops until the next move
            let d = (dx * dx + dy * dy).squareRoot(), k = min(0.12 * d, 1.0) / d   // 12% of the gap per frame, never faster than 60 tiles a second, so even a long trip glides
            self.shown = CGPoint(x: c.x + dx * k, y: c.y + dy * k)
        } }
    }

    private func readDots() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: dotsPath))?[.modificationDate] as? Date, m != dotsStamp,
              let d = FileManager.default.contents(atPath: dotsPath),
              let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any], let arr = j["d"] as? [[Double]] else { return }
        dotsStamp = m; dots = arr
    }

    private func readMini() {
        let mod = (try? FileManager.default.attributesOfItem(atPath: miniMetaPath))?[.modificationDate] as? Date
        guard let m = mod, m != miniStamp else { return }
        let data = FileManager.default.contents(atPath: miniMetaPath)
        let meta = data.flatMap { try? JSONDecoder().decode(MiniMeta.self, from: $0) }
        let img = NSImage(contentsOfFile: miniPath)
        guard let meta, let img else { return }
        miniStamp = m; miniMeta = meta; mini = img
    }

    private func readHotbar() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: hotbarPath))?[.modificationDate] as? Date, m != hotbarStamp,
              let d = FileManager.default.contents(atPath: hotbarPath),
              let h = try? JSONDecoder().decode(HotbarData.self, from: d) else { return }
        hotbarStamp = m; hotbar = h.slots
    }

    private func readEvents() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: eventsPath))?[.modificationDate] as? Date, m != eventsStamp,
              let d = FileManager.default.contents(atPath: eventsPath),
              let e = try? JSONDecoder().decode(EventData.self, from: d) else { return }
        eventsStamp = m; events = e.events
    }

    private func readEngineer() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: engineerPath))?[.modificationDate] as? Date, m != engineerStamp,
              let d = FileManager.default.contents(atPath: engineerPath),
              let eng = try? JSONDecoder().decode(EngineerData.self, from: d) else { return }
        engineerStamp = m; engineer = eng
    }

    private func readCombat() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: combatPath))?[.modificationDate] as? Date, m != combatStamp,
              let d = FileManager.default.contents(atPath: combatPath),
              let c = try? JSONDecoder().decode(CombatData.self, from: d) else { return }
        let now = Date().timeIntervalSince1970
        guard now - c.t < 4 else { combat = nil; return }   // stale data: ignore
        combatStamp = m; combat = c
    }

    private func readSilo() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: siloPath))?[.modificationDate] as? Date, m != siloStamp,
              let d = FileManager.default.contents(atPath: siloPath),
              let s = try? JSONDecoder().decode(SiloData.self, from: d) else { return }
        let now = Date().timeIntervalSince1970
        guard now - s.t < 10 else { silo = nil; return }   // stale data: ignore
        siloStamp = m; silo = s
    }

    private func read() {
        let fresh = ((try? FileManager.default.attributesOfItem(atPath: streamPath))?[.modificationDate] as? Date).map { -$0.timeIntervalSinceNow < 2 } ?? false
        if timer != nil && fresh != (pollEvery > 0.5) { schedulePoll(fresh ? 1.0 : 0.2) }
        readDots()
        readMini()
        readHotbar()
        readEvents()
        readEngineer()
        readCombat()
        readSilo()
        if let m = (try? FileManager.default.attributesOfItem(atPath: framePath))?[.modificationDate] as? Date, m != frameStamp,
           let d = FileManager.default.contents(atPath: framePath), let f = try? JSONDecoder().decode(LiveFrame.self, from: d) {
            frameStamp = m; frame = f
        }
        guard let d = FileManager.default.contents(atPath: livePath), let p = try? JSONDecoder().decode(LivePos.self, from: d) else { return }
        let np = CGPoint(x: p.x, y: p.y)
        guard np != pos else { if moving { moving = false }; return }   // publish only on change: idle costs no redraws
        if let o = pos { heading = atan2(np.y - o.y, np.x - o.x) * 180 / .pi }
        moving = pos != nil
        step += 1
        pos = np
        startEase()
    }
}
