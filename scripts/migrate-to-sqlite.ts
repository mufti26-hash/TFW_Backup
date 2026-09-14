import path from 'path';
import fs from 'fs';
import { saveToSqlite, getSqliteStats, getSqliteDatabase } from '../sqliteDb';

interface MigrationResult {
  success: boolean;
  durationSeconds: number;
  sourceFile: string;
  targetDb: string;
  stats: any;
}

export function runMigration(
  sourcePath: string = path.join(process.cwd(), 'data', 'database.json'),
  targetPath: string = path.join(process.cwd(), 'data', 'tfw.db')
): MigrationResult {
  const startTime = Date.now();

  console.log(`=======================================================`);
  console.log(`🚀 TOGGI FUN WORLD - SQLITE DATABASE MIGRATION TOOL`);
  console.log(`=======================================================`);
  console.log(`📂 Source Export: ${sourcePath}`);
  console.log(`💾 Target SQLite: ${targetPath}`);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found at: ${sourcePath}`);
  }

  // Pre-flight check: ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Backup existing SQLite database if present
  if (fs.existsSync(targetPath)) {
    const backupTarget = `${targetPath}.bak.${Date.now()}`;
    console.log(`⚠️ Existing SQLite database found. Creating backup: ${path.basename(backupTarget)}`);
    fs.copyFileSync(targetPath, backupTarget);
  }

  console.log(`⏳ Reading source JSON file...`);
  const rawData = fs.readFileSync(sourcePath, 'utf-8');
  const appData = JSON.parse(rawData);

  if (!appData || (!appData.config && !appData.data)) {
    throw new Error(`Invalid source JSON format. Expected root object with 'config' or 'data'.`);
  }

  console.log(`📊 Validating data structure...`);
  const ridesCount = Array.isArray(appData.config?.rides) ? appData.config.rides.length : 0;
  const ticketsCount = appData.data?.maintenanceTickets ? Object.keys(appData.data.maintenanceTickets).length : 0;
  console.log(`   - Config version: ${appData.version || 1}`);
  console.log(`   - Detected rides: ${ridesCount}`);
  console.log(`   - Detected tickets: ${ticketsCount}`);

  console.log(`⚡ Initializing SQLite schema and importing records atomically...`);
  // Ensure tables exist
  getSqliteDatabase(targetPath);

  // Perform full atomic write
  saveToSqlite(appData, targetPath);

  // Verify and collect stats
  const stats = getSqliteStats(targetPath);
  const duration = (Date.now() - startTime) / 1000;

  console.log(`\n=======================================================`);
  console.log(`🎉 MIGRATION COMPLETED SUCCESSFULLY IN ${duration.toFixed(2)}s`);
  console.log(`=======================================================`);
  if (stats) {
    console.log(`📈 SQLite Database Summary:`);
    console.log(`   • Version:            ${stats.version}`);
    console.log(`   • Last Updated:       ${stats.lastUpdated}`);
    console.log(`   • Rides:              ${stats.ridesCount}`);
    console.log(`   • Staff Members:      ${stats.staffCount}`);
    console.log(`   • Counters:           ${stats.countersCount}`);
    console.log(`   • Packages:           ${stats.packagesCount}`);
    console.log(`   • Maint. Tickets:     ${stats.ticketsCount}`);
    console.log(`   • Operational Dates:  ${stats.operationalDatesCount}`);
    console.log(`   • History Audit Logs: ${stats.historyLogsCount}`);
  }

  return {
    success: true,
    durationSeconds: duration,
    sourceFile: sourcePath,
    targetDb: targetPath,
    stats
  };
}

// Run if called as CLI script
const isMain = process.argv[1] && (
  process.argv[1].endsWith('migrate-to-sqlite.ts') || 
  process.argv[1].endsWith('migrate-to-sqlite.js')
);

if (isMain) {
  const customSource = process.argv[2];
  const customTarget = process.argv[3];
  try {
    runMigration(customSource, customTarget);
  } catch (err: any) {
    console.error(`\n❌ Migration failed:`, err.message || err);
    process.exit(1);
  }
}
