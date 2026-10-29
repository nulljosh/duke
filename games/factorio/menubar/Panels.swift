import SwiftUI
import Darwin
import Carbon.HIToolbox

/// Whole-base overview in the corner: base (light), oil (orange), enemy nests (red), and a dot where the player stands right now.
struct MiniMap: View {
    @ObservedObject var m: MarkerModel
    @ObservedObject var glide: Glide
    let win: CGSize   // the live window's size: the minimap is about a fifth of its width, never more than 40% of its height
    init(m: MarkerModel, win: CGSize) { self.m = m; glide = m.glide; self.win = win }
    var body: some View {
        if let img = m.mini, let meta = m.miniMeta {
            let aspect = img.size.height / max(img.size.width, 1)
            let w = min(max(win.width * 0.2, 110), 480, win.height * 0.4 / max(aspect, 0.1)), h = w * aspect
            let dot = max(6, w * 0.055)
            ZStack(alignment: .topLeading) {
                Image(nsImage: img).resizable().interpolation(.none).frame(width: w, height: h)
                if let p = m.shown {
                    let x = (p.x - meta.x0) / meta.w * w, y = (p.y - meta.y0) / meta.h * h
                    Circle().fill(Color.accentColor).overlay(Circle().stroke(Color.white, lineWidth: 1.5)).frame(width: dot, height: dot)
                        .offset(x: min(max(x, 0), w) - dot / 2, y: min(max(y, 0), h) - dot / 2)
                }
            }
            .frame(width: w, height: h)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.white.opacity(0.25), lineWidth: 1))
            .shadow(radius: 6, y: 2)
            .padding(max(8, w * 0.07))
            .allowsHitTesting(false)
        }
    }
}

/// Activity feed: recent events (last 40s) shown as small pills with color-coded status dots.
struct Feed: View {
    @ObservedObject var m: MarkerModel
    let win: CGSize
    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { _ in
            if !m.events.isEmpty {
                let now = Date().timeIntervalSince1970
                let filtered = m.events.filter { now - $0.t < 40 }
                if !filtered.isEmpty {
                    let u = min(max(min(win.width / 900, win.height / 800), 0.7), 2.0)   // same window scale as the HUD
                    let maxWidth = win.width * 0.28
                    let hotbarHeight = min(max(win.width * 0.045, 28), 64)
                    VStack(alignment: .leading, spacing: 4 * u) {
                        ForEach(Array(filtered.enumerated()), id: \.offset) { i, event in
                            let age = now - event.t
                            let isFading = age > 30
                            let fadeAlpha = isFading ? max(0, 1.0 - (age - 30) / 10.0) : 1.0
                            let color: Color = event.kind == "ok" ? .green : (event.kind == "warn" ? .orange : .red)
                            HStack(spacing: 6 * u) {
                                Circle().fill(color).frame(width: 8 * u, height: 8 * u)
                                Text(event.text)
                                    .font(.system(size: 12 * u, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .lineLimit(1)
                            }
                            .padding(.horizontal, 8 * u)
                            .padding(.vertical, 5 * u)
                            .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 8 * u))
                            .opacity(fadeAlpha)
                        }
                    }
                    .frame(maxWidth: maxWidth, alignment: .trailing)
                    .padding(8)
                    .padding(.bottom, hotbarHeight + 4)
                    .allowsHitTesting(false)
                }
            }
        }
    }
}

/// Game-style hotbar: 10 inventory slots showing the player's most abundant items.
struct Hotbar: View {
    @ObservedObject var m: MarkerModel
    let win: CGSize
    var body: some View {
        if !m.hotbar.isEmpty {
            let slotSize = min(max(win.width * 0.045, 28), 64)
            let totalWidth = min(slotSize * CGFloat(m.hotbar.count), win.width * 0.55)
            HStack(spacing: slotSize * 0.05) {
                ForEach(0..<10, id: \.self) { i in
                    ZStack(alignment: .bottomTrailing) {
                        RoundedRectangle(cornerRadius: 3).fill(Color(white: 0.18))
                            .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color(white: 0.28), lineWidth: 1))
                        if i < m.hotbar.count {
                            let slot = m.hotbar[i]
                            VStack(spacing: 0) {
                                if let icon = loadIcon(slot.name, size: slotSize * 0.8) {
                                    Image(nsImage: icon).resizable().scaledToFit()
                                        .frame(width: slotSize * 0.8, height: slotSize * 0.8)
                                } else {
                                    Text(String(slot.name.prefix(2))).font(.system(size: slotSize * 0.3, weight: .bold)).foregroundStyle(.white.opacity(0.5))
                                }
                            }
                            Text("\(slot.count)").font(.system(size: slotSize * 0.25, weight: .semibold)).foregroundStyle(.white)
                                .shadow(radius: 1).padding(2)
                        }
                    }
                    .frame(width: slotSize, height: slotSize)
                }
            }
            .frame(width: totalWidth)
            .padding(8)
            .allowsHitTesting(false)
        }
    }

    /// The hotbar redraws whenever the marker model publishes (60 times a second while the engineer walks), so a PNG decode per slot per redraw cost about 20% of a core. Decode each icon once.
    private static var iconCache: [String: NSImage?] = [:]
    private func loadIcon(_ itemName: String, size: CGFloat) -> NSImage? {
        if let hit = Self.iconCache[itemName] { return hit }
        let img = decodeIcon(itemName)
        Self.iconCache[itemName] = .some(img)
        return img
    }

    private func decodeIcon(_ itemName: String) -> NSImage? {
        if let bundlePath = Bundle.main.path(forResource: itemName, ofType: "png", inDirectory: "icons"),
           let img = NSImage(contentsOfFile: bundlePath) { return img }
        let steamPath = NSString(string: "~/Library/Application Support/Steam/steamapps/common/Factorio/factorio.app/Contents/data/base/graphics/icons/\(itemName).png").expandingTildeInPath
        guard FileManager.default.fileExists(atPath: steamPath) else { return nil }
        return NSImage(contentsOfFile: steamPath)
    }
}

