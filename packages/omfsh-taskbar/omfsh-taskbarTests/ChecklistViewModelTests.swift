import XCTest
import SwiftData
@testable import omfsh_taskbar

final class ChecklistViewModelTests: XCTestCase {
    private var container: ModelContainer!
    private var context: ModelContext!
    private var vm: ChecklistViewModel!

    override func setUpWithError() throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: ChecklistItem.self, PomodoroSession.self, configurations: config)
        context = ModelContext(container)
        vm = ChecklistViewModel()
        vm.setup(context)
    }

    override func tearDownWithError() throws {
        container = nil
        context = nil
        vm = nil
    }

    func testAddItemAppearsInItems() {
        vm.add(title: "Write tests")
        XCTAssertEqual(vm.items.count, 1)
        XCTAssertEqual(vm.items[0].title, "Write tests")
        XCTAssertFalse(vm.items[0].isCompleted)
    }

    func testAddEmptyTitleIsIgnored() {
        vm.add(title: "   ")
        XCTAssertTrue(vm.items.isEmpty)
    }

    func testToggleItemCompletes() {
        vm.add(title: "Do something")
        let item = vm.items[0]
        vm.toggle(item)
        XCTAssertTrue(vm.items[0].isCompleted)
    }

    func testToggleItemUnCompletes() {
        vm.add(title: "Do something")
        let item = vm.items[0]
        vm.toggle(item) // complete
        vm.toggle(item) // uncomplete
        XCTAssertFalse(vm.items[0].isCompleted)
    }

    func testDeleteRemovesItem() {
        vm.add(title: "Delete me")
        let item = vm.items[0]
        vm.delete(item)
        XCTAssertTrue(vm.items.isEmpty)
    }

    func testHighPriorityItemsSortFirst() {
        vm.add(title: "Normal task", priority: 0)
        vm.add(title: "Urgent task", priority: 1)
        XCTAssertEqual(vm.items[0].title, "Urgent task")
        XCTAssertEqual(vm.items[1].title, "Normal task")
    }
}
