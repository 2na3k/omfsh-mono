import SwiftUI

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var selection: Panel = .checklist
    @State private var checklistVM = ChecklistViewModel()
    @State private var pomodoroVM = PomodoroViewModel()
    @State private var statsVM = StatsViewModel()

    enum Panel: String, CaseIterable {
        case checklist = "Checklist"
        case pomodoro  = "Pomodoro"
        case stats     = "Stats"

        var icon: String {
            switch self {
            case .checklist: return "checklist"
            case .pomodoro:  return "timer"
            case .stats:     return "chart.bar.fill"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            tabBar
            Divider()
            content
        }
        .frame(width: 340)
        .onAppear {
            checklistVM.setup(modelContext)
            pomodoroVM.setup(modelContext)
            statsVM.setup(modelContext)
        }
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(Panel.allCases, id: \.self) { panel in
                Button { selection = panel } label: {
                    VStack(spacing: 3) {
                        Image(systemName: panel.icon)
                            .font(.system(size: 13, weight: .medium))
                        Text(panel.rawValue)
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(selection == panel
                        ? Color.accentColor.opacity(0.12)
                        : Color.clear)
                    .foregroundStyle(selection == panel ? Color.accentColor : Color.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 4)
    }

    // Keep all three views alive so tab switches are instant — no rebuild, no .onAppear re-fire
    private var content: some View {
        ZStack {
            ChecklistView(vm: checklistVM).opacity(selection == .checklist ? 1 : 0)
            PomodoroView(vm: pomodoroVM).opacity(selection == .pomodoro ? 1 : 0)
            StatsView(vm: statsVM).opacity(selection == .stats ? 1 : 0)
        }
    }
}
