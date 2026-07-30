import Foundation

enum MessageType: String, Codable, CaseIterable {
  case text = "TEXT"
  case image = "IMAGE"
  case file = "FILE"
  case audio = "AUDIO"
  case video = "VIDEO"
}

enum MessageStatus: String, Codable {
  case sent = "SENT"
}

/// phase1-backend 对消息 body 未强约束（Record<string, any>），这里先用可选字段兜底。
struct MessageBody: Codable, Hashable {
  var text: String?

  // IMAGE / FILE 元数据（客户端自定义字段，服务端会原样存储）
  var fileId: String?
  var objectKey: String?
  var url: String?
  var filename: String?
  var mimeType: String?
  var size: Int?
  var width: Int?
  var height: Int?
}

struct Message: Codable, Identifiable, Hashable {
  let id: String
  let conversationId: String
  let senderId: String?
  let type: MessageType
  let status: MessageStatus?
  let body: MessageBody
  let createdAt: Date?
}

struct SendMessageRequest: Codable {
  let conversationId: String
  let type: MessageType
  let body: MessageBody
}

struct CreateReceiptRequest: Codable {
  let type: ReceiptType
}

enum ReceiptType: String, Codable {
  case delivered = "DELIVERED"
  case read = "READ"
}

struct Receipt: Codable, Hashable {
  let messageId: String
  let userId: String
  let type: ReceiptType
  let createdAt: Date?
}

