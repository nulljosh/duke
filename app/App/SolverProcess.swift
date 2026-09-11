#if os(macOS)
import Foundation
import AppKit

// ponytail: launches scripts/run.mjs as a plain child of this app. Foundation's
// Process does not tie the child's lifetime to this object or to this app —
// once .run() succeeds the child keeps going even after the app quits, which
// is exactly "runs in the background" with zero daemon/launchd machinery.
// Stopping it later (from a relaunched app instance) goes through run.mjs's
// own /quit route instead, since the original Process handle is long gone.
@MainActor
enum SolverProcess {
    // Personal dev tool run from source, not something shipped in the app
    // bundle — the repo path is hardcoded on purpose.
    private static let scriptURL = URL(fileURLWithPath: NSString(string: "~/Documents/Code/pwnlingo/scripts/run.mjs").expandingTildeInPath)
    private static let logURL = URL(fileURLWithPath: NSString(string: "~/Documents/Code/pwnlingo/scripts/run.log").expandingTildeInPath)
    private static let tunnelConfigURL = URL(fileURLWithPath: NSString(string: "~/.cloudflared/pwnlingo-config.yml").expandingTildeInPath)
    private static let tunnelLogURL = URL(fileURLWithPath: NSString(string: "~/Documents/Code/pwnlingo/scripts/tunnel.log").expandingTildeInPath)

    // ponytail: a pgrep on the launch command line breaks silently the moment
    // the flags/path change (moved config, renamed binary). Checking whether
    // the tunnel's own public hostname actually answers tests the thing that
    // matters — reachability — not how the process happens to be invoked.
    private static func tunnelReachable() async -> Bool {
        guard let url = URL(string: "https://pwnlingo-status.heyitsmejosh.com/state") else { return false }
        var req = URLRequest(url: url)
        req.timeoutInterval = 4
        return (try? await URLSession.shared.data(for: req)) != nil
    }

    private static func startTunnelIfNeeded() async {
        let reachable = await tunnelReachable()
        guard !reachable else { return }

        let t = Process()
        t.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/cloudflared")
        t.arguments = ["tunnel", "--config", tunnelConfigURL.path, "run"]
        FileManager.default.createFile(atPath: tunnelLogURL.path, contents: nil)
        if let handle = try? FileHandle(forWritingTo: tunnelLogURL) {
            t.standardOutput = handle
            t.standardError = handle
        }
        try? t.run()
    }

    // ponytail: launchd/SMAppService-launched apps don't inherit the login
    // shell's PATH, so `env node` silently failed ("No such file or
    // directory") the moment auto-start actually ran unattended instead of
    // from a Start click made inside a Terminal-derived Xcode session. fnm's
    // default alias is a stable symlink (unlike its per-shell multishell
    // path), so it survives node version bumps without another edit here.
    private static let nodeURL = URL(fileURLWithPath: NSString(string: "~/.local/share/fnm/aliases/default/bin/node").expandingTildeInPath)

    // ponytail: the tunnel can die (cloudflared crash, network blip) while the
    // local runner stays perfectly healthy — start(track:)'s check only fires
    // when the runner itself (re)starts, which never happens in that case.
    // Piggyback a periodic check on this same always-running, launchd-kept-
    // alive process instead of adding a second launchd job for it.
    static func watchTunnel() {
        Task { await startTunnelIfNeeded() }
        Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
            Task { await startTunnelIfNeeded() }
        }
    }

    static func start(track: String) {
        Task { await startTunnelIfNeeded() }
        let p = Process()
        p.executableURL = nodeURL
        p.arguments = [scriptURL.path, track]
        p.currentDirectoryURL = scriptURL.deletingLastPathComponent()
        FileManager.default.createFile(atPath: logURL.path, contents: nil)
        if let handle = try? FileHandle(forWritingTo: logURL) {
            p.standardOutput = handle
            p.standardError = handle
        }
        // ponytail: run.mjs exits fast (code 1) with no Duolingo session instead
        // of hanging — catch that specific case and say so, rather than leaving
        // the user staring at a menu bar that silently never turns green.
        let logPath = logURL
        p.terminationHandler = { proc in
            guard proc.terminationStatus != 0 else { return }
            let tail = (try? String(contentsOf: logPath, encoding: .utf8))
                .map { $0.split(separator: "\n").suffix(6).joined(separator: "\n") } ?? ""
            DispatchQueue.main.async {
                let alert = NSAlert()
                alert.messageText = "Pwnlingo didn't start"
                alert.informativeText = tail.contains("No Duolingo session")
                    ? "No signed-in session yet. Run this once in Terminal, then hit Start again:\n\nnode ~/Documents/Code/pwnlingo/scripts/login.mjs"
                    : tail.isEmpty ? "Check ~/Documents/Code/pwnlingo/scripts/run.log" : tail
                alert.runModal()
            }
        }
        try? p.run()
    }
}
#endif
