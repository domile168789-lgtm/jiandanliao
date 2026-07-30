import SwiftUI

struct LoginView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var ws: WSClient
  @StateObject private var branding = BrandingStore()

  @State private var phone: String = "85510000001"
  @State private var password: String = "pass123456"
  @State private var nickname: String = ""
  @State private var isRegister: Bool = false

  @State private var isLoading: Bool = false
  @State private var errorText: String?

  @State private var showConfig: Bool = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          BrandingHeroView(
            projectName: branding.projectName,
            logoURL: branding.logoURL,
            themeAssetURL: branding.themeAssetURL
          )
          .listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 12, trailing: 0))
        }

        Section("账号") {
          TextField("手机号", text: $phone)
            .keyboardType(.numberPad)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)

          SecureField("密码", text: $password)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)

          if isRegister {
            TextField("昵称(可选)", text: $nickname)
          }
        }

        if let brandingError = branding.loadError {
          Section {
            Text("移动端品牌配置读取失败，当前使用默认品牌。")
              .font(.footnote)
              .foregroundStyle(.secondary)
            Text(brandingError)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }

        if let errorText {
          Section {
            Text(errorText)
              .foregroundStyle(.red)
          }
        }

        Section {
          Button(isRegister ? "注册并进入" : "密码登录") {
            Task { await submit() }
          }
          .disabled(isLoading)

          Button(isRegister ? "已有账号？切换到登录" : "新用户？切换到注册") {
            errorText = nil
            isRegister.toggle()
          }
          .disabled(isLoading)
        }

        Section("联调配置") {
          Button("服务地址设置") { showConfig = true }
          LabeledContent("API Base URL", value: AppConfig.apiBaseURL.absoluteString)
          LabeledContent("WS Base URL", value: AppConfig.wsBaseURL.absoluteString)
          Text("本地主线默认：API=http://127.0.0.1/api，WS=http://127.0.0.1")
            .font(.footnote)
            .foregroundStyle(.secondary)
          LabeledContent("deviceId", value: auth.deviceId)
        }
      }
      .navigationTitle("欢迎使用\(branding.projectName)")
      .task {
        await branding.loadMobileBranding()
      }
      .sheet(isPresented: $showConfig) {
        ConfigView()
      }
    }
  }

  private func submit() async {
    errorText = nil
    isLoading = true
    defer { isLoading = false }

    do {
      if isRegister {
        try await auth.register(phone: phone, password: password, nickname: nickname.isEmpty ? nil : nickname)
      } else {
        try await auth.loginWithPassword(phone: phone, password: password)
      }

      if let uid = auth.userId {
        ws.connect(userId: uid)
      }
    } catch {
      errorText = error.localizedDescription
    }
  }
}

private struct BrandingHeroView: View {
  let projectName: String
  let logoURL: URL?
  let themeAssetURL: URL?

  var body: some View {
    ZStack(alignment: .bottomLeading) {
      RoundedRectangle(cornerRadius: 20, style: .continuous)
        .fill(
          LinearGradient(
            colors: [
              Color.blue.opacity(0.9),
              Color.indigo.opacity(0.8),
              Color.black.opacity(0.85)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        .frame(height: 196)
        .overlay(alignment: .topTrailing) {
          if let themeAssetURL {
            AsyncImage(url: themeAssetURL) { phase in
              switch phase {
              case let .success(image):
                image
                  .resizable()
                  .scaledToFill()
              default:
                Color.clear
              }
            }
            .frame(width: 118, height: 118)
            .clipped()
            .opacity(0.28)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .padding(16)
          }
        }

      VStack(alignment: .leading, spacing: 12) {
        if let logoURL {
          AsyncImage(url: logoURL) { phase in
            switch phase {
            case let .success(image):
              image
                .resizable()
                .scaledToFit()
            default:
              Image(systemName: "message.badge.circle.fill")
                .resizable()
                .scaledToFit()
                .foregroundStyle(.white.opacity(0.92))
            }
          }
          .frame(height: 36)
        } else {
          Image(systemName: "message.badge.circle.fill")
            .font(.system(size: 34))
            .foregroundStyle(.white.opacity(0.92))
        }

        VStack(alignment: .leading, spacing: 6) {
          Text(projectName)
            .font(.title2.weight(.semibold))
            .foregroundStyle(.white)
          Text("移动端入口")
            .font(.subheadline)
            .foregroundStyle(.white.opacity(0.78))
        }
      }
      .padding(20)
    }
    .listRowBackground(Color.clear)
  }
}

private struct ConfigView: View {
  @Environment(\.dismiss) private var dismiss

  @State private var apiBase: String = AppConfig.apiBaseURL.absoluteString
  @State private var wsBase: String = AppConfig.wsBaseURL.absoluteString

  var body: some View {
    NavigationStack {
      Form {
        Section("API") {
          TextField("例如 http://127.0.0.1/api", text: $apiBase)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
        }
        Section("WebSocket(Socket.IO)") {
          TextField("例如 http://127.0.0.1", text: $wsBase)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
        }
      }
      .navigationTitle("服务地址")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            if let api = URL(string: apiBase) { AppConfig.apiBaseURL = api }
            if let ws = URL(string: wsBase) { AppConfig.wsBaseURL = ws }
            dismiss()
          }
        }
      }
    }
  }
}
