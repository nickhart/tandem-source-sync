/**
 * Authentication utilities for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the API key from the request headers
 * @param request - The incoming Next.js request
 * @returns true if valid, false otherwise
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_KEY;

  // If no API key is configured, deny access
  if (!apiKey) {
    return false;
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token === apiKey;
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader === apiKey;
  }

  return false;
}

/**
 * Returns an unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized - Invalid or missing API key',
    },
    { status: 401 }
  );
}

/**
 * Middleware helper that validates API key and returns error response if invalid
 * @param request - The incoming request
 * @returns null if valid, error response if invalid
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  if (!validateApiKey(request)) {
    return unauthorizedResponse();
  }
  return null;
}

/**
 * Generates a secure random API key
 * @param length - Length of the key (default: 32)
 * @returns Random hex string
 */
export function generateApiKey(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
