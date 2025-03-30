/**
 * Service for generating and validating OTPs
 */

// Generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate an OTP (currently just checks if it's a 6-digit number)
export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

// Calculate OTP expiry time (in minutes)
export function calculateExpiryTime(minutes: number = 10): Date {
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
  return expiryTime;
}

// Check if OTP is expired
export function isOTPExpired(expiryTime: Date): boolean {
  return new Date() > expiryTime;
}
