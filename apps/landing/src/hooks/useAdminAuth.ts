import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleUser = async (currentUser: User | null) => {
      const uid = currentUser?.id ?? null;

      // Skip if we already checked this user
      if (uid === lastCheckedUserId.current && !loading) return;
      lastCheckedUserId.current = uid;

      if (!currentUser) {
        if (!cancelled) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setUser(currentUser);

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (!cancelled) setIsAdmin(!!data);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
      if (!cancelled) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Reset so the next auth event is processed
    lastCheckedUserId.current = null;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    lastCheckedUserId.current = null;
    await supabase.auth.signOut();
  };

  return { user, isAdmin, loading, signIn, signOut };
};
