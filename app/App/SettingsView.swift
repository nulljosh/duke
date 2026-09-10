import SwiftUI
#if os(macOS)
import AppKit
#endif

struct SettingsView: View {
    @AppStorage("pwnlingoHost") private var host = "localhost:8737"
    @AppStorage("pwnlingoToken") private var token = ""
    @AppStorage("soundEnabled") private var soundEnabled = true
    #if os(macOS)
    @AppStorage("backgroundRun") private var backgroundRun = true
    @AppStorage("startTrack") private var startTrack = "chess"
    @AppStorage("openAtLogin") private var openAtLogin = true
    @AppStorage("hideDockIcon") private var hideDockIcon = true
    @AppStorage("cycleEnabled") private var cycleEnabled = false
    @AppStorage("cycleMode") private var cycleMode = "time"
    @AppStorage("cycleMinutes") private var cycleMinutes = 20
    @AppStorage("cycleCount") private var cycleCount = 5
    #endif

    var body: some View {
        Form {
            TextField("Mac address", text: $host)
            SecureField("API token", text: $token)
            Toggle("Sound effects", isOn: $soundEnabled)
            #if os(macOS)
            Toggle("Works in the background (even when closed)", isOn: $backgroundRun)
            Toggle("Open at login", isOn: $openAtLogin)
                .onChange(of: openAtLogin) { LoginItem.sync(enabled: $1) }
            Toggle("Hide app icon in the Dock", isOn: $hideDockIcon)
                .onChange(of: hideDockIcon) { NSApp.setActivationPolicy($1 ? .accessory : .regular) }
            Picker("Start track", selection: $startTrack) {
                ForEach(tracks, id: \.self) { t in Text(trackNames[t] ?? t.capitalized).tag(t) }
            }

            // ponytail: rotation order (chess, math, then every language) is
            // fixed in run.mjs, not editable here — this just picks the pace.
            Toggle("Cycle topics for variance", isOn: $cycleEnabled)
                .onChange(of: cycleEnabled) { syncCycle() }
            if cycleEnabled {
                Picker("Switch every", selection: $cycleMode) {
                    Text("X minutes").tag("time")
                    Text("X completed lessons").tag("count")
                }
                .onChange(of: cycleMode) { syncCycle() }
                Stepper(
                    cycleMode == "time" ? "\(cycleMinutes) minutes" : "\(cycleCount) lessons",
                    value: cycleMode == "time" ? $cycleMinutes : $cycleCount,
                    in: 1...180
                )
                .onChange(of: cycleMinutes) { syncCycle() }
                .onChange(of: cycleCount) { syncCycle() }
            }
            #endif
        }
        .padding(20)
        .frame(width: 300)
        #if os(macOS)
        .onAppear { if cycleEnabled { syncCycle() } }
        #endif
    }

    #if os(macOS)
    private func syncCycle() {
        Poller.shared.setCycle(enabled: cycleEnabled, mode: cycleMode, value: cycleMode == "time" ? cycleMinutes : cycleCount)
    }
    #endif
}
