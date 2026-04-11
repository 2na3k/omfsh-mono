import Foundation
import SwiftData
import UserNotifications
import Observation

enum PomodoroType: String {
    case work = "work"
    case shortBreak = "break"
    case longBreak = "long_break"

    var duration: TimeInterval {
        switch self {
        case .work:       return 25 * 60
        case .shortBreak: return 5 * 60
        case .longBreak:  return 15 * 60
        }
    }

    var label: String {
        switch self {
        case .work:       return "Focus"
        case .shortBreak: return "Short Break"
        case .longBreak:  return "Long Break"
        }
    }
}

enum PomodoroPhase {
    case idle
    case running(endDate: Date, type: PomodoroType)
    case paused(remaining: TimeInterval, type: PomodoroType)
}

@Observable
final class PomodoroViewModel {
    var phase: PomodoroPhase = .idle
    var timeRemaining: TimeInterval = PomodoroType.work.duration
    var completedWorkSessions: Int = 0
    var currentType: PomodoroType = .work

    private var timer: Timer?
    private var modelContext: ModelContext?
    private var activeSession: PomodoroSession?

    func setup(_ context: ModelContext) {
        guard modelContext == nil else { return }
        modelContext = context
    }

    var isRunning: Bool {
        if case .running = phase { return true }
        return false
    }

    var progress: Double {
        max(0, min(1, 1 - timeRemaining / currentType.duration))
    }

    var displayTime: String {
        let m = Int(timeRemaining) / 60
        let s = Int(timeRemaining) % 60
        return String(format: "%02d:%02d", m, s)
    }

    func start() {
        let end = Date().addingTimeInterval(timeRemaining)
        phase = .running(endDate: end, type: currentType)

        if let ctx = modelContext {
            let session = PomodoroSession(sessionType: currentType.rawValue)
            ctx.insert(session)
            try? ctx.save()
            activeSession = session
        }

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func pause() {
        guard case .running(_, let type) = phase else { return }
        timer?.invalidate()
        timer = nil
        phase = .paused(remaining: timeRemaining, type: type)
    }

    func resume() {
        guard case .paused(_, let type) = phase else { return }
        currentType = type
        start()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        activeSession?.endedAt = Date()
        activeSession?.completed = false
        try? modelContext?.save()
        activeSession = nil
        phase = .idle
        timeRemaining = currentType.duration
    }

    func selectType(_ type: PomodoroType) {
        guard !isRunning else { return }
        currentType = type
        timeRemaining = type.duration
        phase = .idle
    }

    private func tick() {
        guard case .running(let endDate, let type) = phase else { return }
        timeRemaining = max(0, endDate.timeIntervalSinceNow)
        if timeRemaining <= 0 {
            complete(type: type)
        }
    }

    private func complete(type: PomodoroType) {
        timer?.invalidate()
        timer = nil

        activeSession?.endedAt = Date()
        activeSession?.completed = true
        try? modelContext?.save()
        activeSession = nil

        if type == .work {
            completedWorkSessions += 1
        }

        notify(for: type)

        // auto-select next session type
        if type == .work {
            currentType = completedWorkSessions % 4 == 0 ? .longBreak : .shortBreak
        } else {
            currentType = .work
        }
        timeRemaining = currentType.duration
        phase = .idle
    }

    private func notify(for completedType: PomodoroType) {
        let content = UNMutableNotificationContent()
        content.title = completedType == .work ? "Focus done! Time for a break." : "Break over. Back to it."
        content.sound = .default
        let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req)
    }

    deinit {
        timer?.invalidate()
    }
}
