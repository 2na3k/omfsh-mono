import SwiftUI

struct ChecklistView: View {
    let vm: ChecklistViewModel
    @State private var newTitle = ""
    @State private var isHighPriority = false

    var body: some View {
        VStack(spacing: 0) {
            addRow
            Divider()
            if vm.items.isEmpty {
                emptyState
            } else {
                itemList
            }
            Divider()
            summaryRow
        }
        .frame(height: 380)
    }

    private var addRow: some View {
        HStack(spacing: 8) {
            TextField("Add task...", text: $newTitle)
                .textFieldStyle(.plain)
                .font(.callout)
                .onSubmit { submit() }

            Button {
                isHighPriority.toggle()
            } label: {
                Image(systemName: isHighPriority ? "exclamationmark.circle.fill" : "exclamationmark.circle")
                    .foregroundStyle(isHighPriority ? .orange : .secondary)
            }
            .buttonStyle(.plain)
            .help("Toggle high priority")

            Button(action: submit) {
                Image(systemName: "plus.circle.fill")
                    .foregroundStyle(newTitle.trimmingCharacters(in: .whitespaces).isEmpty ? Color.secondary : Color.accentColor)
                    .font(.system(size: 18))
            }
            .buttonStyle(.plain)
            .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.trianglebadge.exclamationmark")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
            Text("No tasks today")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .frame(height: 280)
    }

    private var itemList: some View {
        List {
            ForEach(vm.items) { item in
                ChecklistRow(item: item,
                    onToggle: { vm.toggle(item) },
                    onDelete: { vm.delete(item) }
                )
                .listRowInsets(EdgeInsets(top: 2, leading: 8, bottom: 2, trailing: 8))
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
        .frame(height: 280)
    }

    private var summaryRow: some View {
        let done = vm.items.filter(\.isCompleted).count
        let total = vm.items.count
        return HStack {
            Text("\(done) / \(total) completed")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            if done == total && total > 0 {
                Text("All done!")
                    .font(.caption.bold())
                    .foregroundStyle(.green)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    private func submit() {
        vm.add(title: newTitle, priority: isHighPriority ? 1 : 0)
        newTitle = ""
        isHighPriority = false
    }
}

private struct ChecklistRow: View {
    let item: ChecklistItem
    let onToggle: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onToggle) {
                Image(systemName: item.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(item.isCompleted ? .green : .secondary)
            }
            .buttonStyle(.plain)

            if item.priority == 1 {
                Image(systemName: "exclamationmark")
                    .font(.caption.bold())
                    .foregroundStyle(.orange)
            }

            Text(item.title)
                .font(.callout)
                .strikethrough(item.isCompleted)
                .foregroundStyle(item.isCompleted ? .secondary : .primary)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button(action: onDelete) {
                Image(systemName: "xmark")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .opacity(0.5)
        }
        .padding(.vertical, 3)
        .contentShape(Rectangle())
    }
}
