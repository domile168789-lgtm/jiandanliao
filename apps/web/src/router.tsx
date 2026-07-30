import React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, apiPost } from './api/client';
import DownloadPage from './components/DownloadPage';
import {
  clearAccessToken,
  hasAccessToken,
  hasPreviewSession,
  setAccessToken,
  setPreviewSessionEnabled
} from './state/session';
import AgentPage from './pages/AgentPage';
import CardsPage from './pages/CardsPage';
import ChannelsPage from './pages/ChannelsPage';
import ChatPage from './pages/ChatPage';
import ContactsPage from './pages/ContactsPage';
import DiscoverPage from './pages/DiscoverPage';
import EarningsPage from './pages/EarningsPage';
import FavoritesPage from './pages/FavoritesPage';
import FriendsRequestsPage from './pages/FriendsRequestsPage';
import GroupChatsPage from './pages/GroupChatsPage';
import LoginPage from './pages/LoginPage';
import MePage from './pages/MePage';
import MessagesPage from './pages/MessagesPage';
import MomentsPage from './pages/MomentsPage';
import NewGroupConfirmPage from './pages/NewGroupConfirmPage';
import NewGroupPage from './pages/NewGroupPage';
import OfficialAccountsPage from './pages/OfficialAccountsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterEntryPage from './pages/RegisterEntryPage';
import ScanPage from './pages/ScanPage';
import SearchHubPage from './pages/SearchHubPage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import ServicesPage from './pages/ServicesPage';
import StickersPage from './pages/StickersPage';
import SystemNoticePage from './pages/SystemNoticePage';
import TagsPage from './pages/TagsPage';
import TabShell from './pages/TabShell';
import WalletPage from './pages/WalletPage';

export const appRoutes = [
  { path: '/messages', element: <MessagesPage /> },
  { path: '/contacts', element: <ContactsPage /> },
  { path: '/discover', element: <DiscoverPage /> },
  { path: '/me', element: <MePage /> },
  { path: '/contacts/friends', element: <FriendsRequestsPage /> },
  { path: '/contacts/groups', element: <GroupChatsPage /> },
  { path: '/contacts/tags', element: <TagsPage /> },
  { path: '/contacts/official-accounts', element: <OfficialAccountsPage /> },
  { path: '/discover/moments', element: <MomentsPage /> },
  { path: '/discover/scan', element: <ScanPage /> },
  { path: '/discover/channels', element: <ChannelsPage /> },
  { path: '/discover/search', element: <SearchHubPage /> },
  { path: '/me/services', element: <ServicesPage /> },
  { path: '/me/favorites', element: <FavoritesPage /> },
  { path: '/me/cards', element: <CardsPage /> },
  { path: '/me/stickers', element: <StickersPage /> },
  { path: '/system-notice', element: <SystemNoticePage /> },
  { path: '/wallet', element: <WalletPage /> },
  { path: '/earnings', element: <EarningsPage /> },
  { path: '/agent', element: <AgentPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/security', element: <SecurityPage /> }
] as const;

const tabRoutes = appRoutes.slice(0, 4);
const detailRoutes = appRoutes.slice(4);
const PREVIEW_QUERY_KEY = 'preview';
const PREVIEW_QUERY_VALUE = 'demo';
const PREVIEW_PHONE = '855010100000';
const PREVIEW_PASSWORD = 'demo123456';

function isPreviewMode(search: string) {
  const params = new URLSearchParams(search);
  return params.get(PREVIEW_QUERY_KEY) === PREVIEW_QUERY_VALUE;
}

function PreviewSessionBootstrap({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        clearAccessToken();
        let payload: { accessToken?: string };
        try {
          payload = await apiPost('/api/auth/login/password', {
            phone: PREVIEW_PHONE,
            password: PREVIEW_PASSWORD,
            deviceId: 'web-preview-device',
            platform: 'H5'
          });
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
          payload = await apiPost('/api/auth/register', {
            phone: PREVIEW_PHONE,
            password: PREVIEW_PASSWORD,
            deviceId: 'web-preview-device',
            platform: 'H5',
            nickname: '演示用户'
          });
        }

        if (cancelled) return;
        if (!payload.accessToken?.trim()) {
          setErrorMessage('预览登录未返回有效凭证');
          return;
        }
        setPreviewSessionEnabled(true);
        setAccessToken(payload.accessToken);
        setReady(true);
        navigate(location.pathname, { replace: true });
      } catch {
        if (cancelled) return;
        setErrorMessage('预览登录失败，请确认本地 API 已启动');
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (!ready) {
    return (
      <section className="h5-page">
        <header className="top-bar">
          <h1>正在进入 IM 预览</h1>
          <p>正在通过后端接口创建演示会话和登录态。</p>
        </header>
        {errorMessage ? <div className="form-error">{errorMessage}</div> : <p className="conversation-state">正在连接 API...</p>}
      </section>
    );
  }

  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const search = location.search;
  if (hasAccessToken()) {
    return <>{children}</>;
  }
  if (isPreviewMode(search) || hasPreviewSession()) {
    return <PreviewSessionBootstrap>{children}</PreviewSessionBootstrap>;
  }
  return <Navigate to={`/h5/login${search}`} replace />;
}

const toNestedPath = (path: string) => path.replace(/^\//, '');

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/app" element={<DownloadPage />} />
      <Route path="/h5/login" element={<LoginPage />} />
      <Route path="/h5/register" element={<RegisterEntryPage />} />
      <Route path="/mobile" element={<LoginPage />} />
      <Route path="/pc" element={<LoginPage />} />
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/h5/group/new"
        element={
          <RequireAuth>
            <NewGroupPage />
          </RequireAuth>
        }
      />

      <Route
        path="/h5/group/new/confirm"
        element={
          <RequireAuth>
            <NewGroupConfirmPage />
          </RequireAuth>
        }
      />

      <Route
        path="/h5"
        element={
          <RequireAuth>
            <TabShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={toNestedPath(tabRoutes[0].path)} replace />} />
        {tabRoutes.map((route) => (
          <Route key={route.path} path={toNestedPath(route.path)} element={route.element} />
        ))}
      </Route>

      {detailRoutes.map((route) => (
        <Route
          key={route.path}
          path={`/h5${route.path}`}
          element={<RequireAuth>{route.element}</RequireAuth>}
        />
      ))}

      <Route
        path="/h5/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/h5/chat/:conversationId"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
