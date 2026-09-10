import SwiftUI

struct SettingsView: View {
    @AppStorage("pwnlingoHost") private var host = "localhost:8737"
    @AppStorage("pwnlingoToken") private var token = ""
    @AppStorage("alwaysOnTop") private var alwaysOnTop = false
    @AppStorage("soundEnabled") private var soundEnabled = true

    var body: some View {
        Form {
            TextField("Mac address", text: $host)
            SecureField("API token", text: $token)
            Toggle("Always on top", isOn: $alwaysOnTop)
            Toggle("Sound effects", isOn: $soundEnabled)
        }
        .padding(20)
        .frame(width: 300)
    }
}
