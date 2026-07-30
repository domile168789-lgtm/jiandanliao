import Foundation

/// 运行期可配置的服务地址（默认对齐本地主线统一入口）。
/// - iOS Simulator 访问宿主机：通常可用 http://127.0.0.1
/// - 真机调试：改成宿主机在局域网的 IP（例如 http://192.168.1.10）
enum AppConfig {
  private enum Keys {
    static let apiBaseURL = "AppConfig.apiBaseURL"
    static let wsBaseURL = "AppConfig.wsBaseURL"
  }

  static let projectName = "柬聊"
  static let supportEmail = "support@jianliao.local"
  static let supportHotline = "+855 23 600 0000"
  static let walletCurrencyCode = "USD"
  static let walletSettlementRule = "每日 18:00 结算，超时订单顺延到下一次结算窗口。"
  static let securityAdvice = "如发现账号被限制、设备异常登录或陌生资金变动，请立即联系管理员复核。"

  static var defaultAPIBaseURL: URL { URL(string: "http://127.0.0.1/api")! }
  /// Socket.IO base URL，path 在 WSClient 内固定为 /socket.io/
  static var defaultWSBaseURL: URL { URL(string: "http://127.0.0.1")! }


  static var apiBaseURL: URL {
    get {
      if let raw = UserDefaults.standard.string(forKey: Keys.apiBaseURL),
         let url = URL(string: raw) {
        return url
      }
      return defaultAPIBaseURL
    }
    set { UserDefaults.standard.set(newValue.absoluteString, forKey: Keys.apiBaseURL) }
  }

  static var wsBaseURL: URL {
    get {
      if let raw = UserDefaults.standard.string(forKey: Keys.wsBaseURL),
         let url = URL(string: raw) {
        return url
      }
      return defaultWSBaseURL
    }
    set { UserDefaults.standard.set(newValue.absoluteString, forKey: Keys.wsBaseURL) }
  }
}
