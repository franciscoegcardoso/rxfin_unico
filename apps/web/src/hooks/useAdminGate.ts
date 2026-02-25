import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'rxfin_admin_token';

interface AdminGateState {
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  needsMfa: boolean;
  mfaEnrolled: boolean;
  session: string | null;
  error: string | null;
}

export function useAdminGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminGateState>({
    isLoading: true,
    isAdmin: true,
    isAuthenticated: false,
    needsMfa: false,
    mfaEnrolled: false,
    session: null,
    error: null,
  });

  const login = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        sessionStorage.removeItem(STORAGE_KEY);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          needsMfa: false,
          session: null,
          error: 'Sua sessão expirou. Faça login novamente.',
        }));
        navigate('/login');
        return;
      }

      const accessToken = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('admin-gate', {
        body: { action: 'login' },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      console.log('[admin-gate response]', JSON.stringify(data));

      if (data?.code === 'MFA_REQUIRED') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          needsMfa: true,
          mfaEnrolled: !!data.mfa_enrolled,
          isAdmin: true,
        }));
        return;
      }

      if (data?.code === 'NOT_ADMIN') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAdmin: false,
        }));
        return;
      }

      if (data?.session_token) {
        sessionStorage.setItem(STORAGE_KEY, data.session_token);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          needsMfa: false,
          session: data.session_token,
          isAdmin: true,
        }));
        return;
      }

      throw new Error(data?.message || 'Resposta inesperada do servidor');
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Erro ao autenticar',
      }));
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (accessToken) {
        await supabase.functions.invoke('admin-gate', {
          body: { action: 'logout', admin_token: token },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch {
      // ignore logout errors
    }
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      isLoading: false,
      isAdmin: true,
      isAuthenticated: false,
      needsMfa: false,
      mfaEnrolled: false,
      session: null,
      error: null,
    });
    navigate('/');
  }, [navigate]);

  // On mount: validate existing token or attempt login
  useEffect(() => {
    const init = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        sessionStorage.removeItem(STORAGE_KEY);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          needsMfa: false,
          session: null,
          error: 'Sua sessão expirou. Faça login novamente.',
        }));
        navigate('/login');
        return;
      }

      const accessToken = sessionData.session.access_token;
      const existingToken = sessionStorage.getItem(STORAGE_KEY);

      if (existingToken) {
        try {
          const { data, error } = await supabase.functions.invoke('admin-gate', {
            body: { action: 'validate', admin_token: existingToken },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!error && data?.valid) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isAuthenticated: true,
              session: existingToken,
              isAdmin: true,
            }));
            return;
          }
        } catch {
          // token invalid, proceed to login
        }
        sessionStorage.removeItem(STORAGE_KEY);
      }

      // No valid token, attempt login
      await login();
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    login,
    logout,
  };
}
