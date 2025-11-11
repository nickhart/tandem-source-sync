/**
 * Local test script for Tandem Source scraper
 * Run with: npx tsx test-scraper.ts
 *
 * This bypasses Vercel Blob and saves CSV locally for debugging
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { scrapeTandemSource } from './src/lib/tandem-scraper';

async function main() {
  console.log('=== Tandem Source Scraper Test ===\n');

  // Check environment variables
  const username = process.env.TANDEM_USERNAME;
  const password = process.env.TANDEM_PASSWORD;
  const reportDays = parseInt(process.env.REPORT_DAYS || '2', 10);

  if (!username || !password) {
    console.error('❌ Missing required environment variables:');
    console.error('   TANDEM_USERNAME and TANDEM_PASSWORD must be set in .env.local');
    console.error('\nCreate .env.local with:');
    console.error('   TANDEM_USERNAME=your-email@example.com');
    console.error('   TANDEM_PASSWORD=your-password');
    console.error('   REPORT_DAYS=2');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Username: ${username.substring(0, 3)}***`);
  console.log(`  Report Days: ${reportDays}`);
  console.log(`  Environment: ${process.env.VERCEL_ENV || 'local'}\n`);

  try {
    console.log('🚀 Starting scrape...\n');

    if (process.env.DEBUG_BROWSER === 'true') {
      console.log('⚠️  DEBUG_BROWSER=true - Running with VISIBLE browser');
      console.log('⚠️  Browser will stay open on error for inspection\n');
    }

    const result = await scrapeTandemSource({
      username,
      password,
      reportDays,
      timeout: 180000, // 3 minutes
    });

    if (result.success && result.csvBuffer) {
      // Save to local file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `tandem-report-${timestamp}.csv`;
      const outputPath = path.join(__dirname, 'downloads', filename);

      // Ensure downloads directory exists
      await fs.mkdir(path.join(__dirname, 'downloads'), { recursive: true });

      // Write CSV file
      await fs.writeFile(outputPath, result.csvBuffer);

      console.log('\n✅ SUCCESS!');
      console.log(`   CSV saved to: ${outputPath}`);
      console.log(`   Size: ${result.csvBuffer.length} bytes`);
      console.log(`   Date range: ${result.metadata?.startDate} to ${result.metadata?.endDate}`);
    } else {
      console.error('\n❌ FAILED!');
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ EXCEPTION!');
    console.error(error);
    process.exit(1);
  }
}

main();
