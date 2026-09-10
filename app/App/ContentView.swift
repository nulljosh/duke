import SwiftUI

struct ContentView: View {
    @StateObject private var poller = Poller()
    @State private var editingHost = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Pwnlingo").font(.headline)
                Spacer()
                Button { editingHost = true } label: { Image(systemName: "gearshape") }
                    .buttonStyle(.plain)
            }
            .padding()

            Spacer()

            if let s = poller.state {
                Text(s.track.capitalized).font(.title2.bold())
                if let xp0 = s.xp0, let xp = s.xp {
                    Text("+\(xp - xp0) XP").font(.largeTitle.monospacedDigit().bold()).foregroundStyle(.green)
                }
                HStack(spacing: 28) {
                    stat("Puzzles", s.puzzles)
                    stat("Misses", s.misses)
                    stat("Matches", s.matches)
                }
                .padding(.top, 12)
                if poller.stale {
                    Label("Stuck — no update in 90s+", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption).foregroundStyle(.red).padding(.top, 8)
                }
            } else if poller.unreachable {
                Label("Can't reach \(poller.host)", systemImage: "wifi.slash").foregroundStyle(.red)
            } else {
                ProgressView()
            }

            Spacer()
        }
        .task { poller.start() }
        .frame(width: 320, height: 260)
        .sheet(isPresented: $editingHost) {
            VStack(spacing: 12) {
                Text("Mac address").font(.headline)
                TextField("host:port", text: $poller.host).textFieldStyle(.roundedBorder)
                Button("Done") { editingHost = false; poller.reload() }
            }
            .padding()
            .frame(width: 260)
        }
    }

    @ViewBuilder private func stat(_ label: String, _ value: Int) -> some View {
        VStack {
            Text("\(value)").font(.title3.monospacedDigit().bold())
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }
}
