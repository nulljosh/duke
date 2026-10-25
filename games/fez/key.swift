// key PID <code[,code...]> <holdMs> [delayMs]: hold keys, delivered straight to one process (postToPid),
// so FEZ can sit in the background while Joshua uses the terminal.
// key PID text "warp X": type text into the same process (FEZUG console).
// With delayMs, the second key goes down that long after the first (run, then jump mid-run).
import Foundation
import CoreGraphics
let a = CommandLine.arguments
let pid = pid_t(a[1])!
let src = CGEventSource(stateID: .hidSystemState)
func post(_ c: CGKeyCode, _ down: Bool, _ text: String? = nil) {
    guard let e = CGEvent(keyboardEventSource: src, virtualKey: c, keyDown: down) else { return }
    if let t = text { let u = Array(t.utf16); e.keyboardSetUnicodeString(stringLength: u.count, unicodeString: u) }
    e.postToPid(pid)
}
if a[2] == "text" {
    for ch in a[3] { post(0, true, String(ch)); usleep(15_000); post(0, false, String(ch)); usleep(15_000) }
    exit(0)
}
let codes = a[2].split(separator: ",").map { CGKeyCode($0)! }
let hold = UInt32(a.count > 3 ? a[3] : "80")!, delay = UInt32(a.count > 4 ? a[4] : "0")!
post(codes[0], true)
if codes.count > 1 { usleep(delay * 1000); for c in codes.dropFirst() { post(c, true) } }
usleep(hold * 1000)
for c in codes.reversed() { post(c, false) }
