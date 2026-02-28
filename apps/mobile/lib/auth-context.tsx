import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  onboarding_completed: boolean;
  theme_preference: "light" | "dark" | "system";
  status: "pending" | "active" | "suspended";
};

type UserPlan = {
  plan_slug: string;
  plan_name: string;
  plan_expires_at: string | null;
  workspace_id: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userPlan: UserPlan | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  userPlan: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, onboarding_completed, theme_preference, status")
        .eq("id", userId)
        .single();
      if (!error && data) setProfile(data as Profile);
    } catch (e) {
      console.warn("[AuthContext] Error fetching profile:", e);
    }
  }, []);

  const fetchUserPlan = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("v_user_plan")
        .select("plan_slug, plan_name, plan_expires_at, workspace_id")
        .eq("user_id", userId)
        .single();
      if (!error && data) {
        setUserPlan(data as UserPlan);
      } else {
        setUserPlan({ plan_slug: "free", plan_name: "Free", plan_expires_at: null, workspace_id: null });
      }
    } catch (e) {
      console.warn("[AuthContext] Error fetching plan:", e);
      setUserPlan({ plan_slug: "free", plan_name: "Free", plan_expires_at: null, workspace_id: null });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await Promise.all([fetchProfile(session.user.id), fetchUserPlan(session.user.id)]);
    }
  }, [session?.user?.id, fetchProfile, fetchUserPlan]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        Promise.all([fetchProfile(s.user.id), fetchUserPlan(s.user.id)]).finally(() =>
          setIsLoading(false)
        );
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
        fetchUserPlan(s.user.id);
      } else {
        setProfile(null);
        setUserPlan(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchUserPlan]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setUserPlan(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        userPlan,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
