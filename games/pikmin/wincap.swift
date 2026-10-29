// Streams Dolphin's render window as raw BGRA frames (W x H, 30 fps) on stdout, for stream.sh's ffmpeg.
// ScreenCaptureKit captures the window even behind other windows (not when the app is hidden), and a timer
// re-sends the last frame so ffmpeg gets a constant rate while the picture is still.
import AppKit
import CoreMedia
import Foundation
import ScreenCaptureKit

let W = 960, H = 720
var last = Data(count: W * H * 4)
let lock = NSLock()

final class Out: NSObject, SCStreamOutput {
  func stream(_ s: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
    guard type == .screen, let px = CMSampleBufferGetImageBuffer(sb) else { return }
    CVPixelBufferLockBaseAddress(px, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(px, .readOnly) }
    guard CVPixelBufferGetWidth(px) == W, CVPixelBufferGetHeight(px) == H,
          let base = CVPixelBufferGetBaseAddress(px) else { return }
    let row = CVPixelBufferGetBytesPerRow(px)
    var d = Data(count: W * H * 4)
    d.withUnsafeMutableBytes { dst in
      for y in 0..<H { memcpy(dst.baseAddress! + y * W * 4, base + y * row, W * 4) }
    }
    lock.lock(); last = d; lock.unlock()
  }
}

_ = NSApplication.shared                  // ScreenCaptureKit needs a CoreGraphics session
let out = Out()
var stream: SCStream?
SCShareableContent.getExcludingDesktopWindows(false, onScreenWindowsOnly: false) { content, err in
  guard let win = content?.windows.first(where: {
    $0.owningApplication?.applicationName == "Dolphin" && ($0.title ?? "").contains("|")
  }) else { FileHandle.standardError.write("no Dolphin render window \(String(describing: err))\n".data(using: .utf8)!); exit(1) }
  let cfg = SCStreamConfiguration()
  cfg.width = W; cfg.height = H
  cfg.pixelFormat = kCVPixelFormatType_32BGRA
  cfg.minimumFrameInterval = CMTime(value: 1, timescale: 30)
  cfg.showsCursor = false
  let s = SCStream(filter: SCContentFilter(desktopIndependentWindow: win), configuration: cfg, delegate: nil)
  try! s.addStreamOutput(out, type: .screen, sampleHandlerQueue: DispatchQueue(label: "cap"))
  s.startCapture { e in if let e { FileHandle.standardError.write("capture: \(e)\n".data(using: .utf8)!); exit(1) } }
  stream = s
}
Timer.scheduledTimer(withTimeInterval: 1.0 / 30, repeats: true) { _ in
  lock.lock(); let d = last; lock.unlock()
  FileHandle.standardOutput.write(d)
}
signal(SIGPIPE, SIG_DFL)
RunLoop.main.run()
