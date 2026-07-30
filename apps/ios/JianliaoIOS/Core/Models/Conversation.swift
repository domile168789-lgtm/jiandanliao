import Foundation

struct Conversation: Codable, Identifiable, Hashable {
  let id: String
  let type: String
  let title: String?
  let lastMessage: String?
  let updatedAt: Date?
}

struct CreateDMRequest: Codable {
  let peerPhone: String
}

