import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'co_admin' | 'customer_caller';

interface Profile {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  aadhaar_number?: string;
  bank_account_number?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (roleData) {
        setRole(roleData.role as AppRole);
      }

      // Log session
      await supabase.from('session_logs').insert({
        user_id: userId,
        login_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, roleType: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) return { error };

    if (data.user) {
      // Generate employee ID
      const prefix = roleType === 'admin' ? 'ADM' : roleType === 'co_admin' ? 'COA' : 'CAL';
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const employeeId = `${prefix}${randomNum}`;

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: data.user.id,
        employee_id: employeeId,
        full_name: fullName,
        email: email,
      });

      if (profileError) return { error: profileError };

      // Create role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: roleType,
      });

      if (roleError) return { error: roleError };
    }

    return { error: null };
  };

  const signOut = async () => {
    // Update session log with logout time
    if (user) {
      const { data: sessionLog } = await supabase
        .from('session_logs')
        .select('id, login_at')
        .eq('user_id', user.id)
        .is('logout_at', null)
        .order('login_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionLog) {
        const loginAt = new Date(sessionLog.login_at);
        const logoutAt = new Date();
        const durationMinutes = Math.round((logoutAt.getTime() - loginAt.getTime()) / 60000);

        await supabase
          .from('session_logs')
          .update({
            logout_at: logoutAt.toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq('id', sessionLog.id);
      }
    }

    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
