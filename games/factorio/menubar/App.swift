import SwiftUI
import Darwin
import Carbon.HIToolbox

@main
struct ConveyerMonitorApp: App {
    @StateObject private var poller = StatusPoller()

    /// `ConveyerMonitor --snapshot out.png` renders the popover to a PNG and exits, so the layout
    /// can be checked without opening the menu bar item.
    init() {
        let args = CommandLine.arguments
        guard let i = args.firstIndex(of: "--snapshot"), i + 1 < args.count else { return }
        let demoPoller = StatusPoller()
        if let d = args.firstIndex(of: "--demo"), d + 1 < args.count { demoPoller.applyDemo(args[d + 1]) }
        let live = args.contains("--live")  // --snapshot out.png --live renders the detached window instead of the popover
        let content: AnyView = live
            ? AnyView(LiveView(poller: demoPoller).frame(width: 760, height: 700).background(Color(white: 0.16)).environment(\.colorScheme, .dark))
            : AnyView(Self.popover(demoPoller).background(Color(white: 0.16)).environment(\.colorScheme, .dark))
        let renderer = ImageRenderer(content: content)
        renderer.scale = 2
        if let cg = renderer.cgImage {
            let rep = NSBitmapImageRep(cgImage: cg)
            try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: args[i + 1]))
        }
        exit(0)
    }

    var body: some Scene {
        MenuBarExtra {
            Self.popover(poller)
        } label: {
            Text(labelText)
                .font(.system(size: 12))
        }
        .menuBarExtraStyle(.window)
    }


    @ViewBuilder
    static func roadmap(_ all: [Milestone]) -> some View {
        let done = all.filter(\.done).count
        let open = all.filter { !$0.done }
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Roadmap").font(.system(size: 12, weight: .semibold))
                Spacer()
                Text("\(open.count) left").font(.system(size: 11)).foregroundStyle(.secondary)
            }
            ForEach(Array(open.prefix(3).enumerated()), id: \.element.id) { i, m in
                HStack(alignment: .top, spacing: 7) {
                    Image(systemName: i == 0 ? "circle.inset.filled" : "circle")
                        .font(.system(size: 11))
                        .foregroundStyle(i == 0 ? Color.accentColor : Color.secondary)
                        .padding(.top, 1)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(m.title)
                            .font(.system(size: 11, weight: i == 0 ? .semibold : .regular))
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                        if let eta = m.eta {
                            Text(eta).font(.system(size: 10)).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            if open.count > 3 {
                Text("\(open.count - 3) more in roadmap.md").font(.system(size: 10)).foregroundStyle(.tertiary)
            }
        }
    }

    @MainActor
    static func popover(_ poller: StatusPoller) -> some View {
            VStack(alignment: .leading, spacing: 10) {
                if let map = poller.map {
                    Image(nsImage: map)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFill()
                        .frame(width: 316, height: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    HStack {
                        Spacer()
                        Button { LiveWindow.show(poller) } label: {
                            Label("Open live view", systemImage: "macwindow.on.rectangle").font(.system(size: 11))
                        }
                    }
                }
                if poller.runnerAlive, let r = poller.research, !r.current.isEmpty {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text("Researching \(Research.nice(r.current).lowercased())")
                                .font(.system(size: 12, weight: .semibold))
                            Spacer()
                            Text("\(r.percent)%").font(.system(size: 12))
                        }
                        GeometryReader { g in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.secondary.opacity(0.25))
                                Capsule().fill(Color.accentColor)
                                    .frame(width: g.size.width * CGFloat(min(max(r.percent, 0), 100)) / 100)
                            }
                        }
                        .frame(height: 6)
                        if let labs = r.labs, let working = r.labs_working {
                            let stalled = working == 0 && r.moving != true
                            Label(stalled ? "Labs idle, waiting for science packs" : "Research moving, \(working) of \(labs) labs busy",
                                  systemImage: stalled ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
                                .font(.system(size: 11))
                                .foregroundStyle(stalled ? Color.orange : Color.secondary)
                        }
                        let next = r.queue.dropFirst().first.map { Research.nice($0).lowercased() }
                        Text(next.map { "\(r.techs) techs done. Then \($0)" } ?? "\(r.techs) techs done")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
                if !poller.milestones.isEmpty {
                    Self.roadmap(poller.milestones)
                }
                if !poller.runnerAlive {
                    Label("Stopped. It restarts on its own while the game is running.", systemImage: "stop.circle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.red)
                } else if let s = poller.status, s.skill != "?" {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 5) {
                            Circle().fill(s.worked ? Color.green : Color.red).frame(width: 7, height: 7)
                            Text("Player is \(Self.narrate(s.skill))")
                                .font(.system(size: 12, weight: .semibold))
                            Spacer()
                            if poller.stale {
                                Text("slow step").font(.system(size: 11)).foregroundStyle(.secondary)
                            }
                        }
                        if !s.worked {
                            Text(s.message.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.last(where: { !$0.isEmpty }) ?? s.message)
                                .font(.system(size: 11))
                                .foregroundStyle(.red)
                                .lineLimit(2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                } else {
                    Text("Starting up")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }

                Divider()

                Text("Controls")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)

                VStack(spacing: 4) {
                    Self.controlButton(poller, "Restart", systemImage: "arrow.clockwise") {
                        poller.run("restart_runner.sh")
                    }
                    Self.controlButton(poller, "Restart game and player", systemImage: "arrow.triangle.2.circlepath") {
                        poller.run("restart_server.sh")
                    }
                    Self.controlButton(poller, "Stop everything", systemImage: "stop.circle") {
                        poller.run("stop_all.sh")
                    }
                }

                if poller.busy {
                    HStack(spacing: 5) {
                        ProgressView().controlSize(.small)
                        Text("Working").font(.system(size: 11)).foregroundStyle(.secondary)
                    }
                }

                Divider()
                Button("Quit") { NSApplication.shared.terminate(nil) }
                    .font(.system(size: 12))
            }
            .padding(12)
            .frame(width: 340)
            .onAppear { poller.popoverShown = true }
            .onDisappear { poller.popoverShown = false }
    }

    private var labelText: String {
        if !poller.runnerAlive { return "stopped" }
        if let r = poller.research, !r.current.isEmpty {
            return "\(Research.nice(r.current)) \(r.percent)%"
        }
        guard let s = poller.status, s.skill != "?" else { return "…" }
        let dot = s.worked ? "●" : "○"
        return "\(dot) \(Self.narrate(s.skill))"
    }

    /// Skill names as they'd be said out loud, matching how progress reads in
    /// chat ("smelting", "building a base") instead of the raw dispatch name.
    static func narrate(_ skill: String) -> String {
        switch skill {
        case "goto": return "walking"
        case "harvest": return "gathering resources"
        case "mine": return "placing drills"
        case "smelt": return "smelting"
        case "craft": return "crafting"
        case "place", "place_at", "place_inserter": return "building"
        case "feed", "collect", "pickup": return "moving items"
        case "auto_feed", "belt": return "automating"
        case "research", "research_progress": return "starting research"
        case "inspect", "peek", "nearby", "dropcheck", "find", "recipe": return "looking around"
        default: return skill
        }
    }

    @ViewBuilder
    private static func controlButton(_ poller: StatusPoller, _ title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: systemImage).frame(width: 16)
                Text(title).font(.system(size: 12))
                Spacer()
            }
        }
        .buttonStyle(.plain)
        .disabled(poller.busy)
    }
}
