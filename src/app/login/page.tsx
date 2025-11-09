/**
 * Login page for dashboard authentication
 */

import { redirect } from 'next/navigation';
import Login from '@/components/Login';
import { loginAction } from '@/app/actions';
import { validateSession, isDashboardAuthRequired } from '@/lib/dashboard-auth';

export default async function LoginPage() {
  // If auth is not required, redirect to home
  if (!isDashboardAuthRequired()) {
    redirect('/');
  }

  // If already logged in, redirect to home
  const isValid = await validateSession();
  if (isValid) {
    redirect('/');
  }

  // Server-side function to handle login
  async function handleLogin(password: string) {
    'use server';

    const result = await loginAction(password);

    if (result.success) {
      redirect('/');
    }

    return result;
  }

  return <Login onLogin={handleLogin} />;
}

export const dynamic = 'force-dynamic';
