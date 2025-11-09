/**
 * GET /api/reports/[filename]
 * Downloads a specific CSV report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { listReports } from '@/lib/blob-storage';

interface RouteParams {
  params: Promise<{
    filename: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // Validate API key
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const { filename } = await params;

    // Security: Validate filename to prevent path traversal
    if (!filename || filename.includes('/') || filename.includes('..')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filename',
        },
        { status: 400 }
      );
    }

    // Verify the file exists by checking our report list
    const reports = await listReports();
    const report = reports.find(r => r.filename === filename);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report not found',
        },
        { status: 404 }
      );
    }

    // Fetch the file from blob storage
    const response = await fetch(report.url);

    if (!response.ok) {
      throw new Error('Failed to fetch report from storage');
    }

    const csvContent = await response.text();

    // Return the CSV file with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(csvContent.length),
      },
    });
  } catch (error) {
    console.error('[API /reports/[filename]] Error downloading report:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download report',
      },
      { status: 500 }
    );
  }
}
