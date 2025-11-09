/**
 * Server Actions for Dashboard
 */

'use server';

import { redirect } from 'next/navigation';
import {
  verifyDashboardPassword,
  createSession,
  destroySession,
  validateSession
} from '@/lib/dashboard-auth';
import { performSync } from '@/lib/sync-handler';

/**
 * Login action - verifies password and creates session
 */
export async function loginAction(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!verifyDashboardPassword(password)) {
      return {
        success: false,
        error: 'Invalid password',
      };
    }

    await createSession();

    return { success: true };
  } catch (error) {
    console.error('[Action] Login error:', error);
    return {
      success: false,
      error: 'Login failed',
    };
  }
}

/**
 * Logout action - destroys session and redirects to login
 */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}

/**
 * Trigger sync action - performs a manual sync
 * Requires valid session
 */
export async function triggerSyncAction(): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Validate session
    const isValid = await validateSession();
    if (!isValid) {
      return {
        success: false,
        error: 'Unauthorized - please login again',
      };
    }

    console.log('[Action] Manual sync triggered via dashboard');

    const result = await performSync();

    return {
      success: result.success,
      error: result.error,
      data: result,
    };
  } catch (error) {
    console.error('[Action] Trigger sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}
