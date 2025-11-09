/**
 * GET /api/cron
 * Cron job endpoint triggered by Vercel Cron
 * Runs on schedule defined in vercel.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { performSync } from '@/lib/sync-handler';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    // In production, Vercel adds a special header for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Scheduled sync started');

    const result = await performSync();

    console.log('[Cron] Scheduled sync completed', {
      success: result.success,
      filename: result.filename,
      error: result.error,
    });

    return NextResponse.json({
      success: result.success,
      data: result,
    }, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('[Cron] Error during scheduled sync:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cron job failed',
      },
      { status: 500 }
    );
  }
}

// Export runtime config for Vercel - increase timeout for scraping
export const maxDuration = 300; // 5 minutes (max for Pro plan, adjust if needed)
export const dynamic = 'force-dynamic';
