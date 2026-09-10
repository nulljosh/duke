import SwiftUI

@main
struct PwnlingoStatusApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        #endif
    }
}
