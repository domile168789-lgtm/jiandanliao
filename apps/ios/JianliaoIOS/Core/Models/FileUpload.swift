import Foundation

struct FileUploadRequest: Codable {
  let filename: String
  let mimeType: String
  let size: Int
}

struct FileUploadResponse: Codable {
  let fileId: String
  let objectKey: String
  let uploadUrl: String

  var publicURL: String {
    let base = AppConfig.apiBaseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    return "\(base)/files/\(fileId)/content"
  }
}
