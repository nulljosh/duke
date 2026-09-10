import SwiftUI

@main
struct PwnlingoStatusApp: App {
    #if os(macOS)
    @AppStorage("openAtLogin") private var openAtLogin = true
    #endif

    init() {
        #if DEBUG
        chessBoardSelfCheck()
        #endif
        #if os(macOS)
        LoginItem.sync(enabled: UserDefaults.standard.object(forKey: "openAtLogin") as? Bool ?? true)
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
