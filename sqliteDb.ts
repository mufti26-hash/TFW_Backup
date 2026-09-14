import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

export interface SqliteDbStats {
  version: number;
  lastUpdated: string;
  ridesCount: number;
  staffCount: number;
  countersCount: number;
  packagesCount: number;
  ticketsCount: number;
  operationalDatesCount: number;
  historyLogsCount: number;
}

let sqliteInstance: DatabaseSync | null = null;
const DEFAULT_SQLITE_PATH = path.join(process.cwd(), 'data', 'tfw.db');

/**
 * Initialize SQLite Database connection and create schema
 */
export function getSqliteDatabase(dbPath: string = DEFAULT_SQLITE_PATH): DatabaseSync {
  if (sqliteInstance) {
    return sqliteInstance;
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Performance optimizations for high-concurrency operations
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
  } catch (e) {
    console.warn('Note on SQLite PRAGMAs:', e);
  }

  // Create Tables & Indexes
  db.exec(`
    -- 1. System Metadata & Config
    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      last_updated TEXT NOT NULL,
      config_json TEXT NOT NULL,
      whatsapp_config TEXT,
      app_config TEXT,
      deleted_ticket_ids TEXT,
      deleted_wa_msg_ids TEXT
    );

    -- 2. Master Catalog Tables
    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      floor TEXT,
      capacity INTEGER,
      status TEXT DEFAULT 'active',
      min_height TEXT,
      notes TEXT,
      image_url TEXT,
      updated_at TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY,
      department TEXT NOT NULL, -- 'operator', 'sales', 'maintenance', 'cx'
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT,
      active INTEGER DEFAULT 1,
      notes TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS counters (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      location TEXT,
      active INTEGER DEFAULT 1,
      price REAL,
      ticket_price REAL,
      counter_number TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      raw_json TEXT
    );

    -- 3. Operational: Maintenance Tickets
    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      ride_id INTEGER,
      ride_name TEXT NOT NULL,
      problem TEXT NOT NULL,
      status TEXT NOT NULL, -- 'reported', 'in-progress', 'solved'
      priority TEXT DEFAULT 'normal',
      source TEXT DEFAULT 'operator',
      reported_by_id INTEGER,
      reported_by_name TEXT,
      reported_by_role TEXT,
      assigned_to_id INTEGER,
      assigned_to_name TEXT,
      helper_ids TEXT,
      helper_names TEXT,
      guest_details TEXT,
      reported_at TEXT NOT NULL,
      in_progress_at TEXT,
      solved_at TEXT,
      resolution_notes TEXT,
      solution_image_url TEXT,
      photo_url TEXT,
      whatsapp_group TEXT,
      whatsapp_chat_id TEXT,
      whatsapp_message_id TEXT,
      updated_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_date ON maintenance_tickets(date);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON maintenance_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_ride ON maintenance_tickets(ride_id);

    -- 4. Date-Indexed Operations (Attendance, Counts, Assignments, Sales)
    CREATE TABLE IF NOT EXISTS daily_operations (
      operational_date TEXT PRIMARY KEY,
      attendance TEXT,
      operator_assignments TEXT,
      ticket_sales_assignments TEXT,
      daily_counts TEXT,
      ticket_sales_data TEXT,
      package_sales TEXT,
      updated_at TEXT NOT NULL
    );

    -- 5. Audit History Log
    CREATE TABLE IF NOT EXISTS history_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id INTEGER,
      timestamp TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_logs(timestamp);
  `);

  sqliteInstance = db;
  return db;
}

/**
 * Helper to normalize key-value map or array of entities into array with IDs
 */
function normalizeEntityList(container: any): Array<{ id: string | number; [key: string]: any }> {
  if (!container) return [];
  if (Array.isArray(container)) {
    return container
      .filter(item => item != null)
      .map((item, index) => ({
        id: item.id != null ? item.id : index + 1,
        ...item
      }));
  }
  if (typeof container === 'object') {
    return Object.entries(container)
      .filter(([_, val]) => val != null)
      .map(([id, val]: [string, any]) => ({
        id: isNaN(Number(id)) ? id : Number(id),
        ...(typeof val === 'object' ? val : { value: val })
      }));
  }
  return [];
}

/**
 * Extract all maintenance tickets from either flat map or date-nested maps
 */
