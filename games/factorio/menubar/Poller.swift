import SwiftUI
import Darwin
import Carbon.HIToolbox

@MainActor
final class StatusPoller: ObservableObject {
    @Published var status: Status?
    @Published var stale = false
    @Published var runnerAlive = true
    @Published var busy = false
    @Published var map: NSImage?
    @Published var research: Research?
    @Published var milestones: [Milestone] = []
    private var roadmapStamp: Date?
    private let roadmapPath = NSString(
        string: "~/Documents/Code/conveyer/roadmap.md"
    ).expandingTildeInPath
    private let researchPath = NSString(
        string: "~/Documents/Code/conveyer/research.json"
    ).expandingTildeInPath
    private var mapStamp: Date?
    private let mapPath = NSString(
        string: "~/Documents/Code/conveyer/preview.png"
    ).expandingTildeInPath
    /// preview.png with real ground painted under the sprites (scripts/terrain.py); falls back to the flat render.
    private let terrainPath = NSString(
        string: "~/Documents/Code/conveyer/preview_map.png"
    ).expandingTildeInPath

    private let statusPath = NSString(
        string: "~/Documents/Code/conveyer/status.json"
    ).expandingTildeInPath
    private let pidPath = NSString(
        string: "~/Documents/Code/conveyer/runner.pid"
    ).expandingTildeInPath
    private var autoRestartedAt: Date?

    /// `--demo stopped|failed|idle|nodata` overrides the real data so each state can be checked in a snapshot.
    func applyDemo(_ name: String) {
        switch name {
        case "stopped": runnerAlive = false
        case "failed": status = Status(step: 9, skill: "craft", ok: true, message: "Error occurred:\n Line 2: could not craft LogisticsSciencePack, missing 40 iron-plate", updated_at: Date().timeIntervalSince1970)
        case "idle": research = Research(current: "advanced-circuit", percent: 36, techs: 41, queue: ["advanced-circuit", "chemical-science-pack"], labs: 9, labs_working: 0, moving: false)
        case "nodata": status = nil; research = nil; milestones = []; map = nil
        default: break
        }
    }
    private let scriptsDir = NSString(
        string: "~/Documents/Code/conveyer/menubar"
    ).expandingTildeInPath

    /// Something is on screen: the popover is open or the live window is visible. Everything expensive keys off this.
    @Published var popoverShown = false { didSet { applyWatching() } }
    @Published var windowVisible = false { didSet { applyWatching() } }
    @Published var hudVisible = true   // the progress panel top left starts visible; Ctrl+Option+H shows or hides it
    @Published var lastFrame: Date?
    let marker = MarkerModel()
    private var timer: Timer?
    private let watchPath = NSString(string: "~/Documents/Code/conveyer/.watching").expandingTildeInPath

    var watching: Bool { popoverShown || windowVisible }

    private func applyWatching() {
        timer?.invalidate()
        if watching {
            touchWatching()
            marker.start()
        } else {
            marker.stop()
        }
        // 1 s while someone looks (the heartbeat must stay under the 8 s the Python side tolerates), 5 s otherwise
        timer = Timer.scheduledTimer(withTimeInterval: watching ? 1 : 5, repeats: true) { _ in
            Task { @MainActor in self.poll() }
        }
    }

    private func touchWatching() {
        try? Data().write(to: URL(fileURLWithPath: watchPath))
    }

    init() {
        poll()
        applyWatching()
        Hotkey.register({ [weak self] in Task { @MainActor in self?.hudVisible.toggle() } }, pin: { Task { @MainActor in LiveWindow.togglePin() } })
        // `ConveyerMonitor --open-live` opens the live window; add `--fullscreen` for full screen
        if CommandLine.arguments.contains("--open-live") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                LiveWindow.show(self)
                if CommandLine.arguments.contains("--fullscreen") { DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { LiveWindow.window?.toggleFullScreen(nil) } }
            }
        }
    }

    func poll() {
        if watching { touchWatching() }
        if let data = FileManager.default.contents(atPath: statusPath),
           let decoded = try? JSONDecoder().decode(Status.self, from: data) {
            status = decoded
            stale = Date().timeIntervalSince1970 - decoded.updated_at > 120
        }
        loadMap()
        if let data = FileManager.default.contents(atPath: researchPath),
           let r = try? JSONDecoder().decode(Research.self, from: data) { research = r }
        loadRoadmap()
        checkLiveness()
    }

    private func loadRoadmap() {
        guard let m = (try? FileManager.default.attributesOfItem(atPath: roadmapPath))?[.modificationDate] as? Date,
              m != roadmapStamp else { return }
        roadmapStamp = m
        milestones = Milestone.load(roadmapPath)
    }

    /// The runner rewrites preview.png every ~8s while idle, non-atomically. Only keep a
    /// frame that decodes, and only remember its stamp then, so a half-written file is retried.
    private func loadMap() {
        let path = FileManager.default.fileExists(atPath: terrainPath) ? terrainPath : mapPath
        guard let m = (try? FileManager.default.attributesOfItem(atPath: path))?[.modificationDate] as? Date,
              m != mapStamp else { return }
        guard let img = NSImage(contentsOfFile: path), img.size.width > 0 else {
            FileHandle.standardError.write(Data("map: decode failed, will retry\n".utf8))
            return
        }
        mapStamp = m
        map = img
        lastFrame = m
        FileHandle.standardError.write(Data("map: loaded \(Int(img.size.width))x\(Int(img.size.height))\n".utf8))
    }

    /// True process liveness (kill(pid, 0)), not just "no recent status update" —
    /// a long smelt/harvest wait is a real gap, not a crash. Auto-restarts at most
    /// every 10 min: a runner that dies on boot (memory guard) must not respawn in a loop.
    private func checkLiveness() {
        // No pid file = stopped on purpose (Stop server) or killed by the memory guard.
        // Respawning either one just rebuilds the same balloon, so stay down.
        guard let pidText = try? String(contentsOfFile: pidPath, encoding: .utf8),
              let pid = pid_t(pidText.trimmingCharacters(in: .whitespacesAndNewlines))
        else { runnerAlive = false; return }
        let alive = Darwin.kill(pid, 0) == 0
        runnerAlive = alive
        if !alive && serverUp() {
            let now = Date()
            if autoRestartedAt == nil || now.timeIntervalSince(autoRestartedAt!) > 600 {
                autoRestartedAt = now
                run("restart_runner.sh")
            }
        }
    }

    /// RCON port open = a Factorio server is up. No server, no point restarting the runner.
    private func serverUp() -> Bool {
        let fd = socket(AF_INET, SOCK_STREAM, 0)
        guard fd >= 0 else { return false }
        defer { close(fd) }
        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(27000).bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")
        return withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) == 0
            }
        }
    }

    func run(_ script: String) {
        busy = true
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = ["\(scriptsDir)/\(script)"]
        task.terminationHandler = { _ in
            Task { @MainActor in self.busy = false }
        }
        try? task.run()
    }
}
