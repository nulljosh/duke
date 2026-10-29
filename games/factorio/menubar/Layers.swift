import SwiftUI
import Darwin
import Carbon.HIToolbox

/// An original marker, not a game sprite: a pin with a heading wedge. It glides between position updates.
struct PlayerMarker: View {
    @ObservedObject var m: MarkerModel
    @ObservedObject var glide: Glide
    init(m: MarkerModel) { self.m = m; glide = m.glide }
    var body: some View {
        GeometryReader { g in
            if let p = m.shown, let f = m.frame {
                // same fill transform as the map image: scale to cover, centered
                let s = max(g.size.width / f.w, g.size.height / f.h)
                let x = (g.size.width - f.w * s) / 2 + (f.w / 2 + (p.x - f.cx) * f.ppt) * s
                let y = (g.size.height - f.h * s) / 2 + (f.h / 2 + (p.y - f.cy) * f.ppt) * s
                ZStack {
                    Circle().fill(Color.accentColor.opacity(m.moving ? 0.28 : 0.14)).frame(width: 30 * s, height: 30 * s)
                    if m.moving {
                        TimelineView(.animation(minimumInterval: 1.0 / 20)) { ctx in
                            let scale = 1.0 + 0.25 * sin(ctx.date.timeIntervalSinceReferenceDate * 4)
                            Circle().stroke(Color.accentColor.opacity(0.9), lineWidth: 2).frame(width: 34 * s, height: 34 * s)
                                .scaleEffect(scale)
                        }
                    } else {
                        Circle().stroke(Color.accentColor.opacity(0.9), lineWidth: 2).frame(width: 34 * s, height: 34 * s)
                    }
                    if Engineer.available {
                        EngineerSprite(heading: m.heading, walking: m.moving, scale: s)
                    } else if m.moving {
                        // 12 fps walk cycle, only while he is actually moving; standing still has no timer at all
                        TimelineView(.animation(minimumInterval: 1.0 / 12)) { ctx in
                            HardHatFigure(heading: m.heading, phase: sin(ctx.date.timeIntervalSinceReferenceDate * 11), walking: true)
                        }
                    } else {
                        HardHatFigure(heading: m.heading, phase: 0, walking: false)
                    }
                }
                .position(x: x, y: y)
            }
        }
        .allowsHitTesting(false)
    }
}

