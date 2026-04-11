import SwiftUI
import Charts

struct StatsView: View {
    let vm: StatsViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                metricCards
                heatmapSection
                barChartSection
            }
            .padding(12)
        }
        .frame(height: 380)
        .onAppear { vm.reload() }
    }

    private var metricCards: some View {
        HStack(spacing: 8) {
            StatCardView(
                icon: "flame.fill",
                iconColor: .orange,
                value: "\(vm.currentStreak)",
                label: "Day Streak"
            )
            StatCardView(
                icon: "checkmark.circle.fill",
                iconColor: .green,
                value: "\(vm.totalTasksThisWeek)",
                label: "Tasks This Wk"
            )
            StatCardView(
                icon: "timer",
                iconColor: .accentColor,
                value: "\(vm.totalFocusMinutesThisWeek)m",
                label: "Focus This Wk"
            )
        }
    }

    private var heatmapSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Activity — Last 52 Weeks")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            HeatmapView(activities: vm.yearActivities)
        }
    }

    private var barChartSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tasks Completed — Last 14 Days")
                .font(.caption.bold())
                .foregroundStyle(.secondary)

            Chart(vm.last14DaysTasks, id: \.date) { entry in
                BarMark(
                    x: .value("Day", entry.date, unit: .day),
                    y: .value("Tasks", entry.count)
                )
                .foregroundStyle(Color.accentColor.gradient)
                .cornerRadius(3)
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: 2)) { value in
                    AxisValueLabel(format: .dateTime.day(), centered: true)
                        .font(.caption2)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 3))
            }
            .frame(height: 80)
        }
    }
}
