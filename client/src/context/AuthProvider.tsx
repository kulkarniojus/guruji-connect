import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: "customer" | "guruji" | "admin";
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (mobile: string, password: string) => Promise<void>;
  loginWithOtp: (mobile: string, otp: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  sendOtp: (mobile: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/auth/me");
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        // Don't set error here - just means user is not logged in
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (mobile: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("POST", "/api/auth/login", {
        mobile,
        password,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (mobile: string, otp: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("POST", "/api/auth/verify-otp", {
        mobile,
        otp,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "OTP verification failed");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("POST", "/api/auth/register", userData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const newUser = await response.json();
      setUser(newUser);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("POST", "/api/auth/logout");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Logout failed");
      }

      setUser(null);
    } catch (err: any) {
      setError(err.message || "Logout failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (mobile: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest("POST", "/api/auth/send-otp", {
        mobile,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        loginWithOtp,
        register,
        logout,
        sendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};