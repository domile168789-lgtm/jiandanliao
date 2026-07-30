import Foundation
import Combine
import SocketIO

@MainActor
final class WSClient: ObservableObject {
  @Published private(set) var isConnected: Bool = false

  let messageNew = PassthroughSubject<WSMessageNewPayload, Never>()
  let receiptNew = PassthroughSubject<WSReceiptNewPayload, Never>()

  private var manager: SocketManager?
  private var socket: SocketIOClient?
  private var currentUserId: String?

  func connect(userId: String) {
    // 避免重复连接
    if currentUserId == userId, isConnected { return }

    currentUserId = userId

    let mgr = SocketManager(
      socketURL: AppConfig.wsBaseURL,
      config: [
        .path("/socket.io/"),
        .log(false),
        .compress,
        .reconnects(true),
        .reconnectAttempts(-1),
        .reconnectWait(2)
      ]
    )
    manager = mgr
    let sock = mgr.defaultSocket
    socket = sock

    sock.on(clientEvent: .connect) { [weak self] _, _ in
      guard let self else { return }
      self.isConnected = true
      self.socket?.emit("auth:authenticate", ["userId": userId])
    }

    sock.on(clientEvent: .disconnect) { [weak self] _, _ in
      self?.isConnected = false
    }

    sock.on("message:new") { [weak self] data, _ in
      guard let self else { return }
      if let payload: WSMessageNewPayload = self.decodeFirst(data) {
        self.messageNew.send(payload)
      }
    }

    sock.on("receipt:new") { [weak self] data, _ in
      guard let self else { return }
      if let payload: WSReceiptNewPayload = self.decodeFirst(data) {
        self.receiptNew.send(payload)
      }
    }

    sock.connect()
  }

  func disconnect() {
    socket?.disconnect()
    socket = nil
    manager = nil
    currentUserId = nil
    isConnected = false
  }

  func joinConversation(_ conversationId: String) {
    socket?.emit("conversation:join", ["conversationId": conversationId])
  }

  private func decodeFirst<T: Decodable>(_ data: [Any]) -> T? {
    guard let first = data.first else { return nil }
    guard JSONSerialization.isValidJSONObject(first),
          let raw = try? JSONSerialization.data(withJSONObject: first),
          let parsed = try? JSONDecoder.api.decode(T.self, from: raw) else {
      return nil
    }
    return parsed
  }
}

