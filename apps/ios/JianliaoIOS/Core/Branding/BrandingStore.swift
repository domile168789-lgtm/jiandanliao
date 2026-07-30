import Foundation

private struct BrandingDTO: Decodable {
  let platformGroup: String?
  let projectName: String
  let logoUrl: String?
  let themeAssetUrl: String?
}

@MainActor
final class BrandingStore: ObservableObject {
  @Published private(set) var projectName: String = "柬聊"
  @Published private(set) var logoURL: URL?
  @Published private(set) var themeAssetURL: URL?
  @Published private(set) var loadError: String?

  func loadMobileBranding() async {
    loadError = nil

    guard let url = Self.mobileBrandingURL() else {
      applyFallback(message: "品牌配置地址无效，已回退到默认品牌。")
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = HTTPMethod.get.rawValue
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.httpStatus(-1, payload: nil)
      }
      guard (200...299).contains(httpResponse.statusCode) else {
        throw APIError.httpStatus(httpResponse.statusCode, payload: nil)
      }

      let branding = try JSONDecoder.api.decode(BrandingDTO.self, from: data)
      projectName = branding.projectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "柬聊" : branding.projectName
      logoURL = Self.normalizeURL(branding.logoUrl)
      themeAssetURL = Self.normalizeURL(branding.themeAssetUrl)
    } catch {
      applyFallback(message: error.localizedDescription)
    }
  }

  private func applyFallback(message: String) {
    projectName = "柬聊"
    logoURL = nil
    themeAssetURL = nil
    loadError = message
  }

  private static func mobileBrandingURL() -> URL? {
    let baseURL = AppConfig.apiBaseURL.appendingPathComponent("public/branding")
    var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
    components?.queryItems = [URLQueryItem(name: "group", value: "mobile")]
    return components?.url
  }

  private static func normalizeURL(_ raw: String?) -> URL? {
    guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines),
          !trimmed.isEmpty else {
      return nil
    }
    return URL(string: trimmed)
  }
}
