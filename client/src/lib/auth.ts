import { apiRequest } from './queryClient';
import { User } from '@shared/schema';

/**
 * Sends an OTP (One-Time Password) to the provided mobile number
 */
export async function sendOTP(mobile: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest('POST', '/api/auth/send-otp', { mobile });
    const data = await response.json();
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
}

/**
 * Verifies the OTP (One-Time Password) for the provided mobile number
 */
export async function verifyOTP(mobile: string, otp: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const response = await apiRequest('POST', '/api/auth/verify-otp', { mobile, otp });
    const data = await response.json();
    return { success: true, message: 'OTP verified successfully', user: data.user };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'Invalid OTP' };
  }
}

/**
 * Checks if a user with the given mobile number exists
 */
export async function checkUserExists(mobile: string): Promise<{ exists: boolean; user?: User }> {
  try {
    const response = await apiRequest('GET', `/api/auth/check-user?mobile=${mobile}`, undefined);
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
    return { success: true, message: 'Registration successful', user: data.user };
  } catch (error: any) {
    console.error('Error registering user:', error);
    return { 
      success: false, 
      message: error.message || 'Registration failed'
    };
  }
}
