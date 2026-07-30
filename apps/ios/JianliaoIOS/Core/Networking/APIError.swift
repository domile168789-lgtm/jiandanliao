import Foundation

/// phase1-backend 统一错误语义：{ code: "UNAUTHORIZED" | ... }
struct APIErrorPayload: Codable {
  let code: String
}

enum APIError: Error, LocalizedError {
  case invalidURL
  case httpStatus(Int, payload: APIErrorPayload?)
  case decode(Error)
  case transport(Error)

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "无效的 URL"
    case let .httpStatus(status, payload):
      if let code = payload?.code {
        return "请求失败：HTTP \(status) / \(code)"
      }
      return "请求失败：HTTP \(status)"
    case let .decode(err):
      return "解析响应失败：\(err.localizedDescription)"
    case let .transport(err):
      return "网络错误：\(err.localizedDescription)"
    }
  }
}

