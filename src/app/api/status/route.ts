/**
 * GET /api/status
 * Returns service status information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { getSyncStatus, listReports } from '@/lib/blob-storage';
import { validateScraperConfig } from '@/lib/tandem-scraper';
import type { ServiceStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  // Validate API key
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    // Get last sync status
    const lastSync = await getSyncStatus();

    // Get report count
    const reports = await listReports();

    // Check if service is properly configured
    const configValidation = validateScraperConfig();
    const isConfigured = configValidation.valid && !!process.env.API_KEY;

    // Calculate next scheduled sync (every 12 hours based on vercel.json)
    // This is approximate - actual scheduling is handled by Vercel
    let nextScheduledSync: string | null = null;
    if (lastSync?.timestamp) {
      const lastSyncDate = new Date(lastSync.timestamp);
      const nextSync = new Date(lastSyncDate.getTime() + 12 * 60 * 60 * 1000);
      nextScheduledSync = nextSync.toISOString();
    }

    const status: ServiceStatus = {
      configured: isConfigured,
      lastSyncTime: lastSync?.timestamp || null,
      lastSyncSuccess: lastSync?.success ?? null,
      lastSyncError: lastSync?.error || null,
      reportCount: reports.length,
      nextScheduledSync,
    };

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[API /status] Error getting status:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
