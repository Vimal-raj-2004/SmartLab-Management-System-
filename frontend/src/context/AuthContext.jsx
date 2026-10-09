import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const getRoleDashboardPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'lab_assistant':
      return '/assistant/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/login';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } catch (err) {
          console.error('Session check error:', err);
          // Only clear session if token is truly rejected by backend with 401
          if (err.response?.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('token', data.access_token);
    const userInfo = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      avatar_url: data.avatar_url,
    };
    localStorage.setItem('user', JSON.stringify(userInfo));
    setToken(data.access_token);
    setUser(userInfo);
    return userInfo;
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        updateUser,
        logout,
        loading,
        isAuthenticated: !!user,
        getRoleDashboardPath,
      }}
    >
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
