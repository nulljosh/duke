#if os(macOS)
import ServiceManagement

// ponytail: SMAppService.mainApp is the whole implementation — no helper
// target, no plist to hand-write. Enabled by default on first launch since
// "open on login" is the point of a status app that just restarted from a crash.
enum LoginItem {
    static func sync(enabled: Bool) {
        do {
            if enabled {
                if SMAppService.mainApp.status != .enabled {
                    try SMAppService.mainApp.register()
                }
            } else if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            print("LoginItem sync failed: \(error)")
        }
    }
}
#endif
