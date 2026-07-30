import Foundation
import Security

/// 极简 Keychain 封装：仅用于保存 accessToken / refreshToken / phone。
enum Keychain {
  enum Key: String {
    case accessToken = "jianliao.accessToken"
    case refreshToken = "jianliao.refreshToken"
    case phone = "jianliao.phone"
    case userId = "jianliao.userId"
  }

  static func set(_ value: String, for key: Key) throws {
    let data = Data(value.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key.rawValue,
      kSecValueData as String: data
    ]

    SecItemDelete(query as CFDictionary)
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
      throw NSError(domain: "Keychain", code: Int(status))
    }
  }

  static func get(_ key: Key) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key.rawValue,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess, let data = item as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func delete(_ key: Key) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key.rawValue
    ]
    SecItemDelete(query as CFDictionary)
  }
}

