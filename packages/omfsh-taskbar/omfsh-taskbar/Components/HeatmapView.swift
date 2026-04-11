import SwiftUI

struct HeatmapView: View {
    let activities: [DayActivity]

    // 52 columns (weeks) × 7 rows (days)
    private let columns = Array(repeating: GridItem(.fixed(9), spacing: 2), count: 52)
    private let cellSize: CGFloat = 9

    var body: some View {
        LazyVGrid(columns: columns, spacing: 2) {
            ForEach(activities) { day in
                RoundedRectangle(cornerRadius: 2)
                    .fill(cellColor(for: day))
                    .frame(width: cellSize, height: cellSize)
                    .help(tooltip(for: day))
            }
        }
    }

    private func cellColor(for day: DayActivity) -> Color {
        if day.intensity == 0 {
            return Color.secondary.opacity(0.12)
        }
        // green gradient: lighter → darker with intensity
        return Color.green.opacity(0.25 + day.intensity * 0.75)
    }

    private func tooltip(for day: DayActivity) -> String {
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        let dateStr = fmt.string(from: day.date)
        if day.tasksCompleted == 0 && day.pomodorosCompleted == 0 {
            return "\(dateStr): no activity"
        }
        return "\(dateStr): \(day.tasksCompleted) tasks, \(day.pomodorosCompleted) pomodoros"
    }
}
