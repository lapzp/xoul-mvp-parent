import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  access_token?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


const API_BASE_URL = "https://xoul-data-backend-267146952341.us-east1.run.app";

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
// Fetch current user on mount
useEffect(() => {
  const fetchUser = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          'Authorization': access_token ? `Bearer ${access_token}` : '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser({ id: data.id, email: data.email });
      } else if (res.status === 401 || res.status === 403) {
        // Try to refresh the token

        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const refresh_token_data = await refreshRes.json();

          // Grab the newly returned token into a local variable
          const newAccessToken = refresh_token_data.access_token;
          // Save it into state
          setAccessToken(newAccessToken);

          // Now log the new token (instead of the old state value)

          // Retry `/auth/me` with the new token
          const retryRes = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
            },
          });

          if (retryRes.ok) {
            const data = await retryRes.json();
            setUser({ id: data.id, email: data.email });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching current user', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  fetchUser();
}, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // send/receive cookies
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await res.json();
      setUser({ id: data.user.id, email: data.user.email });

      // In this point there is no old access token, so we need 
      // to set it directly
      setAccessToken(data.access_token);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, name: string, phone: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, name, phone, password }),
      });

      if (!res.ok) {
        throw new Error('Registration failed');
      }

      const data = await res.json();
      setUser({ id: data.user.id, email: data.user.email });

      
      setAccessToken(data.access_token);

      toast.success('Registration and login successful');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Logout failed');
      }

      toast.success('Logged out');
      setUser(null);

      if (access_token) {
        setAccessToken(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, error, access_token }}>
      {children}
    </AuthContext.Provider>
  );
};

export {AuthProvider, useAuth};