struct LiveView: View {
    @ObservedObject var poller: StatusPoller
    /// The map fills the whole window; the status bar floats on top of it so nothing is letterboxed.
    /// Follow camera: CameraRig re-renders at 60 fps on its own while this view (and the 4 MB map picture) stays still.
    var body: some View {
        GeometryReader { g in
            ZStack {
                Color(white: 0.11)
                CameraRig(m: poller.marker, size: g.size) {
                    ZStack {
                        if let map = poller.map {
                            // The layer is the whole picture at cover scale, not a window-sized crop of it: CameraRig's edge clamp assumes exactly this size.
                            let f = poller.marker.frame
                            let s0 = f.map { max(g.size.width / $0.w, g.size.height / $0.h) } ?? 1
                            Image(nsImage: map).resizable().interpolation(.high)
                                .frame(width: (f?.w ?? g.size.width) * s0, height: (f?.h ?? g.size.height) * s0)
                        } else {
                            Text("Waiting for the first frame").foregroundStyle(.secondary)
                        }
                        SiloLayer(m: poller.marker)
                        StatusDots(m: poller.marker)
                        PlayerMarker(m: poller.marker)
                        CombatLayer(m: poller.marker)
                    }
                }
            }
            .frame(width: g.size.width, height: g.size.height)   // the map layer is bigger than the window; without this the corner overlays anchor off-window
            .clipped()
            .overlay(alignment: .topLeading) { if poller.hudVisible { hud.scaleEffect(min(max(min(g.size.width / 900, g.size.height / 800), 0.7), 2.2), anchor: .topLeading) } }   // HUD grows and shrinks with the window
            .overlay(alignment: .bottom) { Hotbar(m: poller.marker, win: g.size) }
            .overlay(alignment: .bottomLeading) { Feed(m: poller.marker, win: g.size) }
            .overlay(alignment: .bottomTrailing) { MiniMap(m: poller.marker, win: g.size) }
        }
        .frame(minWidth: 520, minHeight: 420)
        .ignoresSafeArea()
        .environment(\.colorScheme, .dark)
    }

    private var hud: some View {
        VStack(alignment: .leading, spacing: 5) {
            if let r = poller.research, !r.current.isEmpty {
                HStack(spacing: 8) {
                    Text(Research.nice(r.current)).font(.system(size: 14, weight: .semibold))
                    Spacer(minLength: 12)
                    Text("\(r.percent)%").font(.system(size: 14)).monospacedDigit()
                }
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.22))
                        Capsule().fill(Color.accentColor).frame(width: g.size.width * CGFloat(min(max(r.percent, 0), 100)) / 100)
                    }
                }
                .frame(height: 5)
                if let labs = r.labs, let working = r.labs_working {
                    let stalled = working == 0 && r.moving != true
                    Text(stalled ? "Labs idle, waiting for packs" : "\(working) of \(labs) labs busy")
                        .font(.system(size: 12)).foregroundStyle(stalled ? Color.orange : Color.white.opacity(0.7))
                }
            }
            if let s = poller.status, s.skill != "?" {
                HStack(spacing: 5) {
                    Circle().fill(s.worked ? Color.green : Color.red).frame(width: 6, height: 6)
                    Text("Player is \(ConveyerMonitorApp.narrate(s.skill))").font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                }
            }
            TimelineView(.periodic(from: .now, by: 1)) { _ in   // the marker model is a separate object the HUD does not observe, so re-read it every second
                if let eng = poller.marker.engineer, !eng.item.isEmpty, Date().timeIntervalSince1970 - eng.t < 20 {
                    let label = eng.label.flatMap { s in s.isEmpty ? nil : s }
                    if let label = label {
                        Text(label).font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                    } else {
                        let niceName = eng.item.replacingOccurrences(of: "-", with: " ")
                        Text("Checking the \(niceName) tile").font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                    }
                }
                if let c = poller.marker.combat, Date().timeIntervalSince1970 - c.t < 4, c.player.count >= 2 {
                    let px = c.player[0], py = c.player[1]
                    let near = c.enemies.filter { $0.count >= 2 && (($0[0] - px) * ($0[0] - px) + ($0[1] - py) * ($0[1] - py)) < 1600 }  // 40 tiles
                    if !near.isEmpty {
                        let firing = c.turrets.filter { $0.count >= 3 && Int($0[2]) != 0 }.count
                        HStack(spacing: 5) {
                            Circle().fill(Color.red).frame(width: 6, height: 6)
                            Text("\(near.count) enemies near\(firing > 0 ? ", \(firing) turrets firing" : "")").font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                        }
                    }
                }
            }
        }
        .padding(12)
        .frame(width: 270, alignment: .leading)
        .background(.black.opacity(0.58), in: RoundedRectangle(cornerRadius: 10))
        .padding(12)
    }
}
