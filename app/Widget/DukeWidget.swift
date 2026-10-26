import WidgetKit
import SwiftUI

// ponytail: the widget is its own process, so it cannot reach the app's Poller.
// It does the one fetch it needs in the timeline provider and nothing else —
// no shared container, no app group, no background refresh plumbing. Reads are
// unauthenticated on the runner, which is exactly what makes this three lines.
private struct Entry: TimelineEntry {
    let date: Date
    let state: RunState?
}

private struct Provider: TimelineProvider {
    // Read straight out of the same defaults the app writes, so pointing the app
    // at a new host or tunnel moves the widget too.
    private var host: String {
        UserDefaults.standard.string(forKey: "cruiseHost") ?? "localhost:8737"
    }

    func placeholder(in context: Context) -> Entry { Entry(date: .now, state: nil) }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        Task { completion(Entry(date: .now, state: await fetch())) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        Task {
            let entry = Entry(date: .now, state: await fetch())
            // WidgetKit will not honour anything much tighter than this anyway.
            completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(300))))
        }
    }

    private func fetch() async -> RunState? {
        guard let url = URL(string: "http://\(host)/state") else { return nil }
        guard let (data, _) = try? await URLSession.shared.data(from: url) else { return nil }
        return try? JSONDecoder().decode(RunState.self, from: data)
    }
}

private struct DukeWidgetView: View {
    var entry: Entry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        if let s = entry.state {
            VStack(alignment: .leading, spacing: 2) {
                Text(trackNames[s.track] ?? s.track.capitalized)
                    .font(.caption).foregroundStyle(.secondary)

                if let xp0 = s.xp0, let xp = s.xp {
                    Text("+\(xp - xp0)")
                        .font(.system(.title, design: .rounded).bold())
                        .foregroundStyle(.green)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    Text("XP this session").font(.caption2).foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                if s.paused == true {
                    Label("Paused", systemImage: "pause.fill")
                        .font(.caption2).foregroundStyle(.orange)
                } else if family != .systemSmall {
                    Text("\(s.track == "chess" ? s.puzzles : s.lessons) \(s.track == "chess" ? "puzzles" : "lessons") · \(s.streak ?? 0) day streak")
                        .font(.caption2).foregroundStyle(.secondary)
                } else if let streak = s.streak {
                    Label("\(streak)", systemImage: "flame.fill")
                        .font(.caption2).foregroundStyle(.orange)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Label("Offline", systemImage: "wifi.slash")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

@main
struct DukeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DukeWidget", provider: Provider()) { entry in
            DukeWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Duke")
        .description("XP earned this session, and whether the runner is still going.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
