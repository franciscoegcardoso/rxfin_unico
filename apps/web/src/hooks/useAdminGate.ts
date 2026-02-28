import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'rxfin_admin_token';
const STORAGE_EXPIRES_KEY = 'rxfin_admin_expires';

function parseGateResponse(data: any) {
  if (!data) return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
}

/** Check if a stored token looks non-expired (client-side pre-check) */
function hasNonExpiredToken(): string | null {
  const token = sessionStorage.getItem(STORAGE_KEY);
  if (!token) return null;
  const expires = sessionStorage.getItem(STORAGE_EXPIRES_KEY);
  if (expires && new Date(expires).getTime() < Date.now()) {
    console.log('[AdminGate] Token expired locally, clearing');
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_EXPIRES_KEY);
    return null;
  }
  return token;
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

// Module-level flag survives remounts within same page lifecycle
let _moduleInitialized = false;
let _moduleAuthenticated = false;

function clearStoredAdminGateSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_EXPIRES_KEY);
  _moduleAuthenticated = false;
}

async function getValidAccessToken(): Promise<string | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return null;
  }

  return accessToken;
}

export function useAdminGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminGateState>(() => {
    const existingToken = hasNonExpiredToken();
    console.log('[AdminGate] Init state — token found:', !!existingToken, 'moduleAuth:', _moduleAuthenticated);

    // If we already authenticated in this page session, skip loading
    if (_moduleAuthenticated && existingToken) {
      return {
        isLoading: false,
        isAdmin: true,
        isAuthenticated: true,
        needsMfa: false,
        mfaEnrolled: false,
        session: existingToken,
        error: null,
      };
    }

    return {
      isLoading: true,
      isAdmin: true,
      isAuthenticated: !!existingToken && _moduleAuthenticated,
      needsMfa: false,
      mfaEnrolled: false,
      session: existingToken,
      error: null,
    };
  });
  const isLoginInProgressRef = useRef(false);

  const login = useCallback(async () => {
    // Before calling login, re-check storage — another call may have saved a token
    const freshToken = hasNonExpiredToken();
    if (freshToken && _moduleAuthenticated) {
      console.log('[AdminGate] login() called but token already exists & authenticated, skipping');
      setState({
        isLoading: false,
        isAuthenticated: true,
        needsMfa: false,
        mfaEnrolled: false,
        session: freshToken,
        isAdmin: true,
        error: null,
      });
      return;
    }

    if (isLoginInProgressRef.current) {
      console.log('[AdminGate] login already in progress, skipping');
      return;
    }

    isLoginInProgressRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const accessToken = await getValidAccessToken();
      console.log('[AdminGate] Current valid session present:', !!accessToken);

      if (!accessToken) {
        clearStoredAdminGateSession();
        await supabase.auth.signOut();
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
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      const data = parseGateResponse(rawData);
      console.log('[AdminGate] Parsed response:', JSON.stringify(data));

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
        _moduleAuthenticated = false;
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
        if (data.expires_at) {
          sessionStorage.setItem(STORAGE_EXPIRES_KEY, data.expires_at);
        }
        _moduleAuthenticated = true;
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

      if (err?.name === 'FunctionsHttpError') {
        clearStoredAdminGateSession();
        await supabase.auth.signOut();
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
    clearStoredAdminGateSession();
    _moduleInitialized = false;
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
    // Skip if already authenticated (handles remounts after MFA)
    if (state.isAuthenticated) {
      console.log('[AdminGate] Already authenticated, skipping init');
      _moduleInitialized = true;
      return;
    }

    // Skip if this module-level init already ran (survives remounts)
    if (_moduleInitialized && _moduleAuthenticated) {
      console.log('[AdminGate] Module already initialized & authenticated, restoring');
      const token = hasNonExpiredToken();
      if (token) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          needsMfa: false,
          mfaEnrolled: false,
          session: token,
          isAdmin: true,
          error: null,
        });
        return;
      }
    }

    _moduleInitialized = true;

    const init = async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('[AdminGate] No valid Supabase session, redirecting to login');
        clearStoredAdminGateSession();
        await supabase.auth.signOut();
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

      const existingToken = hasNonExpiredToken();
      console.log('[AdminGate] Init — token found:', !!existingToken);

      if (existingToken) {
        try {
          console.log('[AdminGate] Calling admin-gate action: validate');
          const { data: rawValidate, error } = await supabase.functions.invoke('admin-gate', {
            body: { action: 'validate', admin_token: existingToken },
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = parseGateResponse(rawValidate);
          console.log('[AdminGate] Validate result:', JSON.stringify(data));

          if (!error && data?.valid) {
            console.log('[AdminGate] Token valid, marking authenticated');
            _moduleAuthenticated = true;
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
        clearStoredAdminGateSession();
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
