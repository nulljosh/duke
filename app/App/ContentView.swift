import SwiftUI

let tracks = ["es", "el", "math", "chess", "music"]
let trackNames = ["es": "Spanish", "el": "Greek", "math": "Math", "chess": "Chess", "music": "Music"]

struct ContentView: View {
    @ObservedObject private var poller = Poller.shared
    #if !os(macOS)
    @State private var editingHost = false
    #endif

    var body: some View {
        VStack(spacing: 14) {
            if let s = poller.state {
                // ponytail: cache-bust with s.at (already ticks every poll) instead of a second timer
                AsyncImage(url: URL(string: "http://\(poller.host)/screenshot?t=\(s.at)")) { img in
                    img.resizable().aspectRatio(contentMode: .fit)
                } placeholder: { Color.black.opacity(0.05) }
                    .frame(width: 240, height: 154)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                Text(trackNames[s.track] ?? s.track.capitalized).font(.title2.bold())
                if let xp0 = s.xp0, let xp = s.xp {
                    Text("+\(xp - xp0) XP").font(.largeTitle.monospacedDigit().bold()).foregroundStyle(.green)
                }
                HStack(spacing: 28) {
                    if s.track == "chess" {
                        stat("Puzzles", s.puzzles)
                        stat("Misses", s.misses, tint: s.misses > 0 ? .red : nil)
                        stat("Matches", s.matches)
                    } else {
                        stat("Lessons", s.lessons)
                    }
                }
                Group {
                    if poller.stale {
                        Label("Stuck — no update in 90s+", systemImage: "exclamationmark.triangle.fill")
                            .font(.caption).foregroundStyle(.red)
                    } else if let last = poller.events.first {
                        Text(last.summary).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                .frame(height: 14)
            } else if poller.unreachable {
                Label("Can't reach \(poller.host)", systemImage: "wifi.slash").foregroundStyle(.red)
            } else {
                ProgressView()
            }
        }
        .padding(.top, 8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        #if !os(macOS)
        .overlay(alignment: .topTrailing) {
            Button { editingHost = true } label: { Image(systemName: "gearshape") }
                .buttonStyle(.plain)
                .padding(14)
        }
        #endif
        .task { poller.start() }
        .frame(width: 320, height: 420)
        #if !os(macOS)
        .sheet(isPresented: $editingHost) {
            VStack(spacing: 12) {
                Text("Mac address").font(.headline)
                TextField("host:port", text: $poller.host).textFieldStyle(.roundedBorder)
                Button("Done") { editingHost = false; poller.reload() }
            }
            .padding()
            .frame(width: 260)
        }
        #endif
    }

    @ViewBuilder private func stat(_ label: String, _ value: Int, tint: Color? = nil) -> some View {
        VStack {
            Text("\(value)").font(.title3.monospacedDigit().bold()).foregroundStyle(tint ?? .primary)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }
}
