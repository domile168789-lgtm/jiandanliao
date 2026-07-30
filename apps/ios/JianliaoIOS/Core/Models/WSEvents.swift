import Foundation

/// Socket.IO 下行事件：message:new / receipt:new
struct WSMessageNewPayload: Codable {
  let id: String
  let conversationId: String
  let senderId: String
  let type: MessageType
  let body: MessageBody
  let status: MessageStatus?
  let createdAt: Date?
}

struct WSReceiptNewPayload: Codable {
  let messageId: String
  let userId: String
  let type: ReceiptType
  let createdAt: Date?
}

