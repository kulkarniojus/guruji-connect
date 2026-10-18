import { apiRequest } from './queryClient';
import { User } from '@shared/schema';

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ success: boolean; message: string; user?: User; isAdmin?: boolean }> {
  // Helper to extract HTTP status from thrown Error message like "401: ..."
  const getStatus = (err: any): number => {
    const msg: string = err?.message || '';
    const match = msg.match(/^(\d{3}):/);
    return match ? parseInt(match[1]) : 0;
  };

  try {
    // Try regular login first
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();
    return { success: true, message: 'Login successful', user: data, isAdmin: false };
  } catch (error: any) {
    const status = getStatus(error);

    // If regular login says to use admin login, or is a 401 for an admin-looking email
    const shouldTryAdmin = status === 401 && (
      (error.message || '').includes('admin') || email.toLowerCase().includes('admin')
    );

    if (shouldTryAdmin) {
      try {
        const adminResponse = await apiRequest('POST', '/api/admin/login', { email, password });
        const adminData = await adminResponse.json();
        return { success: true, message: 'Login successful', user: adminData.user, isAdmin: true };
      } catch (adminError: any) {
        // Fall through to report original error
      }
    }

    // Parse error message from server if available
    let message = 'Login failed. Please try again.';
    try {
      const body = JSON.parse((error.message || '').replace(/^\d+: /, ''));
      message = body.message || message;
    } catch {}
    
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
    // Map registrationType → role (backend expects 'role'), strip frontend-only fields
    const { registrationType, terms, ...rest } = userData;
    const payload = {
      ...rest,
      role: registrationType || rest.role,
      age: Number(rest.age),
    };
    
    const response = await apiRequest('POST', '/api/auth/register', payload);
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
