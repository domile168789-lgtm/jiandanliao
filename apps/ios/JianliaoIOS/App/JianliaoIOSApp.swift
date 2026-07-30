import SwiftUI

@main
struct JianliaoIOSApp: App {
  @StateObject private var authStore: AuthStore
  @StateObject private var wsClient: WSClient
  @StateObject private var profileStore: ProfileStore

  init() {
    let authStore = AuthStore()
    _authStore = StateObject(wrappedValue: authStore)
    _wsClient = StateObject(wrappedValue: WSClient())
    _profileStore = StateObject(
      wrappedValue: ProfileStore(
        service: ProfileService(authProvider: authStore),
        noticeFallbackProvider: { authStore.pendingNotices }
      )
    )
  }

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(authStore)
        .environmentObject(wsClient)
        .environmentObject(profileStore)
        .task {
          await authStore.restoreIfPossible()
          if let userId = authStore.userId {
            wsClient.connect(userId: userId)
          }
        }
    }
  }
}
