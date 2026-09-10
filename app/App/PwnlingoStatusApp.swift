import SwiftUI
#if os(macOS)
import AppKit
#endif

@main
struct PwnlingoStatusApp: App {
    #if os(macOS)
    @AppStorage("openAtLogin") private var openAtLogin = true
    @AppStorage("hideDockIcon") private var hideDockIcon = true
    #endif

    init() {
        #if DEBUG
        chessBoardSelfCheck()
        #endif
        #if os(macOS)
        LoginItem.sync(enabled: UserDefaults.standard.object(forKey: "openAtLogin") as? Bool ?? true)
        // ponytail: NSApp isn't wired up yet this early in App.init() (nil
        // unwrap crash) — NSApplication.shared always exists and does the same
        // thing, but bounce to the next runloop turn to be safe either way.
        let hide = UserDefaults.standard.object(forKey: "hideDockIcon") as? Bool ?? true
        DispatchQueue.main.async { NSApplication.shared.setActivationPolicy(hide ? .accessory : .regular) }
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
