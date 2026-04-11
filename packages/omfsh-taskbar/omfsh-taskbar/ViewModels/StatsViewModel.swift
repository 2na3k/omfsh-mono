import Foundation
import SwiftData
import Observation

struct DayActivity: Identifiable {
    let id: Date
    let date: Date
    let tasksCompleted: Int
    let pomodorosCompleted: Int

    var intensity: Double {
        let total = tasksCompleted + pomodorosCompleted
        // soft cap at 8 — beyond that it's max color
        return min(1.0, Double(total) / 8.0)
    }
}

@Observable
final class StatsViewModel {
    var yearActivities: [DayActivity] = []
    var last14DaysTasks: [(date: Date, count: Int)] = []
    var currentStreak: Int = 0
    var totalTasksThisWeek: Int = 0
    var totalFocusMinutesThisWeek: Int = 0

    private var modelContext: ModelContext?

    func setup(_ context: ModelContext) {
        guard modelContext == nil else { return }
        modelContext = context
        reload()
    }

    func reload() {
        guard let ctx = modelContext else { return }
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let rangeStart = cal.date(byAdding: .day, value: -364, to: today)!

        let checklistDesc = FetchDescriptor<ChecklistItem>(
            predicate: #Predicate { $0.isCompleted && $0.createdAt >= rangeStart }
        )
        let checklist = (try? ctx.fetch(checklistDesc)) ?? []

        let pomodoroDesc = FetchDescriptor<PomodoroSession>(
            predicate: #Predicate { $0.completed && $0.sessionType == "work" && $0.startedAt >= rangeStart }
        )
        let pomodoros = (try? ctx.fetch(pomodoroDesc)) ?? []

        var tasksByDay: [Date: Int] = [:]
        for item in checklist {
            let day = cal.startOfDay(for: item.createdAt)
            tasksByDay[day, default: 0] += 1
        }

        var pomsByDay: [Date: Int] = [:]
        for session in pomodoros {
            let day = cal.startOfDay(for: session.startedAt)
            pomsByDay[day, default: 0] += 1
        }

        // 365-day heatmap
        yearActivities = (0..<365).map { i in
            let day = cal.date(byAdding: .day, value: i, to: rangeStart)!
            return DayActivity(
                id: day,
                date: day,
                tasksCompleted: tasksByDay[day] ?? 0,
                pomodorosCompleted: pomsByDay[day] ?? 0
            )
        }

        // last 14 days for bar chart
        last14DaysTasks = (0..<14).map { i in
            let day = cal.date(byAdding: .day, value: -13 + i, to: today)!
            return (date: day, count: tasksByDay[day] ?? 0)
        }

        // streak
        var streak = 0
        var day = today
        while true {
            let active = (tasksByDay[day] ?? 0) + (pomsByDay[day] ?? 0)
            if active == 0 { break }
            streak += 1
            day = cal.date(byAdding: .day, value: -1, to: day)!
        }
        currentStreak = streak

        // this week totals
        let weekStart = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today))!
        totalTasksThisWeek = checklist.filter { cal.startOfDay(for: $0.createdAt) >= weekStart }.count
        totalFocusMinutesThisWeek = pomodoros
            .filter { cal.startOfDay(for: $0.startedAt) >= weekStart }
            .reduce(0) { $0 + $1.durationMinutes }
    }
}
