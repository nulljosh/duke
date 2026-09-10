import SwiftUI

// ponytail: AsyncImage takes a URL and nothing else, so it can't send the
// X-Pwnlingo-Token header /screenshot now requires. Putting the token in the
// query string instead would have been one line, but URLs get logged (by the
// Cloudflare Tunnel among others) and that's the whole thing we're avoiding.
// So: a small loader that reloads whenever `url` changes, same as AsyncImage.
struct AuthedImage: View {
    let url: URL?
    let token: String

    @State private var image: PlatformImage?

    var body: some View {
        Group {
            if let image {
                Image(platformImage: image).resizable().aspectRatio(contentMode: .fit)
            } else {
                Color.clear
            }
        }
        .task(id: url) { await load() }
    }

    private func load() async {
        guard let url else { return }
        var req = URLRequest(url: url)
        req.setValue(token, forHTTPHeaderField: "X-Pwnlingo-Token")
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let decoded = PlatformImage(data: data) else { return }
        image = decoded
    }
}

#if os(macOS)
typealias PlatformImage = NSImage
#else
typealias PlatformImage = UIImage
#endif

extension Image {
    init(platformImage: PlatformImage) {
        #if os(macOS)
        self.init(nsImage: platformImage)
        #else
        self.init(uiImage: platformImage)
        #endif
    }
}
