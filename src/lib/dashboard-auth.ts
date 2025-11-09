/**
 * Dashboard authentication utilities
 * Simple password-based authentication with secure session cookies
 */

import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'dashboard-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Verifies the dashboard password
 */
export function verifyDashboardPassword(password: string): boolean {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;

  if (!dashboardPassword) {
    console.error('[Dashboard Auth] DASHBOARD_PASSWORD not configured');
    return false;
  }

  return password === dashboardPassword;
}

/**
 * Generates a session token
 * Simple implementation using timestamp + random string + hash
 */
function generateSessionToken(): string {
  const timestamp = Date.now();
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');

  return `${timestamp}.${randomString}`;
}

/**
 * Validates a session token
 * Checks if token exists and is not expired
 */
function validateSessionToken(token: string): boolean {
  if (!token) return false;

  try {
    const [timestampStr] = token.split('.');
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) return false;

    // Check if token is expired (older than SESSION_MAX_AGE)
    const now = Date.now();
    const age = (now - timestamp) / 1000; // age in seconds

    return age <= SESSION_MAX_AGE;
  } catch (error) {
    console.error('[Dashboard Auth] Error validating token:', error);
    return false;
  }
}

/**
 * Creates a session by setting a secure cookie
 */
export async function createSession(): Promise<void> {
  const token = generateSessionToken();
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Validates the current session
 */
export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return false;

  return validateSessionToken(token);
}

/**
 * Destroys the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Checks if dashboard authentication is required
 * Returns false if DASHBOARD_PASSWORD is not set (auth disabled)
 */
export function isDashboardAuthRequired(): boolean {
  return !!process.env.DASHBOARD_PASSWORD;
}