/// Combat overlay: enemies, turrets, and firing arcs on the live map
struct CombatLayer: View {
    @ObservedObject var m: MarkerModel
    var body: some View {
        GeometryReader { g in
            if let f = m.frame, let c = m.combat, !c.enemies.isEmpty || !c.turrets.isEmpty {
                let s = max(g.size.width / f.w, g.size.height / f.h)
                TimelineView(.animation(minimumInterval: 1.0 / 15)) { ctx in
                    let t = ctx.date.timeIntervalSinceReferenceDate
                    Canvas { canvas, _ in
                        // Draw enemies: [x,y,kind,size]
                        for (i, enemy) in c.enemies.enumerated() where enemy.count >= 4 {
                            let ex = (g.size.width - f.w * s) / 2 + (f.w / 2 + (enemy[0] - f.cx) * f.ppt) * s
                            let ey = (g.size.height - f.h * s) / 2 + (f.h / 2 + (enemy[1] - f.cy) * f.ppt) * s
                            let dx = ex - (g.size.width / 2)
                            let dy = ey - (g.size.height / 2)
                            guard abs(dx) < g.size.width && abs(dy) < g.size.height else { continue }
                            let kind = Int(enemy[2])
                            let size = Int(enemy[3])
                            let sizeRadius: CGFloat = [0.8, 1.1, 1.5, 2.0][min(size, 3)] * f.ppt * s
                            if kind == 2 { // worm: triangle
                                var tri = Path()
                                tri.move(to: CGPoint(x: ex, y: ey - sizeRadius))
                                tri.addLine(to: CGPoint(x: ex + sizeRadius, y: ey + sizeRadius))
                                tri.addLine(to: CGPoint(x: ex - sizeRadius, y: ey + sizeRadius))
                                tri.closeSubpath()
                                canvas.fill(tri, with: .color(Color(red: 0.6, green: 0, blue: 0)))
                                canvas.stroke(tri, with: .color(.black.opacity(0.6)), lineWidth: 1)
                            } else if kind == 3 { // nest: rounded square
                                let rectSize = 3.0 * f.ppt * s
                                let rect = CGRect(x: ex - rectSize / 2, y: ey - rectSize / 2, width: rectSize, height: rectSize)
                                canvas.fill(Path(roundedRect: rect, cornerRadius: rectSize * 0.2), with: .color(Color(red: 0.6, green: 0, blue: 0)))
                                canvas.stroke(Path(roundedRect: rect, cornerRadius: rectSize * 0.2), with: .color(Color(red: 0.8, green: 0.2, blue: 0.2).opacity(0.7)), lineWidth: 1)
                            } else {
                                // biter or spitter: circle
                                let col = kind == 0 ? Color.red : Color(red: 1, green: 0.6, blue: 0)
                                let jiggle = sin(t * 5 + Double(i) * 0.5) * 1.5 * s
                                let jiggledX = ex + jiggle
                                let jiggledY = ey + jiggle * 0.5
                                canvas.fill(Path(ellipseIn: CGRect(x: jiggledX - sizeRadius, y: jiggledY - sizeRadius, width: 2 * sizeRadius, height: 2 * sizeRadius)), with: .color(col))
                                canvas.stroke(Path(ellipseIn: CGRect(x: jiggledX - sizeRadius, y: jiggledY - sizeRadius, width: 2 * sizeRadius, height: 2 * sizeRadius)), with: .color(.black.opacity(0.6)), lineWidth: 1)
                            }
                        }
                        // Draw firing turrets: [x,y,firing]
                        for turret in c.turrets where turret.count >= 3 && Int(turret[2]) != 0 {
                            let tx = (g.size.width - f.w * s) / 2 + (f.w / 2 + (turret[0] - f.cx) * f.ppt) * s
                            let ty = (g.size.height - f.h * s) / 2 + (f.h / 2 + (turret[1] - f.cy) * f.ppt) * s
                            let tdx = tx - (g.size.width / 2)
                            let tdy = ty - (g.size.height / 2)
                            guard abs(tdx) < g.size.width && abs(tdy) < g.size.height else { continue }
                            let pulseRadius = (1.2 + sin(t * 4) * 0.5) * f.ppt * s
                            canvas.fill(Path(ellipseIn: CGRect(x: tx - pulseRadius, y: ty - pulseRadius, width: 2 * pulseRadius, height: 2 * pulseRadius)), with: .color(Color(red: 1, green: 1, blue: 0.7)))
                            let nearestEnemy = c.enemies.filter { $0.count >= 2 }.min { e1, e2 in
                                let d1 = (e1[0] - turret[0]) * (e1[0] - turret[0]) + (e1[1] - turret[1]) * (e1[1] - turret[1])
                                let d2 = (e2[0] - turret[0]) * (e2[0] - turret[0]) + (e2[1] - turret[1]) * (e2[1] - turret[1])
                                return d1 < d2
                            }
                            if let nearest = nearestEnemy, nearest.count >= 2 {
                                let distSq = (nearest[0] - turret[0]) * (nearest[0] - turret[0]) + (nearest[1] - turret[1]) * (nearest[1] - turret[1])
                                if distSq < 484 { // 22 tiles
                                    let ex = (g.size.width - f.w * s) / 2 + (f.w / 2 + (nearest[0] - f.cx) * f.ppt) * s
                                    let ey = (g.size.height - f.h * s) / 2 + (f.h / 2 + (nearest[1] - f.cy) * f.ppt) * s
                                    var line = Path()
                                    line.move(to: CGPoint(x: tx, y: ty))
                                    line.addLine(to: CGPoint(x: ex, y: ey))
                                    canvas.stroke(line, with: .color(Color(red: 1, green: 1, blue: 0).opacity(0.9)), lineWidth: 1.5)
                                }
                            }
                        }
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// The real Factorio engineer, cut from the game's own sprite sheets at runtime. build.sh copies them from the installed game into the app bundle
/// (never into git); without them the marker falls back to the hand-drawn hard hat below. 22 frames across, 8 directions down, north first, clockwise.
enum Engineer {
    static let run: CGImage? = load("engineer_running")
    static let idle: CGImage? = load("engineer_idle")
    private static func load(_ name: String) -> CGImage? {
        guard let p = Bundle.main.path(forResource: name, ofType: "png"), let img = NSImage(contentsOfFile: p) else { return nil }
        return img.cgImage(forProposedRect: nil, context: nil, hints: nil)
    }
    static var available: Bool { run != nil && idle != nil }
    /// One frame of the sheet: row by heading (0 = east, 90 = south on screen), column by frame.
    static func frame(_ sheet: CGImage, heading: Double, frame: Int, scale: CGFloat) -> NSImage {
        let cw = sheet.width / 22, ch = sheet.height / 8
        let a = (heading + 90).truncatingRemainder(dividingBy: 360), row = Int(((a < 0 ? a + 360 : a) + 22.5) / 45) % 8
        let rect = CGRect(x: (frame % 22) * cw, y: row * ch, width: cw, height: ch)
        let c = sheet.cropping(to: rect) ?? sheet
        return NSImage(cgImage: c, size: NSSize(width: CGFloat(cw) / 4 * scale, height: CGFloat(ch) / 4 * scale))   // sheets are 2x art for 32 px a tile; the map is 16 px a tile, then scaled to the window
    }
}

struct EngineerSprite: View {
    var heading: Double
    var walking: Bool
    var scale: CGFloat
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20)) { ctx in
            let i = walking ? Int(ctx.date.timeIntervalSinceReferenceDate * 22) % 22 : 0
            if let sheet = walking ? Engineer.run : Engineer.idle {
                Image(nsImage: Engineer.frame(sheet, heading: heading, frame: i, scale: scale)).interpolation(.high)
            }
        }
    }
}

/// An original little engineer seen from above: grey armor, a pack on the back, orange helmet with a visor that points the way it walks.
struct HardHatFigure: View {
    var heading: Double   // degrees, 0 = east
    var phase: Double     // -1...1 walk cycle, 0 when standing
    var walking: Bool
    private let glove = Color(red: 0.30, green: 0.31, blue: 0.33)
    var body: some View {
        ZStack {
            Ellipse().fill(Color.black.opacity(0.30)).frame(width: 24, height: 12).offset(y: 3)
            RoundedRectangle(cornerRadius: 2).fill(Color(red: 0.62, green: 0.40, blue: 0.14)).frame(width: 13, height: 9).offset(y: 8)  // pack
            Capsule().fill(Color(red: 0.50, green: 0.53, blue: 0.56)).frame(width: 24, height: 12)                                        // armor
            Capsule().stroke(Color(red: 0.28, green: 0.30, blue: 0.33), lineWidth: 1).frame(width: 24, height: 12)
            Ellipse().fill(Color(red: 0.20, green: 0.21, blue: 0.23)).frame(width: 6, height: 8).offset(x: -5, y: 9 + 4 * phase)         // feet step in turn
            Ellipse().fill(Color(red: 0.20, green: 0.21, blue: 0.23)).frame(width: 6, height: 8).offset(x: 5, y: 9 - 4 * phase)
            Circle().fill(glove).frame(width: 6, height: 6).offset(x: -13, y: -3.5 * phase)                                              // arms swing opposite the feet
            Circle().fill(glove).frame(width: 6, height: 6).offset(x: 13, y: 3.5 * phase)
            Circle().fill(Color(red: 0.96, green: 0.50, blue: 0.10)).frame(width: 14, height: 14)                                         // helmet
            Circle().fill(Color.white.opacity(0.30)).frame(width: 5, height: 5).offset(x: -2, y: 2)
            Capsule().fill(Color(red: 0.20, green: 0.22, blue: 0.25)).frame(width: 9, height: 4).offset(y: -8)                            // visor, points forward
        }
        .rotationEffect(.degrees(heading + 90))   // drawn facing north; north is heading -90
        .scaleEffect(1.0 + (walking ? 0.05 + 0.03 * abs(phase) : 0))   // small bob while walking
    }
}

struct Triangle: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path(); p.move(to: CGPoint(x: r.midX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY)); p.closeSubpath(); return p
    }
}

/// Zooms the map layer and slides it so the player stays in the middle, clamped to the picture's edge. Only this view watches the eased position.
struct CameraRig<Content: View>: View {
    @ObservedObject var m: MarkerModel
    @ObservedObject var glide: Glide
    let size: CGSize
    let content: Content
    private let zoom: CGFloat = {   // --zoom N on the command line, 1.7 by default; 1.0 is pixel-for-pixel on a 1080p screen, which is what the landing video uses
        let a = CommandLine.arguments
        if let i = a.firstIndex(of: "--zoom"), i + 1 < a.count, let z = Double(a[i + 1]) { return CGFloat(z) }
        return 1.7
    }()
    init(m: MarkerModel, size: CGSize, @ViewBuilder content: () -> Content) { self.m = m; glide = m.glide; self.size = size; self.content = content() }
    var body: some View {
        let o = offset()
        content.scaleEffect(zoom).offset(x: o.width, y: o.height)
    }
    private func offset() -> CGSize {
        guard let f = m.frame, let p = m.shown else { return .zero }
        let s0 = max(size.width / f.w, size.height / f.h)
        let qx = (p.x - f.cx) * f.ppt * s0, qy = (p.y - f.cy) * f.ppt * s0
        // Center on the player, but never slide the picture past its own edge: the picture always covers the window, so there is never a dark bar.
        // When the player walks outside the picture (it re-renders on change or every 60 s) he leaves the view until the next frame re-centers it.
        let mx = max(0, zoom * f.w * s0 / 2 - size.width / 2), my = max(0, zoom * f.h * s0 / 2 - size.height / 2)
        let ox = min(max(-zoom * qx, -mx), mx), oy = min(max(-zoom * qy, -my), my)
        let res = CGSize(width: ox, height: oy)
        if ProcessInfo.processInfo.environment["CV_DEBUG"] != nil {   // QA aid: one line per frame to /tmp/cv_cam.log, then read it back
            let hw = zoom * f.w * s0 / 2, hh = zoom * f.h * s0 / 2
            let gapL = res.width - hw + size.width / 2, gapR = size.width / 2 - (res.width + hw), gapT = res.height - hh + size.height / 2, gapB = size.height / 2 - (res.height + hh)
            let line = String(format: "%.2f p=(%.1f,%.1f) frame=(%.1f,%.1f) screenPlayer=(%.0f,%.0f) win=(%.0f,%.0f) blackMargins L%.0f R%.0f T%.0f B%.0f\n", Date().timeIntervalSince1970, p.x, p.y, f.cx, f.cy, zoom * qx + res.width, zoom * qy + res.height, size.width, size.height, max(0, gapL), max(0, gapR), max(0, gapT), max(0, gapB))
            if let h = FileHandle(forWritingAtPath: "/tmp/cv_cam.log") ?? { FileManager.default.createFile(atPath: "/tmp/cv_cam.log", contents: nil); return FileHandle(forWritingAtPath: "/tmp/cv_cam.log") }() { h.seekToEndOfFile(); h.write(line.data(using: .utf8)!); try? h.close() }
        }
        return res
    }
}
