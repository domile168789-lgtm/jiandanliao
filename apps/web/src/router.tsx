import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DownloadPage from './components/DownloadPage';
import { hasAccessToken } from './state/session';
import AgentPage from './pages/AgentPage';
import ChatPage from './pages/ChatPage';
import ContactsPage from './pages/ContactsPage';
import DiscoverPage from './pages/DiscoverPage';
import EarningsPage from './pages/EarningsPage';
import LoginPage from './pages/LoginPage';
import MePage from './pages/MePage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import RegisterEntryPage from './pages/RegisterEntryPage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import SystemNoticePage from './pages/SystemNoticePage';
import TabShell from './pages/TabShell';
import WalletPage from './pages/WalletPage';

export const appRoutes = [
  { path: '/messages', element: <MessagesPage /> },
  { path: '/contacts', element: <ContactsPage /> },
  { path: '/discover', element: <DiscoverPage /> },
  { path: '/me', element: <MePage /> },
  { path: '/system-notice', element: <SystemNoticePage /> },
  { path: '/wallet', element: <WalletPage /> },
  { path: '/earnings', element: <EarningsPage /> },
  { path: '/agent', element: <AgentPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/security', element: <SecurityPage /> }
] as const;

const tabRoutes = appRoutes.slice(0, 4);
const detailRoutes = appRoutes.slice(4);

function RequireAuth({ children }: { children: React.ReactNode }) {
  return hasAccessToken() ? <>{children}</> : <Navigate to="/h5/login" replace />;
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
