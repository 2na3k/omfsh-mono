import XCTest
import SwiftData
@testable import omfsh_taskbar

final class StatsViewModelTests: XCTestCase {
    private var container: ModelContainer!
    private var context: ModelContext!
    private var vm: StatsViewModel!

    override func setUpWithError() throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: ChecklistItem.self, PomodoroSession.self, configurations: config)
        context = ModelContext(container)
        vm = StatsViewModel()
        vm.setup(context)
    }

    override func tearDownWithError() throws {
        container = nil
        context = nil
        vm = nil
    }

    func testInitialStatsAreZero() {
        XCTAssertEqual(vm.currentStreak, 0)
        XCTAssertEqual(vm.totalTasksThisWeek, 0)
        XCTAssertEqual(vm.totalFocusMinutesThisWeek, 0)
    }

    func testYearActivitiesHas365Days() {
        XCTAssertEqual(vm.yearActivities.count, 365)
    }

    func testLast14DaysHas14Entries() {
        XCTAssertEqual(vm.last14DaysTasks.count, 14)
    }

    func testCompletedTasksCountedInThisWeek() throws {
        let item = ChecklistItem(title: "Test task")
        item.isCompleted = true
        context.insert(item)
        try context.save()
        vm.reload()
        XCTAssertEqual(vm.totalTasksThisWeek, 1)
    }

    func testIncompleteTasksNotCounted() throws {
        let item = ChecklistItem(title: "Not done")
        // isCompleted = false by default
        context.insert(item)
        try context.save()
        vm.reload()
        XCTAssertEqual(vm.totalTasksThisWeek, 0)
    }

    func testDayActivityIntensityZeroForNoActivity() {
        let activity = DayActivity(id: Date(), date: Date(), tasksCompleted: 0, pomodorosCompleted: 0)
        XCTAssertEqual(activity.intensity, 0.0, accuracy: 0.001)
    }

    func testDayActivityIntensityClampedAtOne() {
        let activity = DayActivity(id: Date(), date: Date(), tasksCompleted: 100, pomodorosCompleted: 100)
        XCTAssertEqual(activity.intensity, 1.0, accuracy: 0.001)
    }
}
