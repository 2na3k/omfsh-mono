import SwiftUI
import SwiftData
import UserNotifications

@main
struct OmfshTaskbarApp: App {
    private let modelContainer: ModelContainer

    init() {
        let config = ModelConfiguration(url: Self.storeURL())
        do {
            modelContainer = try ModelContainer(
                for: ChecklistItem.self, PomodoroSession.self,
                configurations: config
            )
        } catch {
            // shit, the store blew up
            fatalError("SwiftData init failed: \(error)")
        }
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    var body: some Scene {
        MenuBarExtra("omfsh-taskbar", systemImage: "checkmark.circle") {
            RootView()
                .modelContainer(modelContainer)
        }
        .menuBarExtraStyle(.window)
    }

    private static func storeURL() -> URL {
        let dir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".omfsh-taskbar")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("data.sqlite")
    }
}
