import SwiftUI

private enum RootTab: Hashable {
  case messages
  case contacts
  case discover
  case me
}

struct RootView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore
  @State private var selectedTab: RootTab = .messages

  var body: some View {
    Group {
      if auth.isLoggedIn {
        TabView(selection: $selectedTab) {
          ConversationsView()
            .tabItem {
              Label("消息", systemImage: "message")
            }
            .tag(RootTab.messages)

          ContactsView()
            .tabItem {
              Label("通讯录", systemImage: "person.2")
            }
            .tag(RootTab.contacts)

          DiscoverView()
            .tabItem {
              Label("发现", systemImage: "safari")
            }
            .tag(RootTab.discover)

          ProfileView()
            .tabItem {
              Label("我的", systemImage: "person.crop.circle")
            }
            .tag(RootTab.me)
        }
        .tint(.indigo)
      } else {
        LoginView()
      }
    }
    .task(id: auth.userId) {
      if auth.isLoggedIn {
        profile.clear(phoneHint: auth.phone)
        await profile.refreshAll(phoneHint: auth.phone)
      } else {
        profile.clear(phoneHint: nil)
      }
    }
  }
}
