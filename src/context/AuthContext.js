import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    const isConfigured = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    setUseSupabaseAuth(isConfigured);
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      if (useSupabaseAuth) {
        // Check Supabase session
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session && !error) {
            setIsAuthenticated(true);
            setUser(session.user);
          }
        } catch (error) {
          console.error('Error checking Supabase session:', error);
        }
      } else {
        // Fallback to localStorage
        const savedAuth = localStorage.getItem('isLoggedIn');
        const savedUser = localStorage.getItem('user');
        
        if (savedAuth === 'true' && savedUser) {
          setIsAuthenticated(true);
          setUser(JSON.parse(savedUser));
        }
      }
      
      setLoading(false);
    };

    initializeAuth();

    // Listen for auth state changes (Supabase)
    if (useSupabaseAuth) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setIsAuthenticated(true);
          setUser(session.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [useSupabaseAuth]);

  const login = async (email, password) => {
    try {
      if (useSupabaseAuth) {
        // Use Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
          return { success: true, user: data.user };
        }

        return { success: false, error: 'Login failed' };
      } else {
        // Fallback to localStorage (demo mode)
        if (email && password && password.length >= 6) {
          const userData = { email, id: Date.now().toString() };
          
          setIsAuthenticated(true);
          setUser(userData);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('user', JSON.stringify(userData));
          
          return { success: true };
        } else {
          return { success: false, error: 'Invalid credentials' };
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    if (useSupabaseAuth) {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } else {
      // Clear localStorage
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      localStorage.removeItem('currentProject');
      localStorage.removeItem('valhalla_memorial_projects');
      localStorage.removeItem('projectFlowData');
      localStorage.removeItem('wizardData');
      localStorage.removeItem('selectedTemplates');
      sessionStorage.clear();
    }

    setIsAuthenticated(false);
    setUser(null);
    
    // Reload page to reset all state
    window.location.reload();
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
export default AuthContext;
