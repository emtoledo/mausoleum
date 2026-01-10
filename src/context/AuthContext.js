import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import userService from '../services/userService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userAccount, setUserAccount] = useState(null); // Additional user data from user_accounts table
  const [loading, setLoading] = useState(true);
  
  // Check if Supabase is configured (compute once, not state)
  const useSupabaseAuth = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);

  // Load user account data from user_accounts table
  const loadUserAccount = async (userId) => {
    if (!userId) {
      setUserAccount(null);
      return;
    }

    try {
      const result = await userService.getUserAccount(userId);
      if (result.success) {
        setUserAccount(result.data);
        console.log('User account loaded:', result.data);
      } else if (result.notFound) {
        // User account doesn't exist yet - this is expected for users created before this feature
        // Don't warn, just set to null
        setUserAccount(null);
      } else {
        console.warn('Could not load user account:', result.error);
        setUserAccount(null);
      }
    } catch (error) {
      console.error('Error loading user account:', error);
      setUserAccount(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        if (useSupabaseAuth) {
          // Check Supabase session
          const { data: { session }, error } = await supabase.auth.getSession();
          if (isMounted && session && !error) {
            setIsAuthenticated(true);
            setUser(session.user);
            // Load user account data (don't await - let it load in background)
            loadUserAccount(session.user.id);
          }
        } else {
          // Fallback to localStorage
          const savedAuth = localStorage.getItem('isLoggedIn');
          const savedUser = localStorage.getItem('user');
          
          if (isMounted && savedAuth === 'true' && savedUser) {
            setIsAuthenticated(true);
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes (Supabase)
    let subscription = null;
    if (useSupabaseAuth) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        
        if (session) {
          setIsAuthenticated(true);
          setUser(session.user);
          // Load user account data (don't await - let it load in background)
          loadUserAccount(session.user.id);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setUserAccount(null);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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

  const signUp = async (email, password, name, locationId = null) => {
    try {
      if (useSupabaseAuth) {
        // Determine the redirect URL for email confirmation
        // Use production URL if available, otherwise use current origin
        const getRedirectUrl = () => {
          // Check if we have a production URL configured
          const productionUrl = process.env.REACT_APP_PRODUCTION_URL;
          if (productionUrl) {
            return `${productionUrl}/auth/callback`;
          }
          // Fallback to current origin (works for both localhost and production)
          // In production, window.location.origin will be the production URL
          return `${window.location.origin}/auth/callback`;
        };

        // Use Supabase Auth to create account
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
            data: {
              full_name: name,
              location_id: locationId
            }
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Update user metadata with name
          if (name) {
            await supabase.auth.updateUser({
              data: { full_name: name }
            });
          }
          
          // Create user_account entry with location
          console.log('Creating user account with location:', locationId);
          const userAccountResult = await userService.createUserAccount(
            data.user.id,
            email,
            name,
            locationId,
            'user' // Default role
          );
          
          if (!userAccountResult.success) {
            console.warn('Failed to create user account:', userAccountResult.error);
            // Don't fail the signup, the account was created in auth
          } else {
            console.log('User account created successfully:', userAccountResult.data);
          }
          
          setIsAuthenticated(true);
          setUser(data.user);
          return { success: true, user: data.user };
        }

        return { success: false, error: 'Sign up failed' };
      } else {
        // Fallback to localStorage (demo mode)
        if (email && password && password.length >= 6 && name) {
          const userData = { 
            email, 
            id: Date.now().toString(),
            name: name,
            locationId: locationId
          };
          
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
      console.error('Sign up error:', error);
      return { success: false, error: 'Sign up failed' };
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
    userAccount, // Additional user data including location_id and role
    loading,
    login,
    signUp,
    logout,
    refreshUserAccount: () => user?.id ? loadUserAccount(user.id) : Promise.resolve()
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
