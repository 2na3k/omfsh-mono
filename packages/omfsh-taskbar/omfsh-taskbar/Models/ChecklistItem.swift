import Foundation
import SwiftData

@Model
final class ChecklistItem {
    var id: UUID
    var title: String
    var isCompleted: Bool
    var createdAt: Date
    var priority: Int // 0 = normal, 1 = high

    init(title: String, priority: Int = 0) {
        id = UUID()
        self.title = title
        isCompleted = false
        createdAt = Date()
        self.priority = priority
    }
}
