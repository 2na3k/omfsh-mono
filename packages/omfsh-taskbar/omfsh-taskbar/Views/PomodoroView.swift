import SwiftUI

struct PomodoroView: View {
    let vm: PomodoroViewModel

    var body: some View {
        VStack(spacing: 0) {
            typePicker
                .padding(.top, 12)

            TimerRingView(progress: vm.progress, displayTime: vm.displayTime, label: vm.currentType.label)
                .padding(.vertical, 20)

            controls
                .padding(.bottom, 16)

            Divider()
            sessionCount
        }
        .frame(height: 380)
    }

    private var typePicker: some View {
        HStack(spacing: 6) {
            ForEach([PomodoroType.work, .shortBreak, .longBreak], id: \.self) { type in
                Button {
                    vm.selectType(type)
                } label: {
                    Text(type.label)
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(
                            vm.currentType == type
                                ? Color.accentColor.opacity(0.15)
                                : Color.clear
                        )
                        .foregroundStyle(vm.currentType == type ? Color.accentColor : Color.secondary)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .disabled(vm.isRunning)
            }
        }
    }

    private var controls: some View {
        HStack(spacing: 20) {
            // Stop
            Button(action: vm.stop) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .disabled(!vm.isRunning && {
                if case .paused = vm.phase { return false }
                return true
            }())

            // Play / Pause
            Button {
                switch vm.phase {
                case .idle:    vm.start()
                case .running: vm.pause()
                case .paused:  vm.resume()
                }
            } label: {
                Image(systemName: playIcon)
                    .font(.system(size: 42, weight: .medium))
                    .foregroundStyle(Color.accentColor)
            }
            .buttonStyle(.plain)

            // Spacer to balance stop button
            Spacer().frame(width: 22)
        }
    }

    private var playIcon: String {
        switch vm.phase {
        case .running: return "pause.circle.fill"
        default:       return "play.circle.fill"
        }
    }

    private var sessionCount: some View {
        HStack {
            Image(systemName: "flame.fill")
                .foregroundStyle(.orange)
                .font(.caption)
            Text("\(vm.completedWorkSessions) sessions today")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}
