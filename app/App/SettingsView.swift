import SwiftUI

struct SettingsView: View {
    @AppStorage("pwnlingoHost") private var host = "localhost:8737"
    @AppStorage("pwnlingoToken") private var token = ""
    @AppStorage("alwaysOnTop") private var alwaysOnTop = false
    @AppStorage("soundEnabled") private var soundEnabled = true
    #if os(macOS)
    @AppStorage("backgroundRun") private var backgroundRun = true
    @AppStorage("startTrack") private var startTrack = "chess"
    @AppStorage("openAtLogin") private var openAtLogin = true
    #endif

    var body: some View {
        Form {
            TextField("Mac address", text: $host)
            SecureField("API token", text: $token)
            Toggle("Always on top", isOn: $alwaysOnTop)
            Toggle("Sound effects", isOn: $soundEnabled)
            #if os(macOS)
            Toggle("Works in the background (even when closed)", isOn: $backgroundRun)
            Toggle("Open at login", isOn: $openAtLogin)
                .onChange(of: openAtLogin) { LoginItem.sync(enabled: $1) }
            Picker("Start track", selection: $startTrack) {
                ForEach(tracks, id: \.self) { t in Text(trackNames[t] ?? t.capitalized).tag(t) }
            }
            #endif
        }
        .padding(20)
        .frame(width: 300)
    }
}
