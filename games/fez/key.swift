// key <code[,code...]> <holdMs> [delayMs]: hold keys with real CGEvents (games ignore System Events keystrokes for movement).
// With delayMs, the second key goes down that long after the first (run, then jump mid-run).
import Foundation
import CoreGraphics
let a = CommandLine.arguments
let codes = a[1].split(separator: ",").map { CGKeyCode($0)! }
let hold = UInt32(a.count > 2 ? a[2] : "80")!, delay = UInt32(a.count > 3 ? a[3] : "0")!
let src = CGEventSource(stateID: .hidSystemState)
func post(_ c: CGKeyCode, _ down: Bool) { CGEvent(keyboardEventSource: src, virtualKey: c, keyDown: down)?.post(tap: .cghidEventTap) }
post(codes[0], true)
if codes.count > 1 { usleep(delay * 1000); for c in codes.dropFirst() { post(c, true) } }
usleep(hold * 1000)
for c in codes.reversed() { post(c, false) }
