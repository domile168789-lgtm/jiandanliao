import Foundation

final class APIClient {
  let baseURL: URL
  private let session: URLSession
  private let authProvider: AuthProviding?

  init(baseURL: URL = AppConfig.apiBaseURL, session: URLSession = .shared, authProvider: AuthProviding? = nil) {
    self.baseURL = baseURL
    self.session = session
    self.authProvider = authProvider
  }

  func request<T: Decodable>(
    _ path: String,
    method: HTTPMethod,
    body: (any Encodable)? = nil,
    headers: [String: String] = [:]
  ) async throws -> T {
    guard let url = resolvedURL(for: path) else {
      throw APIError.invalidURL
    }
    var req = URLRequest(url: url)
    req.httpMethod = method.rawValue
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = authProvider?.accessToken {
      req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }

    if let body {
      req.httpBody = try JSONEncoder.api.encode(AnyEncodable(body))
    }

    do {
      let (data, resp) = try await session.data(for: req)
      guard let http = resp as? HTTPURLResponse else {
        throw APIError.httpStatus(-1, payload: nil)
      }

      if !(200...299).contains(http.statusCode) {
        let payload = try? JSONDecoder.api.decode(APIErrorPayload.self, from: data)
        throw APIError.httpStatus(http.statusCode, payload: payload)
      }

      do {
        return try JSONDecoder.api.decode(T.self, from: data)
      } catch {
        throw APIError.decode(error)
      }
    } catch let err as APIError {
      throw err
    } catch {
      throw APIError.transport(error)
    }
  }

  /// 文件上传：后端返回 uploadUrl（minio endpoint + objectKey），这里采用 PUT 直传。
  func upload(to uploadURL: URL, data: Data, contentType: String) async throws {
    var req = URLRequest(url: uploadURL)
    req.httpMethod = HTTPMethod.put.rawValue
    req.setValue(contentType, forHTTPHeaderField: "Content-Type")

    do {
      let (_, resp) = try await session.upload(for: req, from: data)
      guard let http = resp as? HTTPURLResponse else { throw APIError.httpStatus(-1, payload: nil) }
      if !(200...299).contains(http.statusCode) {
        throw APIError.httpStatus(http.statusCode, payload: nil)
      }
    } catch let err as APIError {
      throw err
    } catch {
      throw APIError.transport(error)
    }
  }

  private func resolvedURL(for path: String) -> URL? {
    let raw = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
    let split = raw.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
    let pathPart = String(split.first ?? "")
    let basePath = components?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
    components?.path = "/" + [basePath, pathPart]
      .filter { !$0.isEmpty }
      .joined(separator: "/")
    if split.count > 1 {
      components?.percentEncodedQuery = String(split[1])
    }
    return components?.url
  }
}

// MARK: - Codable helpers

private struct AnyEncodable: Encodable {
  private let encodeFunc: (Encoder) throws -> Void
  init(_ wrapped: any Encodable) { self.encodeFunc = wrapped.encode }
  func encode(to encoder: Encoder) throws { try encodeFunc(encoder) }
}

extension JSONEncoder {
  static let api: JSONEncoder = {
    let enc = JSONEncoder()
    enc.dateEncodingStrategy = .iso8601
    return enc
  }()
}

extension JSONDecoder {
  static let api: JSONDecoder = {
    let dec = JSONDecoder()
    dec.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let raw = try container.decode(String.self)

      // 服务端 createdAt 可能是 ISO8601 或 JS Date.toISOString
      let iso = ISO8601DateFormatter()
      if let d = iso.date(from: raw) { return d }

      // 兼容毫秒精度 ISO（如果未来加小数位）
      let f = DateFormatter()
      f.locale = Locale(identifier: "en_US_POSIX")
      f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX"
      if let d = f.date(from: raw) { return d }

      throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date: \(raw)")
    }
    return dec
  }()
}
