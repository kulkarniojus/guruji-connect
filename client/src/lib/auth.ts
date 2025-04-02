import { apiRequest } from './queryClient';
import { User } from '@shared/schema';

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();
    return { success: true, message: 'Login successful', user: data };
  } catch (error: any) {
    console.error('Error logging in:', error);
    const message = error.status === 401 
      ? 'Invalid email or password' 
      : 'Login failed. Please try again.';
    return { success: false, message };
  }
}

/**
 * Logs out the current user
 */
export async function logout(): Promise<{ success: boolean; message: string }> {
  try {
    await apiRequest('POST', '/api/auth/logout', undefined);
    return { success: true, message: 'Logout successful' };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, message: 'Failed to logout' };
  }
}

/**
 * Checks if a user with the given email exists
 */
export async function checkUserExists(email: string): Promise<{ exists: boolean; user?: User }> {
  try {
    const response = await apiRequest('GET', `/api/auth/check-user?email=${encodeURIComponent(email)}`, undefined);
    const data = await response.json();
    return { exists: data.exists, user: data.user };
  } catch (error) {
    console.error('Error checking user:', error);
    return { exists: false };
  }
}

/**
 * Registers a new user
 */
export async function registerUser(userData: any): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    const data = await response.json();
    return { success: true, message: 'Registration successful', user: data };
  } catch (error: any) {
    console.error('Error registering user:', error);
    return { 
      success: false, 
      message: error.message || 'Registration failed'
    };
  }
}

/**
 * Gets the current logged in user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest('GET', '/api/auth/me', undefined);
    return await response.json();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
