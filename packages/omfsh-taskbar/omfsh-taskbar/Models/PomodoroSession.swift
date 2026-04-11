import Foundation
import SwiftData

@Model
final class PomodoroSession {
    var id: UUID
    var startedAt: Date
    var endedAt: Date?
    var sessionType: String // "work" | "break"
    var completed: Bool

    init(sessionType: String) {
        id = UUID()
        self.sessionType = sessionType
        startedAt = Date()
        endedAt = nil
        completed = false
    }

    var durationMinutes: Int {
        let end = endedAt ?? Date()
        return Int(end.timeIntervalSince(startedAt) / 60)
    }
}
