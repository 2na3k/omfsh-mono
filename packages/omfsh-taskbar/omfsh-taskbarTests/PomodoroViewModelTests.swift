import XCTest
import SwiftData
@testable import omfsh_taskbar

final class PomodoroViewModelTests: XCTestCase {
    private var container: ModelContainer!
    private var context: ModelContext!
    private var vm: PomodoroViewModel!

    override func setUpWithError() throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: ChecklistItem.self, PomodoroSession.self, configurations: config)
        context = ModelContext(container)
        vm = PomodoroViewModel()
        vm.setup(context)
    }

    override func tearDownWithError() throws {
        container = nil
        context = nil
        vm = nil
    }

    func testInitialStateIsIdle() {
        if case .idle = vm.phase {
            // pass
        } else {
            XCTFail("Expected idle state")
        }
    }

    func testStartMovesToRunning() {
        vm.start()
        if case .running = vm.phase {
            // pass
        } else {
            XCTFail("Expected running state after start()")
        }
    }

    func testPauseMovesToPaused() {
        vm.start()
        vm.pause()
        if case .paused = vm.phase {
            // pass
        } else {
            XCTFail("Expected paused state after pause()")
        }
    }

    func testResumeMovesToRunning() {
        vm.start()
        vm.pause()
        vm.resume()
        if case .running = vm.phase {
            // pass
        } else {
            XCTFail("Expected running state after resume()")
        }
    }

    func testStopResetsToIdle() {
        vm.start()
        vm.stop()
        if case .idle = vm.phase {
            // pass
        } else {
            XCTFail("Expected idle state after stop()")
        }
    }

    func testSelectTypeChangesCurrentType() {
        vm.selectType(.shortBreak)
        XCTAssertEqual(vm.currentType, .shortBreak)
        XCTAssertEqual(vm.timeRemaining, PomodoroType.shortBreak.duration)
    }

    func testSelectTypeBlockedWhileRunning() {
        vm.start()
        vm.selectType(.shortBreak)
        // Should remain work since running
        XCTAssertEqual(vm.currentType, .work)
    }

    func testProgressIsZeroAtStart() {
        XCTAssertEqual(vm.progress, 0.0, accuracy: 0.01)
    }

    func testDisplayTimeFormat() {
        // Default is 25:00
        XCTAssertEqual(vm.displayTime, "25:00")
    }
}
