import SwiftUI

enum StateTone {
  case info
  case warning
  case error

  var tint: Color {
    switch self {
    case .info:
      return .indigo
    case .warning:
      return .orange
    case .error:
      return .red
    }
  }

  var symbol: String {
    switch self {
    case .info:
      return "info.circle"
    case .warning:
      return "exclamationmark.triangle"
    case .error:
      return "xmark.octagon"
    }
  }
}

struct SourceBadge: View {
  let isLive: Bool

  var body: some View {
    Text(isLive ? "实时数据" : "演示兜底")
      .font(.caption.weight(.semibold))
      .foregroundStyle(isLive ? Color.green : Color.orange)
      .padding(.horizontal, 8)
      .padding(.vertical, 4)
      .background((isLive ? Color.green : Color.orange).opacity(0.12))
      .clipShape(Capsule())
  }
}

struct StatusBanner: View {
  let tone: StateTone
  let title: String
  let message: String
  var actionTitle: String? = nil
  var action: (() -> Void)? = nil

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Label(title, systemImage: tone.symbol)
        .font(.headline)
        .foregroundStyle(tone.tint)

      Text(message)
        .font(.footnote)
        .foregroundStyle(.secondary)

      if let actionTitle, let action {
        Button(actionTitle, action: action)
          .buttonStyle(.borderedProminent)
          .tint(tone.tint)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
    .background(tone.tint.opacity(0.08))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
  }
}

struct EmptyStateCard: View {
  let icon: String
  let title: String
  let message: String
  var actionTitle: String? = nil
  var action: (() -> Void)? = nil

  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 28, weight: .semibold))
        .foregroundStyle(.secondary)

      Text(title)
        .font(.headline)

      Text(message)
        .font(.footnote)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      if let actionTitle, let action {
        Button(actionTitle, action: action)
          .buttonStyle(.bordered)
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 24)
  }
}
