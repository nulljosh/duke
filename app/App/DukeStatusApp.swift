import SwiftUI
#if os(macOS)
import AppKit
#endif

@main
struct DukeStatusApp: App {
    #if os(macOS)
    @AppStorage("openAtLogin") private var openAtLogin = true
    @AppStorage("hideDockIcon") private var hideDockIcon = true
    #endif

    init() {
        #if DEBUG
        chessBoardSelfCheck()
        #endif
        #if os(macOS)
        // ponytail: the launchd LaunchAgent (com.nulljosh.cruise-status,
        // RunAtLoad+KeepAlive) already opens this at login and relaunches it
        // on crash. Registering as an SMAppService login item too made macOS
        // launch a SECOND copy on every boot (two menu-bar icons, neither
        // actually started). Unregister unconditionally instead of syncing
        // to the user's toggle — the LaunchAgent is the one launch path now.
        LoginItem.sync(enabled: false)
        // ponytail: NSApp isn't wired up yet this early in App.init() (nil
        // unwrap crash) — NSApplication.shared always exists and does the same
        // thing, but bounce to the next runloop turn to be safe either way.
        let hide = UserDefaults.standard.object(forKey: "hideDockIcon") as? Bool ?? true
        DispatchQueue.main.async { NSApplication.shared.setActivationPolicy(hide ? .accessory : .regular) }
        // ponytail: self-heals the cloudflared tunnel on this already-running,
        // launchd-kept-alive process — no separate daemon for it.
        SolverProcess.watchTunnel()
        #endif
    }

    var body: some Scene {
        #if os(macOS)
        // ponytail: the menu bar dropdown (MenuBarPanel) already shows the board,
        // stats, and pause/start/settings/quit — a second full window duplicated
        // it for no reason. Menu bar only.
        MenuBarExtra {
            MenuBarPanel()
        } label: {
            MenuBarLabel()
        }
        .menuBarExtraStyle(.window)

        Settings { SettingsView() }
        #else
        WindowGroup {
            #if os(watchOS)
            WatchView()
            #else
            ContentView()
            #endif
        }
        #endif
    }
}
