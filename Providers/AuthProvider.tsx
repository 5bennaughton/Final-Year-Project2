import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";


type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  logOut: () => Promise<void>;
};


export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  loading: true,
  logOut: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  const getUser = async (session: Session | null) => {
    if (session) { 
      console.log("gettingUser");
      router.replace('/(tabs)');
  }
}

const logOut = async () => {
  await supabase.auth.signOut();
  setUser(null);
  router.replace('/(auth)');
}

   useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      getUser(session);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      getUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};