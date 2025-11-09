/**
 * Main page - conditionally renders Setup Wizard or Dashboard
 * based on whether the service is configured
 */

import SetupWizard from '@/components/SetupWizard';
import Dashboard from '@/components/Dashboard';
import { validateScraperConfig } from '@/lib/tandem-scraper';

export default function Home() {
  // Check if the service is configured
  const apiKey = process.env.API_KEY;
  const configValidation = validateScraperConfig();
  const isConfigured = !!apiKey && configValidation.valid;

  // Show setup wizard if not configured
  if (!isConfigured) {
    return <SetupWizard />;
  }

  // Show dashboard if configured
  return <Dashboard />;
}

// Disable static optimization to check env vars on each request
export const dynamic = 'force-dynamic';
