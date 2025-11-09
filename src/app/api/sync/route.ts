/**
 * POST /api/sync
 * Triggers an immediate sync operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { performSync } from '@/lib/sync-handler';

// Prevent multiple simultaneous syncs
let syncInProgress = false;

export async function POST(request: NextRequest) {
  // Validate API key
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  // Check if sync is already in progress
  if (syncInProgress) {
    return NextResponse.json(
      {
        success: false,
        error: 'Sync already in progress',
      },
      { status: 409 }
    );
  }

  try {
    syncInProgress = true;
    console.log('[API /sync] Manual sync triggered');

    const result = await performSync();

    return NextResponse.json({
      success: result.success,
      data: result,
    }, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('[API /sync] Error during sync:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  } finally {
    syncInProgress = false;
  }
}

// Export runtime config for Vercel - increase timeout for scraping
export const maxDuration = 300; // 5 minutes (max for Pro plan, adjust if needed)
export const dynamic = 'force-dynamic';
