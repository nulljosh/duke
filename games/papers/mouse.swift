// mouse PID click X Y | mouse PID drag X1 Y1 X2 Y2: left-button events in screen points, delivered to one process.
import Foundation
import CoreGraphics
let a = CommandLine.arguments
let pid = pid_t(a[1])!
let n = a.dropFirst(3).map { Double($0)! }
func post(_ t: CGEventType, _ x: Double, _ y: Double) {
    CGEvent(mouseEventSource: nil, mouseType: t, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)?.postToPid(pid)
    usleep(30_000)
}
post(.mouseMoved, n[0], n[1])
post(.leftMouseDown, n[0], n[1])
if a[2] == "drag" {
    for i in 1...12 { let f = Double(i) / 12; post(.leftMouseDragged, n[0] + (n[2] - n[0]) * f, n[1] + (n[3] - n[1]) * f) }
    post(.leftMouseUp, n[2], n[3])
} else { usleep(60_000); post(.leftMouseUp, n[0], n[1]) }
