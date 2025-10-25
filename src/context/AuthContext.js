import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedAuth = localStorage.getItem('isLoggedIn');
    const savedUser = localStorage.getItem('user');
    
    if (savedAuth === 'true' && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Simple validation for demo purposes
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
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    
    // Clear all authentication and project data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('valhalla_memorial_projects'); // Clear all project data
    
    // Clear any other potential cache/localStorage items
    localStorage.removeItem('projectFlowData');
    localStorage.removeItem('wizardData');
    localStorage.removeItem('selectedTemplates');
    
    // Clear sessionStorage as well
    sessionStorage.clear();
    
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
