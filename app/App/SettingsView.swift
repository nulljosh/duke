import SwiftUI
#if os(macOS)
import AppKit
#endif

struct SettingsView: View {
    @AppStorage("pwnlingoHost") private var host = "localhost:8737"
    @AppStorage("pwnlingoToken") private var token = ""
    @AppStorage("soundEnabled") private var soundEnabled = true
    @AppStorage("appLanguage") private var appLanguage = ""   // "" = follow the system
    #if os(macOS)
    @AppStorage("backgroundRun") private var backgroundRun = true
    @AppStorage("startTrack") private var startTrack = "chess"
    @AppStorage("openAtLogin") private var openAtLogin = true
    @AppStorage("hideDockIcon") private var hideDockIcon = true
    // One picker replaces the old enabled-toggle + mode-picker + stepper cluster.
    // "" is off; otherwise it mirrors run.mjs's cycle.mode.
    @AppStorage("autoSwitch") private var autoSwitch = "balance"
    @AppStorage("balanceScope") private var balanceScope = "all"
    @AppStorage("cycleMinutes") private var cycleMinutes = 20
    @AppStorage("cycleCount") private var cycleCount = 5
    #endif

    var body: some View {
        Form {
            Section("Connection") {
                TextField("Mac address", text: $host)
                SecureField("API token", text: $token)
            }

            #if os(macOS)
            Section("Playing") {
                Picker("Start track", selection: $startTrack) {
                    ForEach(tracks, id: \.self) { t in Text(trackNames[t] ?? t.capitalized).tag(t) }
                }
                Picker("Auto-switch", selection: $autoSwitch) {
                    Text("Off").tag("")
                    Text("Whichever is furthest behind").tag("balance")
                    Text("Every X minutes").tag("time")
                    Text("Every X lessons").tag("count")
                }
                .onChange(of: autoSwitch) { syncCycle() }

                if autoSwitch == "balance" {
                    // Everything by default — a course that started late should not
                    // be starved. Narrow it to chess+math when you specifically
                    // want those two finished, since they sit near 70% while every
                    // language course is still under 3%.
                    Picker("Balance across", selection: $balanceScope) {
                        Text("Everything").tag("all")
                        Text("Chess and Math only").tag("core")
                    }
                    .onChange(of: balanceScope) { syncCycle() }
                } else if autoSwitch == "time" || autoSwitch == "count" {
                    Stepper(
                        autoSwitch == "time" ? "\(cycleMinutes) minutes" : "\(cycleCount) lessons",
                        value: autoSwitch == "time" ? $cycleMinutes : $cycleCount,
                        in: 1...180
                    )
                    .onChange(of: cycleMinutes) { syncCycle() }
                    .onChange(of: cycleCount) { syncCycle() }
                }
            }
            #endif

            Section("App") {
                // ponytail: writes AppleLanguages, which only takes effect on relaunch —
                // SwiftUI can't re-resolve an already-loaded string catalog in place.
                // "System" clears the override and goes back to the OS setting.
                Picker("Language", selection: $appLanguage) {
                    Text("System").tag("")
                    ForEach(appLanguages, id: \.code) { l in Text(l.name).tag(l.code) }
                }
                .onChange(of: appLanguage) { _, new in
                    if new.isEmpty { UserDefaults.standard.removeObject(forKey: "AppleLanguages") }
                    else { UserDefaults.standard.set([new], forKey: "AppleLanguages") }
                }
                Toggle("Sound effects", isOn: $soundEnabled)
                #if os(macOS)
                Toggle("Works in the background (even when closed)", isOn: $backgroundRun)
                Toggle("Open at login", isOn: $openAtLogin)
                    .onChange(of: openAtLogin) { LoginItem.sync(enabled: $1) }
                Toggle("Hide app icon in the Dock", isOn: $hideDockIcon)
                    .onChange(of: hideDockIcon) { NSApp.setActivationPolicy($1 ? .accessory : .regular) }
                #endif
            }
        }
        .formStyle(.grouped)
        .padding(20)
        .frame(width: 340)
        #if os(macOS)
        .onAppear { syncCycle() }
        #endif
    }

    #if os(macOS)
    private func syncCycle() {
        Poller.shared.setCycle(
            enabled: !autoSwitch.isEmpty,
            mode: autoSwitch.isEmpty ? "balance" : autoSwitch,
            value: autoSwitch == "time" ? cycleMinutes : cycleCount,
            scope: balanceScope
        )
    }
    #endif
}
