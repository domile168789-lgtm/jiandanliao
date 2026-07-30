import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getFallbackBranding, loadBranding, resolveBrandingGroup } from '../api/branding';
import { ApiError, apiPost } from '../api/client';
import { getErrorMessage } from '../api/loadable';
import AuthPage from '../components/AuthPage';
import { hasAccessToken, setAccessToken, setPreviewSessionEnabled } from '../state/session';

type AuthResponse = {
  accessToken?: string;
};

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const platformGroup = React.useMemo(
    () => resolveBrandingGroup(location.pathname),
    [location.pathname]
  );
  const [brand, setBrand] = React.useState(() => getFallbackBranding(platformGroup));
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    setBrand(getFallbackBranding(platformGroup));

    void loadBranding(location.pathname).then((result) => {
      if (!cancelled) {
        setBrand(result.data);
        setNoticeMessage(result.notice || null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, platformGroup]);

  if (hasAccessToken()) {
    return <Navigate to="/h5/messages" replace />;
  }

  return (
    <AuthPage
      brand={brand}
      platformGroup={platformGroup}
      isSubmitting={submitting}
      errorMessage={errorMessage}
      noticeMessage={noticeMessage}
      onEnter={async ({ account, password }) => {
        if (!account || !password) {
          setErrorMessage('请输入账号和密码');
          return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        try {
          const payload = await apiPost<AuthResponse>('/api/auth/login/password', {
            phone: account,
            password,
            deviceId: 'web-h5-device',
            platform: 'H5'
          });
          if (!payload.accessToken?.trim()) {
            setErrorMessage('登录接口未返回有效凭证');
            return;
          }
          setPreviewSessionEnabled(false);
          setAccessToken(payload.accessToken);
          navigate('/h5/messages');
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            setErrorMessage('账号或密码错误');
          } else if (error instanceof ApiError && error.status === 403) {
            setErrorMessage('当前账号已被限制登录');
          } else {
            setErrorMessage(getErrorMessage(error, '登录失败，请稍后重试'));
          }
        } finally {
          setSubmitting(false);
        }
      }}
      onSwitchToRegister={() => navigate('/h5/register')}
    />
  );
}