function extractAllTickets(rawTickets: any, fallbackDate: string): any[] {
  if (!rawTickets || typeof rawTickets !== 'object') return [];
  const results: any[] = [];

  for (const [key, val] of Object.entries(rawTickets)) {
    if (!val || typeof val !== 'object') continue;

    // Check if this object is a ticket directly
    if ((val as any).id && ((val as any).problem || (val as any).status || (val as any).reportedAt)) {
      results.push({
        date: (val as any).date || (key.startsWith('202') ? key.slice(0, 10) : fallbackDate),
        ...(val as any)
      });
    } else {
      // It's a sub-map (e.g. key is a date like '2026-09-05')
      for (const [subId, subVal] of Object.entries(val as object)) {
        if (subVal && typeof subVal === 'object') {
          results.push({
            id: (subVal as any).id || subId,
            date: (subVal as any).date || (key.startsWith('202') ? key.slice(0, 10) : fallbackDate),
            ...(subVal as any)
          });
        }
      }
    }
  }

  return results;
}

/**
 * Persist the entire application database state into SQLite atomically
 */
export function saveToSqlite(appDb: any, dbPath: string = DEFAULT_SQLITE_PATH): void {
  if (!appDb || !appDb.config || !appDb.data) return;

  const db = getSqliteDatabase(dbPath);
  const version = Number(appDb.version) || 1;
  const lastUpdated = String(appDb.lastUpdated || new Date().toISOString());
  const config = appDb.config || {};
  const data = appDb.data || {};

  db.exec('BEGIN IMMEDIATE;');

  try {
    // 1. System Config
    const stmtConfig = db.prepare(`
      INSERT OR REPLACE INTO system_config (
        id, version, last_updated, config_json, whatsapp_config, app_config, deleted_ticket_ids, deleted_wa_msg_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmtConfig.run(
      'primary',
      version,
      lastUpdated,
      JSON.stringify(config),
      JSON.stringify(config.whatsappConfig || {}),
      JSON.stringify(config.appConfig || {}),
      JSON.stringify(config.deletedTicketIds || []),
      JSON.stringify(config.deletedWhatsAppMessageIds || [])
    );

    // 2. Rides
    const stmtRide = db.prepare(`
      INSERT OR REPLACE INTO rides (
        id, name, floor, capacity, status, min_height, notes, image_url, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const rides = normalizeEntityList(config.rides);
    for (const r of rides) {
      if (r.id == null) continue;
      stmtRide.run(
        Number(r.id),
        String(r.name || `Ride #${r.id}`),
        r.floor ? String(r.floor) : null,
        r.capacity != null ? Number(r.capacity) : null,
        String(r.status || 'active'),
        r.minHeight ? String(r.minHeight) : null,
        r.notes ? String(r.notes) : null,
        r.imageUrl ? String(r.imageUrl) : null,
        r.updatedAt ? String(r.updatedAt) : lastUpdated,
        JSON.stringify(r)
      );
    }

    // 3. Staff across all departments
    const stmtStaff = db.prepare(`
      INSERT OR REPLACE INTO staff (
        id, department, name, phone, role, active, notes, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const staffCategories: Array<{ list: any[]; dept: string }> = [
      { list: normalizeEntityList(config.operators), dept: 'operator' },
      { list: normalizeEntityList(config.ticketSalesPersonnel), dept: 'sales' },
      { list: normalizeEntityList(config.maintenancePersonnel), dept: 'maintenance' },
      { list: normalizeEntityList(config.cxPersonnel), dept: 'cx' }
    ];

    for (const { list, dept } of staffCategories) {
      for (const s of list) {
        if (s.id == null) continue;
        stmtStaff.run(
          Number(s.id),
          dept,
          String(s.name || `Staff #${s.id}`),
          s.phone ? String(s.phone) : null,
          s.role ? String(s.role) : null,
          s.active !== false ? 1 : 0,
          s.notes ? String(s.notes) : null,
          JSON.stringify(s)
        );
      }
    }

    // 4. Counters
    const stmtCounter = db.prepare(`
      INSERT OR REPLACE INTO counters (
        id, name, type, location, active, price, ticket_price, counter_number, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const counters = normalizeEntityList(config.counters);
    for (const c of counters) {
      if (c.id == null) continue;
      stmtCounter.run(
        Number(c.id),
        String(c.name || `Counter #${c.id}`),
        c.type ? String(c.type) : null,
        c.location ? String(c.location) : null,
        c.active !== false ? 1 : 0,
        c.price != null ? Number(c.price) : null,
        c.ticketPrice != null ? Number(c.ticketPrice) : null,
        c.counterNumber != null ? String(c.counterNumber) : null,
        JSON.stringify(c)
      );
    }

    // 5. Packages
    const stmtPackage = db.prepare(`
      INSERT OR REPLACE INTO packages (
        id, name, price, category, description, active, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const packages = normalizeEntityList(config.packages);
    for (const p of packages) {
      if (p.id == null) continue;
      stmtPackage.run(
        String(p.id),
        String(p.name || 'Package'),
        Number(p.price) || 0,
        p.category ? String(p.category) : null,
        p.description ? String(p.description) : null,
        p.active !== false ? 1 : 0,
        JSON.stringify(p)
      );
    }

    // 6. Maintenance Tickets (Unpacked and normalized)
    const stmtTicket = db.prepare(`
      INSERT OR REPLACE INTO maintenance_tickets (
        id, date, ride_id, ride_name, problem, status, priority, source,
        reported_by_id, reported_by_name, reported_by_role, assigned_to_id, assigned_to_name,
        helper_ids, helper_names, guest_details, reported_at, in_progress_at, solved_at,
        resolution_notes, solution_image_url, photo_url, whatsapp_group, whatsapp_chat_id,
        whatsapp_message_id, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tickets = extractAllTickets(data.maintenanceTickets, lastUpdated.slice(0, 10));
    for (const t of tickets) {
      if (!t || !t.id) continue;
      stmtTicket.run(
        String(t.id),
        String(t.date || lastUpdated.slice(0, 10)),
        t.rideId != null ? Number(t.rideId) : null,
        String(t.rideName || 'Unknown Ride'),
        String(t.problem || ''),
        String(t.status || 'reported'),
        String(t.priority || 'normal'),
        String(t.source || 'operator'),
        t.reportedById != null ? Number(t.reportedById) : null,
        t.reportedByName ? String(t.reportedByName) : null,
        t.reportedByRole ? String(t.reportedByRole) : null,
        t.assignedToId != null ? Number(t.assignedToId) : null,
        t.assignedToName ? String(t.assignedToName) : null,
        t.helperIds ? JSON.stringify(t.helperIds) : null,
        t.helperNames ? JSON.stringify(t.helperNames) : null,
        t.guestDetails ? String(t.guestDetails) : null,
        String(t.reportedAt || lastUpdated),
        t.inProgressAt ? String(t.inProgressAt) : null,
        t.solvedAt ? String(t.solvedAt) : null,
        t.resolutionNotes ? String(t.resolutionNotes) : null,
        t.solutionImageUrl ? String(t.solutionImageUrl) : null,
        t.photoUrl ? String(t.photoUrl) : null,
        t.whatsappGroup ? String(t.whatsappGroup) : null,
        t.whatsappChatId ? String(t.whatsappChatId) : null,
        t.whatsappMessageId ? String(t.whatsappMessageId) : null,
        t.updatedAt ? String(t.updatedAt) : lastUpdated,
        JSON.stringify(t)
      );
    }

    // 7. Date-Indexed Daily Operations
    const stmtDailyOp = db.prepare(`
      INSERT OR REPLACE INTO daily_operations (
        operational_date, attendance, operator_assignments, ticket_sales_assignments, daily_counts, ticket_sales_data, package_sales, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const allDates = new Set<string>([
      ...Object.keys(data.attendance || {}),
      ...Object.keys(data.operatorAssignments || {}),
      ...Object.keys(data.ticketSalesAssignments || {}),
      ...Object.keys(data.dailyCounts || {}),
      ...Object.keys(data.ticketSalesData || {}),
      ...Object.keys(data.packageSales || {})
    ]);

    for (const date of allDates) {
      stmtDailyOp.run(
        date,
        JSON.stringify(data.attendance?.[date] || {}),
        JSON.stringify(data.operatorAssignments?.[date] || {}),
        JSON.stringify(data.ticketSalesAssignments?.[date] || {}),
        JSON.stringify(data.dailyCounts?.[date] || {}),
        JSON.stringify(data.ticketSalesData?.[date] || {}),
        JSON.stringify(data.packageSales?.[date] || {}),
        lastUpdated
      );
    }

    // 8. History Logs
    if (Array.isArray(data.historyLog)) {
      db.exec('DELETE FROM history_logs;');
      const stmtHistory = db.prepare(`
        INSERT INTO history_logs (log_id, timestamp, user_name, action, details)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const h of data.historyLog) {
        if (!h) continue;
        stmtHistory.run(
          h.id != null ? Number(h.id) : null,
          String(h.timestamp || lastUpdated),
          String(h.user || 'system'),
          String(h.action || 'update'),
          typeof h.details === 'object' ? JSON.stringify(h.details) : String(h.details || '')
        );
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Failed to save state to SQLite database:', err);
    throw err;
  }
}

/**
 * Load complete application database state from SQLite
 */
export function loadFromSqlite(dbPath: string = DEFAULT_SQLITE_PATH): any | null {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  const db = getSqliteDatabase(dbPath);

  try {
    const configRow = db.prepare('SELECT * FROM system_config WHERE id = ?').get('primary') as any;
    if (!configRow) {
      return null;
    }

    let config: any = {};
    try {
      config = JSON.parse(configRow.config_json);
    } catch {
      config = {};
    }

    // Reconstruct catalog items from normalized tables
    const ridesRows = db.prepare('SELECT * FROM rides ORDER BY id ASC').all() as any[];
    if (ridesRows && ridesRows.length > 0) {
      // Keep original format (dictionary by ID if original was dictionary)
      const isOriginalDictionary = typeof config.rides === 'object' && !Array.isArray(config.rides);
      if (isOriginalDictionary) {
        const rideMap: Record<string, any> = {};
        for (const r of ridesRows) {
          try {
            rideMap[String(r.id)] = r.raw_json ? JSON.parse(r.raw_json) : { id: r.id, name: r.name, floor: r.floor, status: r.status };
          } catch {
            rideMap[String(r.id)] = { id: r.id, name: r.name, floor: r.floor, status: r.status };
          }
        }
        config.rides = rideMap;
      } else {
        config.rides = ridesRows.map(r => {
          try {
            return r.raw_json ? JSON.parse(r.raw_json) : { id: r.id, name: r.name, floor: r.floor, status: r.status };
          } catch {
            return { id: r.id, name: r.name, floor: r.floor, status: r.status };
          }
        });
      }
    }

    // Staff
    const staffRows = db.prepare('SELECT * FROM staff ORDER BY id ASC').all() as any[];
    if (staffRows && staffRows.length > 0) {
      const opsMap: Record<string, any> = {};
      const salesMap: Record<string, any> = {};
      const maintMap: Record<string, any> = {};
      const cxMap: Record<string, any> = {};

      for (const s of staffRows) {
        let item: any;
        try {
          item = s.raw_json ? JSON.parse(s.raw_json) : { id: s.id, name: s.name, role: s.role, active: !!s.active };
        } catch {
          item = { id: s.id, name: s.name, role: s.role, active: !!s.active };
        }

        if (s.department === 'operator') opsMap[String(s.id)] = item;
        else if (s.department === 'sales') salesMap[String(s.id)] = item;
        else if (s.department === 'maintenance') maintMap[String(s.id)] = item;
        else if (s.department === 'cx') cxMap[String(s.id)] = item;
      }

      if (Object.keys(opsMap).length) config.operators = opsMap;
      if (Object.keys(salesMap).length) config.ticketSalesPersonnel = salesMap;
      if (Object.keys(maintMap).length) config.maintenancePersonnel = maintMap;
      if (Object.keys(cxMap).length) config.cxPersonnel = cxMap;
    }

    // Counters
    const countersRows = db.prepare('SELECT * FROM counters ORDER BY id ASC').all() as any[];
    if (countersRows && countersRows.length > 0) {
      const counterMap: Record<string, any> = {};
      for (const c of countersRows) {
        try {
          counterMap[String(c.id)] = c.raw_json ? JSON.parse(c.raw_json) : { id: c.id, name: c.name, active: !!c.active };
        } catch {
          counterMap[String(c.id)] = { id: c.id, name: c.name, active: !!c.active };
        }
      }
      config.counters = counterMap;
    }

    // Packages
    const packageRows = db.prepare('SELECT * FROM packages ORDER BY id ASC').all() as any[];
    if (packageRows && packageRows.length > 0) {
      config.packages = packageRows.map(p => {
        try {
          return p.raw_json ? JSON.parse(p.raw_json) : { id: p.id, name: p.name, price: p.price };
        } catch {
          return { id: p.id, name: p.name, price: p.price };
        }
      });
    }

    // Reconstruct Data Object
    const data: any = {
      attendance: {},
      operatorAssignments: {},
      ticketSalesAssignments: {},
      dailyCounts: {},
      ticketSalesData: {},
      packageSales: {},
      maintenanceTickets: {},
      historyLog: []
    };

    // Reconstruct Maintenance Tickets nested by date (matching app convention)
    const ticketRows = db.prepare('SELECT * FROM maintenance_tickets ORDER BY date DESC, reported_at DESC').all() as any[];
    for (const t of ticketRows) {
      const date = t.date || 'unknown';
      if (!data.maintenanceTickets[date]) {
        data.maintenanceTickets[date] = {};
      }
      try {
        data.maintenanceTickets[date][t.id] = t.raw_json ? JSON.parse(t.raw_json) : {
          id: t.id,
          date: t.date,
          rideName: t.ride_name,
          problem: t.problem,
          status: t.status
        };
      } catch {
        data.maintenanceTickets[date][t.id] = { id: t.id, date: t.date, rideName: t.ride_name, problem: t.problem, status: t.status };
      }
    }

    // Daily Operations
    const dailyRows = db.prepare('SELECT * FROM daily_operations').all() as any[];
    for (const row of dailyRows) {
      const d = row.operational_date;
      if (!d) continue;
      if (row.attendance) try { data.attendance[d] = JSON.parse(row.attendance); } catch {}
      if (row.operator_assignments) try { data.operatorAssignments[d] = JSON.parse(row.operator_assignments); } catch {}
      if (row.ticket_sales_assignments) try { data.ticketSalesAssignments[d] = JSON.parse(row.ticket_sales_assignments); } catch {}
      if (row.daily_counts) try { data.dailyCounts[d] = JSON.parse(row.daily_counts); } catch {}
      if (row.ticket_sales_data) try { data.ticketSalesData[d] = JSON.parse(row.ticket_sales_data); } catch {}
      if (row.package_sales) try { data.packageSales[d] = JSON.parse(row.package_sales); } catch {}
    }

    // History Logs
    const historyRows = db.prepare('SELECT * FROM history_logs ORDER BY id ASC LIMIT 500').all() as any[];
    data.historyLog = historyRows.map(h => {
      let details = h.details;
      try { details = JSON.parse(h.details); } catch {}
      return {
        id: h.log_id || h.id,
        timestamp: h.timestamp,
        user: h.user_name,
        action: h.action,
        details
      };
    });

    return {
      version: Number(configRow.version) || 1,
      lastUpdated: String(configRow.last_updated),
      config,
      data
    };
  } catch (err) {
    console.error('Error loading data from SQLite:', err);
    return null;
  }
}

/**
 * Get summary stats from SQLite
 */
export function getSqliteStats(dbPath: string = DEFAULT_SQLITE_PATH): SqliteDbStats | null {
  if (!fs.existsSync(dbPath)) return null;
  const db = getSqliteDatabase(dbPath);

  try {
    const configRow = db.prepare('SELECT version, last_updated FROM system_config WHERE id = ?').get('primary') as any;
    const rides = (db.prepare('SELECT count(*) as c FROM rides').get() as any)?.c || 0;
    const staff = (db.prepare('SELECT count(*) as c FROM staff').get() as any)?.c || 0;
    const counters = (db.prepare('SELECT count(*) as c FROM counters').get() as any)?.c || 0;
    const packages = (db.prepare('SELECT count(*) as c FROM packages').get() as any)?.c || 0;
    const tickets = (db.prepare('SELECT count(*) as c FROM maintenance_tickets').get() as any)?.c || 0;
    const dates = (db.prepare('SELECT count(*) as c FROM daily_operations').get() as any)?.c || 0;
    const history = (db.prepare('SELECT count(*) as c FROM history_logs').get() as any)?.c || 0;

    return {
      version: configRow?.version || 1,
      lastUpdated: configRow?.last_updated || '',
      ridesCount: rides,
      staffCount: staff,
      countersCount: counters,
      packagesCount: packages,
      ticketsCount: tickets,
      operationalDatesCount: dates,
      historyLogsCount: history
    };
  } catch (err) {
    console.error('Failed to get SQLite stats:', err);
    return null;
  }
}
