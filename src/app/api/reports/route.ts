/**
 * GET /api/reports
 * Lists all available CSV reports with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { listReports } from '@/lib/blob-storage';

export async function GET(request: NextRequest) {
  // Validate API key
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const reports = await listReports();

    return NextResponse.json({
      success: true,
      data: {
        reports,
        count: reports.length,
      },
    });
  } catch (error) {
    console.error('[API /reports] Error listing reports:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list reports',
      },
      { status: 500 }
    );
  }
}
