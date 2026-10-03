// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "cruise-tui",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/rensbreur/SwiftTUI", branch: "main")
    ],
    targets: [
        .executableTarget(
            name: "cruise-tui",
            dependencies: ["SwiftTUI"],
            path: ".",
            sources: ["tui/main.swift"]
        )
    ]
)
