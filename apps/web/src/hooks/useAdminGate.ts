import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'rxfin_admin_token';

function parseGateResponse(data: any) {
  if (!data) return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
}

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
  const [state, setState] = useState<AdminGateState>(() => {
    // Check if we already have a token on initial render
    const existingToken = sessionStorage.getItem(STORAGE_KEY);
    return {
      isLoading: true,
      isAdmin: true,
      isAuthenticated: false,
      needsMfa: false,
      mfaEnrolled: false,
      session: existingToken,
      error: null,
    };
  });
  const hasInitializedRef = useRef(false);
  const isLoginInProgressRef = useRef(false);

  const login = useCallback(async () => {
    if (isLoginInProgressRef.current) {
      console.log('[AdminGate] login already in progress, skipping');
      return;
    }

    isLoginInProgressRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Force-read the current session to ensure we have the latest JWT
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('[AdminGate] Current session present:', !!sessionData?.session);
      
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

      console.log('[AdminGate] Calling admin-gate action: login');
      const { data: rawData, error } = await supabase.functions.invoke('admin-gate', {
        body: { action: 'login' },
      });

      if (error) throw error;

      const data = parseGateResponse(rawData);
      console.log('[AdminGate] Parsed response:', JSON.stringify(data), typeof data);

      if (data?.code === 'MFA_REQUIRED') {
        console.log('[AdminGate] MFA required, enrolled:', !!data.mfa_enrolled);
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
        console.log('[AdminGate] User is not admin');
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAdmin: false,
        }));
        return;
      }

      if (data?.code === 'SUCCESS' && data?.session_token) {
        console.log('[AdminGate] SUCCESS! Saving token and marking authenticated');
        sessionStorage.setItem(STORAGE_KEY, data.session_token);
        setState({
          isLoading: false,
          isAuthenticated: true,
          needsMfa: false,
          mfaEnrolled: false,
          session: data.session_token,
          isAdmin: true,
          error: null,
        });
        return;
      }

      throw new Error(data?.message || 'Resposta inesperada do servidor');
    } catch (err: any) {
      console.error('[AdminGate] Login error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Erro ao autenticar',
      }));
    } finally {
      isLoginInProgressRef.current = false;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    try {
      await supabase.functions.invoke('admin-gate', {
        body: { action: 'logout', admin_token: token },
      });
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
    if (hasInitializedRef.current) {
      console.log('[AdminGate] Already initialized, skipping init');
      return;
    }
    if (state.isAuthenticated) {
      console.log('[AdminGate] Already authenticated, skipping init');
      return;
    }

    hasInitializedRef.current = true;

    const init = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        console.log('[AdminGate] No Supabase session, redirecting to login');
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

      const existingToken = sessionStorage.getItem(STORAGE_KEY);
      console.log('[AdminGate] Token found:', !!existingToken);

      if (existingToken) {
        try {
          console.log('[AdminGate] Calling admin-gate action: validate');
          const { data: rawValidate, error } = await supabase.functions.invoke('admin-gate', {
            body: { action: 'validate', admin_token: existingToken },
          });
          const data = parseGateResponse(rawValidate);
          console.log('[AdminGate] Validate result:', JSON.stringify(data));

          if (!error && data?.valid) {
            console.log('[AdminGate] Token valid, marking authenticated');
            setState({
              isLoading: false,
              isAuthenticated: true,
              needsMfa: false,
              mfaEnrolled: false,
              session: existingToken,
              isAdmin: true,
              error: null,
            });
            return;
          }
        } catch {
          // token invalid, proceed to login
        }
        console.log('[AdminGate] Token invalid, removing');
        sessionStorage.removeItem(STORAGE_KEY);
      }

      await login();
    };

    init();
  }, [login, navigate, state.isAuthenticated]);

  return {
    ...state,
    login,
    logout,
  };
}
