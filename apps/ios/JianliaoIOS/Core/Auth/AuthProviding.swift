import Foundation

protocol AuthProviding: AnyObject {
  var accessToken: String? { get }
}

