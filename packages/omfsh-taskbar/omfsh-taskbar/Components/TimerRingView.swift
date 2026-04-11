import SwiftUI

struct TimerRingView: View {
    let progress: Double   // 0.0 → 1.0
    let displayTime: String
    let label: String

    private let ringSize: CGFloat = 140
    private let lineWidth: CGFloat = 10

    var body: some View {
        ZStack {
            // Track
            Circle()
                .stroke(Color.secondary.opacity(0.15), lineWidth: lineWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    AngularGradient(
                        colors: [Color.accentColor.opacity(0.6), Color.accentColor],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.linear(duration: 1), value: progress)

            // Center text
            VStack(spacing: 2) {
                Text(displayTime)
                    .font(.system(size: 32, weight: .semibold, design: .monospaced))
                    .monospacedDigit()
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: ringSize, height: ringSize)
    }
}
