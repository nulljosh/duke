import SwiftUI
import Darwin
import Carbon.HIToolbox

/// Ctrl+Option+H shows or hides the progress panel, Ctrl+Option+P pins the live window above everything or lets it drop back.
/// Carbon hot keys work from any app and need no Accessibility permission.
enum Hotkey {
    nonisolated(unsafe) static var actions: [UInt32: () -> Void] = [:]
    static func register(_ hud: @escaping () -> Void, pin: @escaping () -> Void) {
        actions = [1: hud, 2: pin]
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, ev, _ in
            var id = EventHotKeyID()
            GetEventParameter(ev, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, &id)
            Hotkey.actions[id.id]?(); return noErr
        }, 1, &spec, nil, nil)
        for (code, id) in [(kVK_ANSI_H, UInt32(1)), (kVK_ANSI_P, UInt32(2))] {
            var ref: EventHotKeyRef?
            RegisterEventHotKey(UInt32(code), UInt32(controlKey | optionKey), EventHotKeyID(signature: 0x43564552, id: id), GetApplicationEventTarget(), 0, &ref)
        }
    }
}

/// The map and progress in a normal window you can move, resize and leave open next to the game.
@MainActor
enum LiveWindow {
    static var window: NSWindow?
    /// Always on top by default, so the live view stays visible next to whatever is being debugged. Remembered across launches.
    static var pinned: Bool {
        get { UserDefaults.standard.object(forKey: "livePinned") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "livePinned"); window?.level = newValue ? .floating : .normal }
    }
    static func togglePin() { pinned.toggle() }
    static func show(_ poller: StatusPoller) {
        if let w = window { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }
        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 760, height: 700),
                         styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
        w.title = "Conveyer live"
        w.appearance = NSAppearance(named: .darkAqua)
        w.backgroundColor = NSColor(white: 0.11, alpha: 1)
        w.isReleasedWhenClosed = false
        w.level = pinned ? .floating : .normal
        w.collectionBehavior = [.fullScreenPrimary, .fullScreenAuxiliary]  // without this the green button and toggleFullScreen do nothing
        w.contentView = NSHostingView(rootView: LiveView(poller: poller))
        w.center()
        window = w
        poller.windowVisible = true
        NSApp.setActivationPolicy(.regular)   // dock icon while the live window is open
        NSApp.applicationIconImage = NSImage(contentsOfFile: Bundle.main.path(forResource: "AppIcon", ofType: "icns") ?? "")
        NotificationCenter.default.addObserver(forName: NSWindow.didChangeOcclusionStateNotification, object: w, queue: .main) { _ in
            Task { @MainActor in poller.windowVisible = w.occlusionState.contains(.visible) }
        }
        NotificationCenter.default.addObserver(forName: NSWindow.willCloseNotification, object: w, queue: .main) { _ in
            Task { @MainActor in LiveWindow.window = nil; poller.windowVisible = false; NSApp.setActivationPolicy(.accessory) }
        }
        w.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
