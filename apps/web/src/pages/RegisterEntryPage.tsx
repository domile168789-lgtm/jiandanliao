import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getFallbackBranding, loadBranding, resolveBrandingGroup } from '../api/branding';
import { ApiError, apiPost } from '../api/client';
import { getErrorMessage } from '../api/loadable';
import RegisterPage from '../components/RegisterPage';
import { hasAccessToken, setAccessToken } from '../state/session';

type RegisterResponse = {
  accessToken?: string;
};

export default function RegisterEntryPage() {
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
    <RegisterPage
      brand={brand}
      platformGroup={platformGroup}
      isSubmitting={submitting}
      errorMessage={errorMessage}
      noticeMessage={noticeMessage}
      onEnter={async ({ account, password, nickname }) => {
        if (!account || !password || !nickname) {
          setErrorMessage('请填写账号、密码和昵称');
          return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        try {
          const payload = await apiPost<RegisterResponse>('/api/auth/register', {
            phone: account,
            password,
            deviceId: 'web-h5-device',
            platform: 'H5',
            nickname
          });
          if (!payload.accessToken?.trim()) {
            setErrorMessage('注册接口未返回有效凭证');
            return;
          }
          setAccessToken(payload.accessToken);
          navigate('/h5/messages');
        } catch (error) {
          if (error instanceof ApiError && error.status === 429) {
            setErrorMessage('注册过于频繁，请稍后重试');
          } else if (error instanceof ApiError && error.status === 403) {
            setErrorMessage('当前环境不允许注册，请联系管理员');
          } else {
            setErrorMessage(getErrorMessage(error, '注册失败，请稍后重试'));
          }
        } finally {
          setSubmitting(false);
        }
      }}
      onSwitchToLogin={() => navigate('/h5/login')}
    />
  );
}
