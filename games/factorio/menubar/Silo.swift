import SwiftUI
import Darwin
import Carbon.HIToolbox

/// Rocket silo: pad, launch pad, rocket, exhaust, progress, launch animation.
struct SiloLayer: View {
    @ObservedObject var m: MarkerModel
    @State private var launchStartTime: Double?

    static let siloClosedImg: NSImage? = {
        let path = NSString(string: "~/Documents/Code/conveyer/assets/silo/silo_closed.png").expandingTildeInPath
        return NSImage(contentsOfFile: path)
    }()

    static let siloOpenBackImg: NSImage? = {
        let path = NSString(string: "~/Documents/Code/conveyer/assets/silo/silo_open_back.png").expandingTildeInPath
        return NSImage(contentsOfFile: path)
    }()

    static let siloOpenFrontImg: NSImage? = {
        let path = NSString(string: "~/Documents/Code/conveyer/assets/silo/silo_open_front.png").expandingTildeInPath
        return NSImage(contentsOfFile: path)
    }()

    static let rocketImg: NSImage? = {
        let path = NSString(string: "~/Documents/Code/conveyer/assets/silo/rocket.png").expandingTildeInPath
        return NSImage(contentsOfFile: path)
    }()

    var body: some View {
        GeometryReader { g in
            if let f = m.frame, let silo = m.silo {
                let s = max(g.size.width / f.w, g.size.height / f.h)
                let cx = (g.size.width - f.w * s) / 2 + (f.w / 2 + (silo.x - f.cx) * f.ppt) * s
                let cy = (g.size.height - f.h * s) / 2 + (f.h / 2 + (silo.y - f.cy) * f.ppt) * s
                let tileSize = f.ppt * s
                let isLaunching = silo.status == "preparing_rocket_for_launch" || silo.status == "launching_rocket"

                ZStack {
                    let hasRocket = (silo.rocket ?? 0) == 1 || isLaunching

                    if !hasRocket {
                        if let img = SiloLayer.siloClosedImg {
                            Image(nsImage: img)
                                .interpolation(.high)
                                .frame(width: 22 * tileSize, height: 22 * tileSize)
                                .position(x: cx, y: cy)
                        }
                    } else {
                        if let img = SiloLayer.siloOpenBackImg {
                            Image(nsImage: img)
                                .interpolation(.high)
                                .frame(width: 22 * tileSize, height: 22 * tileSize)
                                .position(x: cx, y: cy)
                        }

                        if SiloLayer.rocketImg != nil {
                            if isLaunching {
                                TimelineView(.animation(minimumInterval: 1.0 / 30)) { ctx in
                                    RocketImageView(cx: cx, cy: cy, tileSize: tileSize, t: ctx.date.timeIntervalSinceReferenceDate, launchStart: launchStartTime ?? ctx.date.timeIntervalSinceReferenceDate)
                                }
                            } else {
                                RocketImageView(cx: cx, cy: cy, tileSize: tileSize, t: 0, launchStart: 0)
                            }
                        }

                        if let img = SiloLayer.siloOpenFrontImg {
                            Image(nsImage: img)
                                .interpolation(.high)
                                .frame(width: 22 * tileSize, height: 22 * tileSize)
                                .position(x: cx, y: cy)
                        }
                    }

                    if isLaunching {
                        TimelineView(.animation(minimumInterval: 1.0 / 30)) { ctx in
                            Canvas { canvas, _ in
                                drawAnimationEffects(cx: cx, cy: cy, tileSize: tileSize, silo: silo, t: ctx.date.timeIntervalSinceReferenceDate, launchStart: launchStartTime ?? ctx.date.timeIntervalSinceReferenceDate, canvas: canvas)
                            }
                        }
                        .onAppear {
                            if launchStartTime == nil {
                                launchStartTime = Date().timeIntervalSinceReferenceDate
                            }
                        }
                    } else {
                        Canvas { canvas, _ in
                            drawAnimationEffects(cx: cx, cy: cy, tileSize: tileSize, silo: silo, t: 0, launchStart: 0, canvas: canvas)
                        }
                    }

                    if (silo.rocket ?? 0) != 1 && silo.parts < 100 {
                        ProgressBarView(cx: cx, cy: cy, tileSize: tileSize, silo: silo)
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func drawAnimationEffects(cx: CGFloat, cy: CGFloat, tileSize: CGFloat, silo: SiloData, t: Double, launchStart: Double, canvas: GraphicsContext) {
        let isLaunching = silo.status == "preparing_rocket_for_launch" || silo.status == "launching_rocket"
        guard isLaunching else { return }

        let elapsedTime = t - launchStart
        let riseProgress = min(elapsedTime / 12.0, 1.0)
        let easeProgress = riseProgress * riseProgress * (3 - 2 * riseProgress)
        let yOffset = easeProgress * 45.0 * tileSize

        // Flame teardrop under rocket
        let flameH = 3.0 * tileSize
        let flickerPhase = sin(t * 3.0 * .pi) * 0.5 + 0.5
        canvas.fill(Path { p in
            p.move(to: CGPoint(x: cx, y: cy + 0.5 * tileSize))
            p.addCurve(to: CGPoint(x: cx, y: cy + 0.5 * tileSize + flameH * flickerPhase),
                       control1: CGPoint(x: cx - 0.6 * tileSize * flickerPhase, y: cy + 0.3 * tileSize),
                       control2: CGPoint(x: cx - 0.5 * tileSize * flickerPhase, y: cy + 0.5 * tileSize + flameH * flickerPhase * 0.8))
            p.addCurve(to: CGPoint(x: cx, y: cy + 0.5 * tileSize),
                       control1: CGPoint(x: cx + 0.5 * tileSize * flickerPhase, y: cy + 0.5 * tileSize + flameH * flickerPhase * 0.8),
                       control2: CGPoint(x: cx + 0.6 * tileSize * flickerPhase, y: cy + 0.3 * tileSize))
        }, with: .color(Color(red: 1.0, green: 0.85, blue: 0.3).opacity(0.6)))

        // Smoke puffs
        for i in 0..<8 {
            let angle = Double(i) * 2.0 * .pi / 8.0
            let phaseShift = Double(i) / 8.0
            let smokeProg = (elapsedTime - phaseShift * 2.0).truncatingRemainder(dividingBy: 2.0) / 2.0
            guard smokeProg >= 0 else { continue }
            let smokeSize = 0.8 * tileSize * (1.0 - smokeProg)
            let smokeDist = smokeProg * 4.0 * tileSize
            let sx = cx + cos(angle) * smokeDist
            let sy = cy + 0.5 * tileSize + sin(angle) * smokeDist
            canvas.fill(Path(ellipseIn: CGRect(x: sx - smokeSize / 2, y: sy - smokeSize / 2, width: smokeSize, height: smokeSize)), with: .color(Color(red: 0.5, green: 0.5, blue: 0.5).opacity(0.4 * (1.0 - smokeProg))))
        }

        // Glow on pad
        let glowR = (5.0 + 6.0 * sin(t * 2.0 * .pi)) * tileSize
        canvas.fill(Path(ellipseIn: CGRect(x: cx - glowR, y: cy - glowR, width: glowR * 2, height: glowR * 2)), with: .color(Color(red: 1.0, green: 0.9, blue: 0.5).opacity(0.2)))

        // Flash ring (once at ignition)
        if elapsedTime < 0.3 {
            let flashR = 15.0 * tileSize * (elapsedTime / 0.3)
            canvas.stroke(Path(ellipseIn: CGRect(x: cx - flashR, y: cy - flashR, width: flashR * 2, height: flashR * 2)), with: .color(.white.opacity(0.4)), lineWidth: 2)
        }
    }
}

struct RocketImageView: View {
    let cx: CGFloat
    let cy: CGFloat
    let tileSize: CGFloat
    let t: Double
    let launchStart: Double

    var body: some View {
        let elapsedTime = t - launchStart
        let riseProgress = min(elapsedTime / 12.0, 1.0)
        let easeProgress = riseProgress * riseProgress * (3 - 2 * riseProgress)
        let yOffset = easeProgress * 45.0 * tileSize
        let rocketTilesAbove = yOffset / tileSize
        let opacity = rocketTilesAbove > 30 ? max(0, 1.0 - (rocketTilesAbove - 30) / 15.0) : 1.0

        if let img = SiloLayer.rocketImg {
            Image(nsImage: img)
                .interpolation(.high)
                .frame(width: 4.8125 * tileSize, height: 11.75 * tileSize)
                .position(x: cx, y: cy - 2.03 * tileSize - yOffset)
                .opacity(opacity)
        }
    }
}

struct ProgressBarView: View {
    let cx: CGFloat
    let cy: CGFloat
    let tileSize: CGFloat
    let silo: SiloData

    var body: some View {
        Canvas { canvas, _ in
            let orange95 = Color(red: 0.95, green: 0.72, blue: 0.10)
            let barW = 4.0 * tileSize
            let barH = 0.5 * tileSize
            let barX = cx - barW / 2
            let barY = cy + 5.0 * tileSize
            canvas.fill(Path(roundedRect: CGRect(x: barX, y: barY, width: barW, height: barH), cornerRadius: barH / 2), with: .color(Color.white.opacity(0.2)))
            let fillW = barW * CGFloat(min(max(silo.parts, 0), 100)) / 100.0
            canvas.fill(Path(roundedRect: CGRect(x: barX, y: barY, width: fillW, height: barH), cornerRadius: barH / 2), with: .color(orange95))
        }
    }
}

/// Machine status dots over the map: green pulses while working, amber waits for items, red is stuck. Drawn from live_status.json, so the view moves even when the map picture is old.
struct StatusDots: View {
    @ObservedObject var m: MarkerModel
    var body: some View {
        GeometryReader { g in
            if let f = m.frame, !m.dots.isEmpty {
                let s = max(g.size.width / f.w, g.size.height / f.h)
                TimelineView(.animation(minimumInterval: 1.0 / 10)) { ctx in
                    let t = ctx.date.timeIntervalSinceReferenceDate
                    Canvas { c, _ in
                        for (i, d) in m.dots.enumerated() where d.count == 3 {
                            let x = (g.size.width - f.w * s) / 2 + (f.w / 2 + (d[0] - f.cx) * f.ppt) * s
                            let y = (g.size.height - f.h * s) / 2 + (f.h / 2 + (d[1] - f.cy) * f.ppt) * s
                            let code = Int(d[2])
                            let pulse = code == 0 ? 0.55 + 0.45 * sin(t * 6 + Double(i)) : 1.0
                            let col: Color = code == 0 ? .green : (code == 1 ? .orange : .red)
                            let r: CGFloat = max(3, (code == 0 ? 4 : 5) * s)
                            c.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r - 14 * s, width: 2 * r, height: 2 * r)), with: .color(col.opacity(pulse)))
                            c.stroke(Path(ellipseIn: CGRect(x: x - r, y: y - r - 14 * s, width: 2 * r, height: 2 * r)), with: .color(.black.opacity(0.6)), lineWidth: 1)
                        }
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }
}
