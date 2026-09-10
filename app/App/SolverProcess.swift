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

    // ponytail: "Start" only ever relaunched run.mjs — the status site and the
    // Windows/Linux/iOS clients all depend on the cloudflared tunnel too, and
    // it dies with the Mac the same way run.mjs does. One button, both back.
    private static func startTunnelIfNeeded() {
        let check = Process()
        check.executableURL = URL(fileURLWithPath: "/usr/bin/pgrep")
        check.arguments = ["-f", "cloudflared tunnel --config \(tunnelConfigURL.path)"]
        check.standardOutput = Pipe()
        try? check.run()
        check.waitUntilExit()
        guard check.terminationStatus != 0 else { return } // already running

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

    static func start(track: String) {
        startTunnelIfNeeded()
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        p.arguments = ["node", scriptURL.path, track]
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
