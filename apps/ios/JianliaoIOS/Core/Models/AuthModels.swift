import Foundation

struct UserProfile: Codable, Identifiable {
  let id: String
  let phone: String
  let nickname: String?
}

struct AuthResponse: Codable {
  let accessToken: String
  let refreshToken: String
  let user: UserProfile
}

struct RegisterRequest: Codable {
  let phone: String
  let password: String
  let deviceId: String
  let platform: String
  let nickname: String?
}

struct PasswordLoginRequest: Codable {
  let phone: String
  let password: String
  let deviceId: String
  let platform: String
}

struct RefreshTokenRequest: Codable {
  let phone: String
  let refreshToken: String
  let deviceId: String
}
