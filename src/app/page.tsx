/**
 * Main page - conditionally renders Setup Wizard or Dashboard
 * based on whether the service is configured
 * Includes authentication check if DASHBOARD_PASSWORD is set
 */

import { redirect } from 'next/navigation';
import SetupWizard from '@/components/SetupWizard';
import Dashboard from '@/components/Dashboard';
import { validateScraperConfig } from '@/lib/tandem-scraper';
import { validateSession, isDashboardAuthRequired } from '@/lib/dashboard-auth';
import { getSyncStatus, listReports } from '@/lib/blob-storage';
import type { ServiceStatus, ReportMetadata } from '@/lib/types';

export default async function Home() {
  // Check if the service is configured
  const apiKey = process.env.API_KEY;
  const configValidation = validateScraperConfig();
  const isConfigured = !!apiKey && configValidation.valid;

  // Show setup wizard if not configured
  if (!isConfigured) {
    return <SetupWizard />;
  }

  // Check authentication if required
  if (isDashboardAuthRequired()) {
    const isValid = await validateSession();
    if (!isValid) {
      redirect('/login');
    }
  }

  // Fetch real data for the dashboard
  let status: ServiceStatus | null = null;
  let reports: ReportMetadata[] = [];
  let error: string | null = null;

  try {
    // Get sync status
    const lastSync = await getSyncStatus();

    // Get reports
    reports = await listReports();

    // Build status object
    status = {
      configured: isConfigured,
      lastSyncTime: lastSync?.timestamp || null,
      lastSyncSuccess: lastSync?.success ?? null,
      lastSyncError: lastSync?.error || null,
      reportCount: reports.length,
      nextScheduledSync: lastSync?.timestamp
        ? new Date(new Date(lastSync.timestamp).getTime() + 12 * 60 * 60 * 1000).toISOString()
        : null,
    };
  } catch (err) {
    console.error('[Home] Error fetching dashboard data:', err);
    error = err instanceof Error ? err.message : 'Failed to load dashboard data';
  }

  // Show dashboard with real data
  return <Dashboard status={status} reports={reports} error={error} />;
}

// Disable static optimization to check env vars and session on each request
export const dynamic = 'force-dynamic';
