// Prints the window id of Dolphin's render window (the one titled with the backend), for screencapture -l.
import CoreGraphics
let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as! [[String: Any]]
for w in list where (w[kCGWindowOwnerName as String] as? String) == "Dolphin" {
  if let n = w[kCGWindowName as String] as? String, n.contains("|"), (w[kCGWindowIsOnscreen as String] as? Bool) == true {
    print(w[kCGWindowNumber as String]!); break
  }
}
