import Foundation
import SwiftData
import Observation

@Observable
final class ChecklistViewModel {
    private(set) var items: [ChecklistItem] = []
    private var modelContext: ModelContext?

    func setup(_ context: ModelContext) {
        guard modelContext == nil else { return }
        modelContext = context
        reload()
    }

    func reload() {
        guard let ctx = modelContext else { return }
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        let end = cal.date(byAdding: .day, value: 1, to: start)!
        let desc = FetchDescriptor<ChecklistItem>(
            predicate: #Predicate { $0.createdAt >= start && $0.createdAt < end },
            sortBy: [
                SortDescriptor(\.priority, order: .reverse),
                SortDescriptor(\.createdAt)
            ]
        )
        items = (try? ctx.fetch(desc)) ?? []
    }

    func add(title: String, priority: Int = 0) {
        guard let ctx = modelContext,
              !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        ctx.insert(ChecklistItem(title: title, priority: priority))
        try? ctx.save()
        reload()
    }

    func toggle(_ item: ChecklistItem) {
        item.isCompleted.toggle()
        try? modelContext?.save()
        reload()
    }

    func delete(_ item: ChecklistItem) {
        modelContext?.delete(item)
        try? modelContext?.save()
        reload()
    }
}
