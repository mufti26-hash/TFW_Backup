import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, terminate, setLogLevel } from 'firebase/firestore';
import { 
  RIDES, 
  OPERATORS, 
  TICKET_SALES_PERSONNEL, 
  COUNTERS, 
  MAINTENANCE_PERSONNEL, 
  CX_PERSONNEL,
  FLOORS, 
  DEFAULT_PACKAGES,
  DEFAULT_APP_CONFIG,
  DEFAULT_STAFF_ROLES,
  getDhakaDateString,
  formatDhakaTime
} from './constants';

// Ensure production mode if running from compiled server.cjs bundle
if (typeof __filename !== 'undefined' && __filename.endsWith('.cjs')) {
  process.env.NODE_ENV = 'production';
}

// Global exception guards to prevent unexpected container crashes
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception in server process:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection in server process:', reason);
});

// Silence background gRPC and Firestore client stream error logs
try {
  setLogLevel('silent');
} catch (e) {
  // ignore
}

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const QUOTA_FILE = path.join(DATA_DIR, 'firestore_quota.json');

// Initialize Data Directory
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data directory:', e);
  }
}

// -------------------------------------------------------------
// Firebase Firestore Cloud Persistence Layer & Quota Guard
// -------------------------------------------------------------
let firestoreDb: any = null;
let isFirestoreReady = false;
let firestoreSyncTimeout: NodeJS.Timeout | null = null;
let lastFirestoreSenderId: string | null = null;
let firestoreQuotaExceededUntil = 0;
let hasLoggedQuotaWarning = false;

// Check if quota limit was already reached today
try {
  if (fs.existsSync(QUOTA_FILE)) {
    const qData = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf-8'));
    if (qData && qData.blockedUntil && Number(qData.blockedUntil) > Date.now()) {
      firestoreQuotaExceededUntil = Number(qData.blockedUntil);
      console.log(`ℹ️ Firestore daily write quota limit active until ${new Date(firestoreQuotaExceededUntil).toISOString()}. Using high-speed local disk persistence.`);
    }
  }
} catch (e) {
  // ignore
}

function persistQuotaBlock(durationMs: number = 24 * 60 * 60 * 1000) {
  firestoreQuotaExceededUntil = Date.now() + durationMs;
  isFirestoreReady = false;
  const currentDb = firestoreDb;
  firestoreDb = null;
  if (currentDb) {
    try {
      terminate(currentDb).catch(() => {});
    } catch (e) {}
  }
  try {
    fs.writeFileSync(QUOTA_FILE, JSON.stringify({
      blockedUntil: firestoreQuotaExceededUntil,
      reason: 'Free daily write units per project (free tier database) quota limit reached',
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  } catch (e) {}
  if (!hasLoggedQuotaWarning) {
    console.warn('ℹ️ Firestore daily write quota limit reached. Closed background write streams cleanly. Operational engine continues seamlessly on local disk & real-time SSE stream.');
    hasLoggedQuotaWarning = true;
  }
}

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath) && Date.now() >= firestoreQuotaExceededUntil) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (firebaseConfig && firebaseConfig.apiKey) {
      const app = getApps().length === 0 
        ? initializeApp({
            apiKey: firebaseConfig.apiKey,
            authDomain: firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket,
            messagingSenderId: firebaseConfig.messagingSenderId,
            appId: firebaseConfig.appId,
          }, 'tfw-server-app')
        : getApp('tfw-server-app');

      firestoreDb = firebaseConfig.firestoreDatabaseId 
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);

      isFirestoreReady = true;
      console.log('✅ Firebase Firestore initialized successfully for cloud database:', firebaseConfig.firestoreDatabaseId || '(default)');
    }
  }
} catch (err) {
  console.warn('⚠️ Firebase Firestore server initialization warning:', err);
}

async function pushToFirestore(senderId?: string) {
  if (!firestoreDb || !memoryDb) return;
  if (Date.now() < firestoreQuotaExceededUntil) {
    return; // Active quota backoff, local disk and SSE stream handle real-time sync smoothly
  }
  try {
    const docRef = doc(firestoreDb, 'tfw_data', 'app_state');
    // Sanitize any undefined values before saving to Firestore
    const cleanDb = JSON.parse(JSON.stringify(memoryDb));
    const finalSenderId = senderId || lastFirestoreSenderId || null;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout after 3000ms')), 3000)
    );
    await Promise.race([
      setDoc(docRef, {
        ...cleanDb,
        _lastSenderId: finalSenderId,
        _cloudSavedAt: new Date().toISOString()
      }),
      timeoutPromise
    ]);
    hasLoggedQuotaWarning = false;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded') || msg.includes('quota') || msg.includes('timeout') || err?.code === 'resource-exhausted' || err?.code === 8) {
      persistQuotaBlock(24 * 60 * 60 * 1000); // 24h backoff until daily quota reset
    } else {
      console.warn('⚠️ Firestore sync note:', msg);
    }
  }
}

function scheduleFirestorePush(senderId?: string, immediate: boolean = false) {
  if (!isFirestoreReady) return;
  if (Date.now() < firestoreQuotaExceededUntil) return;
  if (senderId) lastFirestoreSenderId = senderId;
  if (firestoreSyncTimeout) clearTimeout(firestoreSyncTimeout);
  
  if (immediate) {
    firestoreSyncTimeout = null;
    pushToFirestore(lastFirestoreSenderId || undefined);
    return;
  }

  // Debounce writes by 1.5s to ensure permanent persistence quickly while protecting quota
  firestoreSyncTimeout = setTimeout(() => {
    firestoreSyncTimeout = null;
    pushToFirestore(lastFirestoreSenderId || undefined);
  }, 1500);
}

let firestoreUnsubscribe: (() => void) | null = null;

// Set of processed WhatsApp message IDs to prevent duplicate tickets
const processedWhatsAppMessageIds = new Set<string>();

function markWhatsAppMessageProcessed(messageId: string) {
  if (!messageId) return;
  processedWhatsAppMessageIds.add(String(messageId));
  try {
    const db = memoryDb;
    if (db) {
      if (!db.config) db.config = {};
      if (!db.config.whatsappConfig) db.config.whatsappConfig = {};
      if (!Array.isArray(db.config.whatsappConfig.processedMessageIds)) {
        db.config.whatsappConfig.processedMessageIds = [];
      }
      if (!db.config.whatsappConfig.processedMessageIds.includes(messageId)) {
        db.config.whatsappConfig.processedMessageIds.push(messageId);
        if (db.config.whatsappConfig.processedMessageIds.length > 2000) {
          db.config.whatsappConfig.processedMessageIds = db.config.whatsappConfig.processedMessageIds.slice(-2000);
        }
      }
    }
  } catch (e) {}
}

const DEFAULT_DELETED_TICKET_IDS: string[] = [
  '2026-09-06-101-1788770270',
  '2026-09-06-101-1788696676',
  '2026-09-04-101-1788510779',
  '2026-09-04-101-1788511166161'
];

const DEFAULT_DELETED_WA_MSG_IDS: string[] = [
  'AC1E17E1D769AFF3CC35230CA61100C1',
  'ACF53DBEEBEDDB3C658403B19B6D1911',
  'AC01468942F9A7C2C8584955E3FD1EA8'
];

const DEFAULT_DELETED_SIGNATURES: string[] = [
  'ride-101-level17paintballbunkerneedsair',
  'level17paintballbunkerneedsair',
  'paintballbunkerneedsairrefill',
  'bunkerneedsairrefill',
  'level17paintballbunker'
];

function isTicketDeleted(
  db: any,
  ticketId?: string,
  whatsappMessageId?: string,
  rideId?: number | string,
  problem?: string
): boolean {
  if (!db) return false;
  const config = db.config || {};
  const deletedTicketIds: string[] = [
    ...DEFAULT_DELETED_TICKET_IDS,
    ...(Array.isArray(config.deletedTicketIds) ? config.deletedTicketIds : [])
  ];
  const deletedWhatsAppMessageIds: string[] = [
    ...DEFAULT_DELETED_WA_MSG_IDS,
    ...(Array.isArray(config.deletedWhatsAppMessageIds) ? config.deletedWhatsAppMessageIds : [])
  ];
  const deletedSignatures: string[] = [
    ...DEFAULT_DELETED_SIGNATURES,
    ...(Array.isArray(config.deletedTicketSignatures) ? config.deletedTicketSignatures : [])
  ];

  if (ticketId && deletedTicketIds.includes(String(ticketId))) return true;
  if (whatsappMessageId && deletedWhatsAppMessageIds.includes(String(whatsappMessageId))) return true;

  // Live incoming WhatsApp messages with an idMessage must NEVER be blocked by problem text signatures.
  // Physical park rides repeatedly have similar issues (e.g. display problem, coin chamber, not working).
  if (whatsappMessageId) {
    return false;
  }

  if (problem) {
    const normProb = String(problem).toLowerCase().replace(/[^a-z0-9]/g, '');
    const numRide = rideId !== undefined && rideId !== null && String(rideId).trim() !== '' ? Number(rideId) : undefined;

    if (numRide && normProb.length > 5) {
      const sig = `ride-${numRide}-${normProb.slice(0, 30)}`;
      if (deletedSignatures.includes(sig)) return true;
    }
    for (const ds of deletedSignatures) {
      if (numRide && ds.startsWith(`ride-${numRide}-`)) {
        const sigProb = ds.replace(`ride-${numRide}-`, '');
        if (sigProb.length >= 8 && (normProb === sigProb || normProb.includes(sigProb))) {
          return true;
        }
      }
      const dsClean = ds.replace(/^ride-\d+-/, '');
      if (dsClean.length >= 12 && (normProb === dsClean || normProb.includes(dsClean))) {
        return true;
      }
    }

    if (
      normProb.includes('paintballbunkerneedsair') ||
      normProb.includes('bunkerneedsairrefill') ||
      normProb.includes('level17paintballbunker') ||
      normProb.includes('paintballbunker')
    ) {
      return true;
    }
  }
  return false;
}

function cleanupDeletedTicket(
  db: any,
  ticketId?: string,
  dateHint?: string,
  whatsappMessageId?: string,
  rideId?: number | string,
  problem?: string
): { deletedCount: number; deletedIds: string[] } {
  if (!db) return { deletedCount: 0, deletedIds: [] };
  if (!db.config) db.config = {};
  if (!Array.isArray(db.config.deletedTicketIds)) db.config.deletedTicketIds = [];
  if (!Array.isArray(db.config.deletedWhatsAppMessageIds)) db.config.deletedWhatsAppMessageIds = [];
  if (!Array.isArray(db.config.deletedTicketSignatures)) db.config.deletedTicketSignatures = [];

  const deletedIds: string[] = [];
  if (ticketId && !db.config.deletedTicketIds.includes(ticketId)) {
    db.config.deletedTicketIds.push(ticketId);
    deletedIds.push(ticketId);
  }

  if (whatsappMessageId) {
    if (!db.config.deletedWhatsAppMessageIds.includes(whatsappMessageId)) {
      db.config.deletedWhatsAppMessageIds.push(whatsappMessageId);
    }
    markWhatsAppMessageProcessed(whatsappMessageId);
  }

  let deletedCount = 0;
  if (db.data?.maintenanceTickets && typeof db.data.maintenanceTickets === 'object') {
    for (const [dKey, dayMap] of Object.entries(db.data.maintenanceTickets as Record<string, any>)) {
      if (!dayMap || typeof dayMap !== 'object') continue;
      for (const [tKey, tObjRaw] of Object.entries(dayMap)) {
        if (!tObjRaw || typeof tObjRaw !== 'object') continue;
        const tObj = tObjRaw as any;

        const isSameId = Boolean(ticketId && (tKey === ticketId || tObj.id === ticketId));
        const isSameMsg = Boolean(whatsappMessageId && tObj.whatsappMessageId && tObj.whatsappMessageId === whatsappMessageId);

        if (isSameId || isSameMsg) {
          if (tObj.whatsappMessageId) {
            if (!db.config.deletedWhatsAppMessageIds.includes(tObj.whatsappMessageId)) {
              db.config.deletedWhatsAppMessageIds.push(tObj.whatsappMessageId);
            }
            markWhatsAppMessageProcessed(tObj.whatsappMessageId);
          }
          if (tObj.id && !db.config.deletedTicketIds.includes(tObj.id)) {
            db.config.deletedTicketIds.push(tObj.id);
            deletedIds.push(tObj.id);
          }
          if (tKey && !db.config.deletedTicketIds.includes(tKey)) {
            db.config.deletedTicketIds.push(tKey);
            deletedIds.push(tKey);
          }
          delete dayMap[tKey];
          deletedCount++;
        }
      }
      if (Object.keys(dayMap).length === 0) {
        delete db.data.maintenanceTickets[dKey];
      }
    }
  }

  return { deletedCount, deletedIds };
}

function startFirestoreRealtimeListener() {
  if (!firestoreDb || !isFirestoreReady) return;
  if (Date.now() < firestoreQuotaExceededUntil) return;
  if (firestoreUnsubscribe) {
    try { firestoreUnsubscribe(); } catch (e) {}
    firestoreUnsubscribe = null;
  }
  try {
    const docRef = doc(firestoreDb, 'tfw_data', 'app_state');
    firestoreUnsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const cloudData = docSnap.data();
      if (!cloudData || (!cloudData.data && !cloudData.config)) return;

      // Ignore if update was authored by this server instance's own push
      if (cloudData._lastSenderId && cloudData._lastSenderId === 'server-instance') return;
      if (cloudData.version && memoryDb?.version && cloudData.version < memoryDb.version) return;

      if (!memoryDb) memoryDb = getInitialDatabase();
      let changed = false;

      // 1. Sync config & active operational date & merge deleted ticket trackers
      if (cloudData.config) {
        if (cloudData.config.appConfig) {
          memoryDb.config.appConfig = {
            ...(memoryDb.config.appConfig || {}),
            ...cloudData.config.appConfig
          };
          changed = true;
        }
        if (Array.isArray(cloudData.config.deletedTicketIds)) {
          if (!Array.isArray(memoryDb.config.deletedTicketIds)) memoryDb.config.deletedTicketIds = [];
          for (const dId of cloudData.config.deletedTicketIds) {
            if (!memoryDb.config.deletedTicketIds.includes(dId)) {
              memoryDb.config.deletedTicketIds.push(dId);
              cleanupDeletedTicket(memoryDb, dId);
            }
          }
        }
        if (Array.isArray(cloudData.config.deletedWhatsAppMessageIds)) {
          if (!Array.isArray(memoryDb.config.deletedWhatsAppMessageIds)) memoryDb.config.deletedWhatsAppMessageIds = [];
          for (const mId of cloudData.config.deletedWhatsAppMessageIds) {
            if (!memoryDb.config.deletedWhatsAppMessageIds.includes(mId)) {
              memoryDb.config.deletedWhatsAppMessageIds.push(mId);
              markWhatsAppMessageProcessed(mId);
            }
          }
        }
      }

      // 2. Safe merge for maintenance tickets
      if (cloudData.data?.maintenanceTickets) {
        if (!memoryDb.data.maintenanceTickets) memoryDb.data.maintenanceTickets = {};
        const statusRank: Record<string, number> = { 'solved': 3, 'in-progress': 2, 'reported': 1 };

        for (const [dKey, cloudDay] of Object.entries(cloudData.data.maintenanceTickets as Record<string, any>)) {
          if (!cloudDay || typeof cloudDay !== 'object') continue;
          if (!memoryDb.data.maintenanceTickets[dKey]) {
            const safeDay: Record<string, any> = {};
            for (const [tId, cTicketRaw] of Object.entries(cloudDay)) {
              const cTicket = cTicketRaw as any;
              if (isTicketDeleted(memoryDb, tId, cTicket?.whatsappMessageId, cTicket?.rideId, cTicket?.problem)) {
                continue;
              }
              safeDay[tId] = cTicket;
            }
            if (Object.keys(safeDay).length > 0) {
              memoryDb.data.maintenanceTickets[dKey] = safeDay;
              changed = true;
            }
          } else {
            for (const [tId, cTicketRaw] of Object.entries(cloudDay)) {
              const cTicket = cTicketRaw as any;
              if (isTicketDeleted(memoryDb, tId, cTicket?.whatsappMessageId, cTicket?.rideId, cTicket?.problem)) {
                if (memoryDb.data.maintenanceTickets[dKey]?.[tId]) {
                  delete memoryDb.data.maintenanceTickets[dKey][tId];
                  changed = true;
                }
                continue;
              }
              const localTicket = memoryDb.data.maintenanceTickets[dKey][tId];
              if (!localTicket) {
                memoryDb.data.maintenanceTickets[dKey][tId] = cTicket;
                changed = true;
              } else {
                const lRank = statusRank[localTicket.status] || 0;
                const cRank = statusRank[cTicket?.status] || 0;
                if (cRank > lRank || (cRank === lRank && JSON.stringify(cTicket) !== JSON.stringify(localTicket))) {
                  memoryDb.data.maintenanceTickets[dKey][tId] = {
                    ...localTicket,
                    ...cTicket,
                    status: cTicket.status,
                    assignedToId: cTicket.assignedToId ?? localTicket.assignedToId,
                    assignedToName: cTicket.assignedToName ?? localTicket.assignedToName,
                    inProgressAt: cTicket.inProgressAt ?? localTicket.inProgressAt,
                    helperIds: cTicket.helperIds ?? localTicket.helperIds,
                    helperNames: cTicket.helperNames ?? localTicket.helperNames,
                    resolutionNotes: (cTicket.resolutionNotes && cTicket.resolutionNotes.trim()) || localTicket.resolutionNotes || '',
                    solutionImageUrl: cTicket.solutionImageUrl || localTicket.solutionImageUrl,
                    solvedAt: cTicket.solvedAt || localTicket.solvedAt
                  };
                  changed = true;
                }
              }
            }
          }
        }
      }

      // 3. Other real-time collections (counts, sales, assignments)
      const dataCollections = ['dailyCounts', 'ticketSalesData', 'operatorAssignments', 'ticketSalesAssignments', 'attendance', 'packageSales', 'cxComplaints'];
      dataCollections.forEach(col => {
        if (cloudData.data?.[col]) {
          if (!memoryDb.data[col]) memoryDb.data[col] = {};
          memoryDb.data[col] = { ...memoryDb.data[col], ...cloudData.data[col] };
          changed = true;
        }
      });

      if (changed) {
        memoryDb.version = Math.max((memoryDb.version || 0) + 1, cloudData.version || 1);
        memoryDb.lastUpdated = new Date().toISOString();
        try {
          const serialized = JSON.stringify(memoryDb, null, 2);
          fs.writeFileSync(DB_FILE, serialized, 'utf-8');
        } catch (e) {}
        // Instantly push to all connected desktop and mobile devices via SSE
        broadcastMutation({
          type: 'sync',
          activeDate: cloudData.config?.appConfig?.activeOperationalDate,
          version: memoryDb.version,
          senderId: cloudData._lastSenderId
        });
      }
    }, (err: any) => {
      const msg = err?.message || String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        persistQuotaBlock();
      }
    });
  } catch (err) {
    console.warn('⚠️ Server Firestore realtime listener error:', err);
  }
}

function normalizeAppConfigAndRoles(targetDb: any): boolean {
  if (!targetDb || typeof targetDb !== 'object') return false;
  let changed = false;
  if (!targetDb.config || typeof targetDb.config !== 'object') {
    targetDb.config = {};
    changed = true;
  }
  if (!targetDb.config.appConfig || typeof targetDb.config.appConfig !== 'object') {
    targetDb.config.appConfig = { ...DEFAULT_APP_CONFIG };
    changed = true;
  }

  const appConfig = targetDb.config.appConfig;
  if (appConfig.loginLeftTitle === 'TOGGI FUN WORLD' || !appConfig.loginLeftTitle) {
    appConfig.loginLeftTitle = 'Tanvir Bashundhara Group';
    changed = true;
  }
  if (!appConfig.loginLeftLogo || appConfig.loginLeftLogo.trim() === '') {
    appConfig.loginLeftLogo = '/tbg-logo.svg';
    changed = true;
  }
  if (appConfig.loginLeftSubtitle === 'Bashundhara City • Operations Portal' || !appConfig.loginLeftSubtitle) {
    appConfig.loginLeftSubtitle = 'Operations & Management Portal';
    changed = true;
  }
  if (appConfig.loginRightTitle === 'BASHUNDHARA GROUP' || !appConfig.loginRightTitle) {
    appConfig.loginRightTitle = 'Bashundhara City Development Ltd';
    changed = true;
  }
  if (!appConfig.loginRightLogo || appConfig.loginRightLogo.trim() === '') {
    appConfig.loginRightLogo = '/bcdl-logo.svg';
    changed = true;
  }
  if (appConfig.loginRightSubtitle === 'For the People, for the Country' || !appConfig.loginRightSubtitle) {
    appConfig.loginRightSubtitle = 'Bashundhara Group';
    changed = true;
  }
  if (!appConfig.appName || appConfig.appName === 'TFW Operations Manager') {
    appConfig.appName = 'Tanvir Bashundhara Group';
    changed = true;
  }
  if (!targetDb.config.appName || targetDb.config.appName === 'TFW Operations Manager') {
    targetDb.config.appName = 'Tanvir Bashundhara Group';
    changed = true;
  }

  if (Array.isArray(appConfig.roles)) {
    appConfig.roles.forEach((r: any) => {
      if (r.name === 'Electrical Specialist' || r.id === 'role-10') {
        r.name = 'Maintenance';
        r.description = 'Maintenance technician for ride motors, sensors, and power systems';
        changed = true;
      }
      if (r.name === 'Lead Cashier' || r.id === 'role-6') {
        r.name = 'Ticket Sales';
        r.description = 'Ticket sales associate supervising counters, ticket issuance and shift cash balance';
        changed = true;
      }
    });
  } else {
    appConfig.roles = DEFAULT_STAFF_ROLES;
    changed = true;
  }

  if (Array.isArray(targetDb.config.roles)) {
    targetDb.config.roles.forEach((r: any) => {
      if (r.name === 'Electrical Specialist' || r.id === 'role-10') {
        r.name = 'Maintenance';
        r.description = 'Maintenance technician for ride motors, sensors, and power systems';
        changed = true;
      }
      if (r.name === 'Lead Cashier' || r.id === 'role-6') {
        r.name = 'Ticket Sales';
        r.description = 'Ticket sales associate supervising counters, ticket issuance and shift cash balance';
        changed = true;
      }
    });
  } else {
    targetDb.config.roles = appConfig.roles;
    changed = true;
  }

  if (targetDb.config.ticketSalesPersonnel && typeof targetDb.config.ticketSalesPersonnel === 'object') {
    Object.values(targetDb.config.ticketSalesPersonnel).forEach((person: any) => {
      if (person && person.role === 'Lead Cashier') {
        person.role = 'Ticket Sales';
        changed = true;
      }
    });
  }

  // Password synchronization: add 79 to all passwords except maintenance
  if (appConfig.adminPassword === 'admin' || !appConfig.adminPassword) {
    appConfig.adminPassword = 'admin79';
    changed = true;
  }
  if (appConfig.operationOfficerPassword === 'ops' || !appConfig.operationOfficerPassword) {
    appConfig.operationOfficerPassword = 'ops79';
    changed = true;
  }
  if (appConfig.salesOfficerPassword === 'sales' || !appConfig.salesOfficerPassword) {
    appConfig.salesOfficerPassword = 'sales79';
    changed = true;
  }
  if (appConfig.cxPassword === 'cx' || !appConfig.cxPassword) {
    appConfig.cxPassword = 'cx79';
    changed = true;
  }
  if (!appConfig.maintenancePassword) {
    appConfig.maintenancePassword = 'maint';
    changed = true;
  }

  if (targetDb.config.adminPassword !== appConfig.adminPassword) {
    targetDb.config.adminPassword = appConfig.adminPassword;
    changed = true;
  }
  if (targetDb.config.operationOfficerPassword !== appConfig.operationOfficerPassword) {
    targetDb.config.operationOfficerPassword = appConfig.operationOfficerPassword;
    changed = true;
  }
  if (targetDb.config.salesOfficerPassword !== appConfig.salesOfficerPassword) {
    targetDb.config.salesOfficerPassword = appConfig.salesOfficerPassword;
    changed = true;
  }
  if (targetDb.config.cxPassword !== appConfig.cxPassword) {
    targetDb.config.cxPassword = appConfig.cxPassword;
    changed = true;
  }
  if (targetDb.config.maintenancePassword !== appConfig.maintenancePassword) {
    targetDb.config.maintenancePassword = appConfig.maintenancePassword;
    changed = true;
  }

  // Ensure real packages are permanently preserved and never overridden by legacy mock data
  if (
    !Array.isArray(targetDb.config.packages) ||
    targetDb.config.packages.length === 0 ||
    targetDb.config.packages.some((p: any) => p.id === 'pkg-1' || p.name === 'Single Entry')
  ) {
    targetDb.config.packages = DEFAULT_PACKAGES;
    changed = true;
  }

  return changed;
}

// Load persisted data from Firestore on cold boot
async function syncFromFirestoreOnStartup(): Promise<boolean> {
  if (!firestoreDb || Date.now() < firestoreQuotaExceededUntil) return false;
  try {
    console.log('🔄 Checking Firestore for saved park data...');
    const docRef = doc(firestoreDb, 'tfw_data', 'app_state');
    // Guard with 3.5s timeout so cold container boot never hangs on remote connections
    const docSnap: any = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore cold boot query timeout')), 3500))
    ]);

    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      if (cloudData && (cloudData.data || cloudData.config)) {
        console.log(`✅ Loaded persistent park data from Firestore (version ${cloudData.version || 1})`);
        
        const memoryPackages = memoryDb?.config?.packages;
        const cloudPackages = cloudData.config?.packages;
        const isCloudMock = Array.isArray(cloudPackages) && cloudPackages.some((p: any) => p.id === 'pkg-1' || p.name === 'Single Entry');
        let finalPackages = cloudPackages;
        if (!finalPackages || finalPackages.length === 0 || isCloudMock) {
          if (Array.isArray(memoryPackages) && memoryPackages.length > 0 && !memoryPackages.some((p: any) => p.id === 'pkg-1')) {
            finalPackages = memoryPackages;
          } else {
            finalPackages = DEFAULT_PACKAGES;
          }
        }

        memoryDb = {
          version: Math.max(cloudData.version || 1, memoryDb?.version || 1),
          lastUpdated: cloudData.lastUpdated || new Date().toISOString(),
          config: (memoryDb?.version && cloudData?.version && memoryDb.version >= cloudData.version)
            ? { ...(cloudData.config || {}), ...(memoryDb?.config || {}), packages: finalPackages }
            : { ...(memoryDb?.config || {}), ...(cloudData.config || {}), packages: finalPackages },
          data: (() => {
            const merged: Record<string, any> = { ...(cloudData.data || {}) };
            if (memoryDb?.data && typeof memoryDb.data === 'object') {
              Object.keys(memoryDb.data).forEach(key => {
                if (key === 'maintenanceTickets') {
                  const cloudMaint = cloudData.data?.maintenanceTickets || {};
                  const localMaint = memoryDb.data.maintenanceTickets || {};
                  const mergedMaint: Record<string, any> = {};
                  const statusRank: Record<string, number> = { 'solved': 3, 'in-progress': 2, 'reported': 1 };

                  // 1. Filter cloud maintenance tickets against deleted list
                  for (const [dKey, dayMap] of Object.entries(cloudMaint as Record<string, any>)) {
                    if (!dayMap || typeof dayMap !== 'object') continue;
                    mergedMaint[dKey] = {};
                    for (const [tId, cTicket] of Object.entries(dayMap as Record<string, any>)) {
                      if (!isTicketDeleted(memoryDb, tId, cTicket?.whatsappMessageId, cTicket?.rideId, cTicket?.problem)) {
                        mergedMaint[dKey][tId] = cTicket;
                      }
                    }
                  }

                  // 2. Safe merge with local maintenance tickets
                  Object.keys(localMaint).forEach(dKey => {
                    if (!mergedMaint[dKey]) {
                      mergedMaint[dKey] = {};
                    }
                    const dayTickets: Record<string, any> = mergedMaint[dKey];
                    for (const [tId, lTicket] of Object.entries(localMaint[dKey] as Record<string, any>)) {
                      if (isTicketDeleted(memoryDb, tId, lTicket?.whatsappMessageId, lTicket?.rideId, lTicket?.problem)) {
                        continue;
                      }
                      const cTicket = dayTickets[tId];
                      if (!cTicket) {
                        dayTickets[tId] = lTicket;
                      } else {
                        const lRank = statusRank[lTicket.status] || 0;
                        const cRank = statusRank[cTicket.status] || 0;
                        if (lRank >= cRank) {
                          dayTickets[tId] = {
                            ...cTicket,
                            ...lTicket,
                            resolutionNotes: (lTicket.resolutionNotes && lTicket.resolutionNotes.trim()) || cTicket.resolutionNotes || '',
                            solutionImageUrl: lTicket.solutionImageUrl || cTicket.solutionImageUrl,
                            solvedAt: lTicket.solvedAt || cTicket.solvedAt
                          };
                        }
                      }
                    }
                  });
                  merged['maintenanceTickets'] = mergedMaint;
                } else if (merged[key] && typeof merged[key] === 'object' && typeof memoryDb.data[key] === 'object') {
                  merged[key] = { ...merged[key], ...memoryDb.data[key] };
                } else {
                  merged[key] = memoryDb.data[key];
                }
              });
            }
            return merged;
          })()
        };

        const healed = normalizeAppConfigAndRoles(memoryDb);

        // Write to local disk cache immediately
        try {
          const serialized = JSON.stringify(memoryDb, null, 2);
          fs.writeFileSync(DB_FILE, serialized, 'utf-8');
          fs.writeFileSync(`${DB_FILE}.backup`, serialized, 'utf-8');
        } catch (e) {
          // ignore
        }

        if (healed && Date.now() >= firestoreQuotaExceededUntil) {
          scheduleFirestorePush('system-branding-migration');
        }
        return true;
      }
    } else {
      console.log('ℹ️ No existing Firestore document found. Will save upon first update.');
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded') || msg.includes('quota') || err?.code === 'resource-exhausted' || err?.code === 8) {
      persistQuotaBlock(24 * 60 * 60 * 1000);
    } else {
      console.warn('⚠️ Note during Firestore startup sync:', msg);
    }
  }
  return false;
}

// Initial Database Structure
function getInitialDatabase() {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    config: {
      appConfig: DEFAULT_APP_CONFIG,
      appName: 'Tanvir Bashundhara Group',
      appLogo: null,
      adminPassword: 'admin79',
      operationOfficerPassword: 'ops79',
      salesOfficerPassword: 'sales79',
      maintenancePassword: 'maint',
      cxPassword: 'cx79',
      cutoffHour: 22,
      currency: 'BDT',
      floors: FLOORS,
      packages: DEFAULT_PACKAGES,
      rides: RIDES,
      operators: OPERATORS,
      ticketSalesPersonnel: TICKET_SALES_PERSONNEL,
      counters: COUNTERS,
      maintenancePersonnel: MAINTENANCE_PERSONNEL,
      cxPersonnel: CX_PERSONNEL,
      otherSalesCategories: ['Merchandise', 'Food & Beverage', 'Photo Booth', 'Locker Rental', 'Game Tokens']
    },
    data: {
      dailyCounts: {},
      ticketSalesData: {},
      operatorAssignments: {},
      ticketSalesAssignments: {},
      attendance: {},
      packageSales: {},
      maintenanceTickets: {},
      historyLog: {
        [Date.now()]: {
          timestamp: new Date().toISOString(),
          user: 'System',
          action: 'SYSTEM_STARTUP',
          details: 'Automated database engine started successfully.'
        }
      }
    }
  };
}

// In-Memory Database with Disk Persistence
let memoryDb: any = null;
let sseClients: Array<{ id: number; res: express.Response }> = [];
let clientCounter = 0;

function loadDatabase(): any {
  if (memoryDb) return memoryDb;
  try {
    let targetFileToRead = DB_FILE;
    if (!fs.existsSync(DB_FILE) && fs.existsSync(`${DB_FILE}.backup`)) {
      targetFileToRead = `${DB_FILE}.backup`;
    }

    if (fs.existsSync(targetFileToRead)) {
      const fileData = fs.readFileSync(targetFileToRead, 'utf-8');
      const parsed = JSON.parse(fileData);
      
      // Ensure basic structure without overwriting existing data or user deletions
      if (!parsed.config || typeof parsed.config !== 'object') parsed.config = {};
      if (!parsed.data || typeof parsed.data !== 'object') parsed.data = {};
      if (!parsed.version) parsed.version = 1;
      
      // Initialize only missing data collections (preserve empty objects if user cleared them)
      if (parsed.data.dailyCounts === undefined) parsed.data.dailyCounts = {};
      if (parsed.data.ticketSalesData === undefined) parsed.data.ticketSalesData = {};
      if (parsed.data.operatorAssignments === undefined) parsed.data.operatorAssignments = {};
      if (parsed.data.ticketSalesAssignments === undefined) parsed.data.ticketSalesAssignments = {};
      if (parsed.data.attendance === undefined) parsed.data.attendance = {};
      if (parsed.data.packageSales === undefined) parsed.data.packageSales = {};
      if (parsed.data.maintenanceTickets === undefined) parsed.data.maintenanceTickets = {};
      if (parsed.data.historyLog === undefined) parsed.data.historyLog = {};

      // Auto-heal / correct any tickets where Virtual Egg was previously tagged as VR Tank
      let healed = false;
      if (parsed.data.maintenanceTickets) {
        for (const dayTickets of Object.values(parsed.data.maintenanceTickets) as any[]) {
          if (dayTickets && typeof dayTickets === 'object') {
            for (const ticket of Object.values(dayTickets) as any[]) {
              if (ticket && ticket.problem && (ticket.problem.toLowerCase().includes('virtual egg') || ticket.problem.toLowerCase().includes('vr egg')) && (ticket.rideName === 'VR Tank' || ticket.rideId === 103)) {
                ticket.rideId = 110;
                ticket.rideName = 'VR Egg';
                healed = true;
              }
            }
          }
        }
      }

      // Initialize only missing config fields
      if (parsed.config.appConfig === undefined) {
        parsed.config.appConfig = DEFAULT_APP_CONFIG;
      } else {
        parsed.config.appConfig = {
          ...DEFAULT_APP_CONFIG,
          ...parsed.config.appConfig,
          roles: Array.isArray(parsed.config.appConfig.roles)
            ? parsed.config.appConfig.roles 
            : DEFAULT_STAFF_ROLES
        };
      }

      if (normalizeAppConfigAndRoles(parsed)) {
        healed = true;
      }
      if (parsed.config.rides === undefined) parsed.config.rides = RIDES;
      if (parsed.config.operators === undefined) parsed.config.operators = OPERATORS;
      if (parsed.config.ticketSalesPersonnel === undefined) parsed.config.ticketSalesPersonnel = TICKET_SALES_PERSONNEL;
      if (parsed.config.counters === undefined) parsed.config.counters = COUNTERS;
      if (parsed.config.maintenancePersonnel === undefined) parsed.config.maintenancePersonnel = MAINTENANCE_PERSONNEL;
      if (parsed.config.packages === undefined) parsed.config.packages = DEFAULT_PACKAGES;
      if (parsed.config.floors === undefined) parsed.config.floors = FLOORS;
      if (parsed.config.otherSalesCategories === undefined) {
        parsed.config.otherSalesCategories = ['Merchandise', 'Food & Beverage', 'Photo Booth', 'Locker Rental', 'Game Tokens'];
      }

      // Re-align any maintenance tickets whose reportedAt date doesn't match its container key
      if (parsed.data?.maintenanceTickets && typeof parsed.data.maintenanceTickets === 'object') {
        const maint = parsed.data.maintenanceTickets;
        for (const dateKey of Object.keys(maint)) {
          const group = maint[dateKey];
          if (group && typeof group === 'object') {
            for (const [tId, ticket] of Object.entries(group) as [string, any][]) {
              if (ticket && ticket.reportedAt) {
                const realDate = getDhakaDateString(new Date(ticket.reportedAt));
                if (realDate !== dateKey || ticket.date !== realDate) {
                  ticket.date = realDate;
                  const ticketId = ticket.id || tId;
                  ticket.id = ticketId;
                  if (!maint[realDate]) maint[realDate] = {};
                  maint[realDate][ticketId] = ticket;
                  if (realDate !== dateKey || ticketId !== tId) {
                    delete maint[dateKey][tId];
                  }
                  healed = true;
                }
              }
            }
          }
        }

        // De-duplicate maintenance tickets (merge multiple copies of the same issue into one canonical ticket)
        const statusRank: Record<string, number> = { 'solved': 3, 'in-progress': 2, 'reported': 1 };
        const seenSignatures = new Map<string, { dateKey: string; ticketId: string; ticket: any }>();

        for (const dateKey of Object.keys(maint)) {
          const group = maint[dateKey];
          if (!group || typeof group !== 'object') continue;
          for (const [tId, ticket] of Object.entries(group) as [string, any][]) {
            if (!ticket || typeof ticket !== 'object') continue;
            const normProb = (ticket.problem || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const sig = ticket.whatsappMessageId 
              ? `msg-${ticket.whatsappMessageId}` 
              : (ticket.rideId && normProb.length > 5 ? `ride-${ticket.rideId}-${normProb.slice(0, 30)}` : `id-${tId}`);
            
            if (seenSignatures.has(sig)) {
              const prev = seenSignatures.get(sig)!;
              const prevRank = statusRank[prev.ticket.status] || 0;
              const currRank = statusRank[ticket.status] || 0;
              
              if (currRank > prevRank) {
                prev.ticket.status = ticket.status;
                if (ticket.assignedToId) prev.ticket.assignedToId = ticket.assignedToId;
                if (ticket.assignedToName) prev.ticket.assignedToName = ticket.assignedToName;
                if (ticket.helperIds) prev.ticket.helperIds = ticket.helperIds;
                if (ticket.helperNames) prev.ticket.helperNames = ticket.helperNames;
                if (ticket.resolutionNotes) prev.ticket.resolutionNotes = ticket.resolutionNotes;
                if (ticket.solutionImageUrl) prev.ticket.solutionImageUrl = ticket.solutionImageUrl;
                if (ticket.solvedAt) prev.ticket.solvedAt = ticket.solvedAt;
                if (ticket.inProgressAt) prev.ticket.inProgressAt = ticket.inProgressAt;
              } else if (prevRank > currRank) {
                ticket.status = prev.ticket.status;
                if (prev.ticket.assignedToId) ticket.assignedToId = prev.ticket.assignedToId;
                if (prev.ticket.assignedToName) ticket.assignedToName = prev.ticket.assignedToName;
                if (prev.ticket.helperIds) ticket.helperIds = prev.ticket.helperIds;
                if (prev.ticket.helperNames) ticket.helperNames = prev.ticket.helperNames;
                if (prev.ticket.resolutionNotes) ticket.resolutionNotes = prev.ticket.resolutionNotes;
                if (prev.ticket.solutionImageUrl) ticket.solutionImageUrl = prev.ticket.solutionImageUrl;
                if (prev.ticket.solvedAt) ticket.solvedAt = prev.ticket.solvedAt;
                if (prev.ticket.inProgressAt) ticket.inProgressAt = prev.ticket.inProgressAt;
              }
              // Delete the duplicate entry!
              if (prev.dateKey !== dateKey || prev.ticketId !== tId) {
                delete maint[dateKey][tId];
                healed = true;
              }
            } else {
              seenSignatures.set(sig, { dateKey, ticketId: tId, ticket });
            }
          }
        }
      }

      memoryDb = parsed;
      if (healed) {
        saveDatabaseToDisk();
      }
      return memoryDb;
    }
  } catch (err) {
    console.error('Error reading database file, creating fresh initial db:', err);
  }

  memoryDb = getInitialDatabase();
  saveDatabaseToDisk();
  return memoryDb;
}

interface ServerMutationEvent {
  type: string;
  path?: string;
  value?: any;
  updates?: Record<string, any>;
  delta?: number;
  date?: string;
  activeDate?: string;
  senderId?: string;
  version?: number;
  force?: boolean;
  cutoffDate?: string;
  newCycleStartDate?: string;
  [key: string]: any;
}

let saveTimeout: NodeJS.Timeout | null = null;
function saveDatabaseToDisk(mutation?: ServerMutationEvent) {
  if (!memoryDb) return;
  memoryDb.version = (memoryDb.version || 0) + 1;
  memoryDb.lastUpdated = new Date().toISOString();

  // Instant synchronous write to disk ensuring local fast fallback
  try {
    const serialized = JSON.stringify(memoryDb, null, 2);
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, serialized, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    fs.writeFileSync(`${DB_FILE}.backup`, serialized, 'utf-8');
  } catch (e) {
    console.error('Failed to write database to disk safely:', e);
  }

  // Push to permanent Firebase Firestore cloud storage
  const isHighPriority = Boolean(
    mutation?.path?.includes('maintenanceTickets') ||
    mutation?.path?.includes('ticketSales') || 
    mutation?.path?.includes('packageSales') ||
    (mutation?.updates && Object.keys(mutation.updates).some(k => 
      k.includes('maintenanceTickets') || k.includes('ticketSales') || k.includes('packageSales')
    ))
  );
  scheduleFirestorePush(mutation?.senderId, isHighPriority);

  // Broadcast delta change via SSE to all connected clients
  broadcastMutation(mutation || { type: 'sync' });
}

function broadcastMutation(mutation: ServerMutationEvent) {
  const payload = JSON.stringify({
    ...mutation,
    version: memoryDb.version,
    timestamp: memoryDb.lastUpdated,
    activeDate: memoryDb?.config?.appConfig?.activeOperationalDate
  });
  sseClients = sseClients.filter(client => {
    try {
      if (client.res.writableEnded || client.res.destroyed) {
        return false;
      }
      client.res.write(`data: ${payload}\n\n`);
      if (typeof (client.res as any).flush === 'function') {
        (client.res as any).flush();
      }
      return true;
    } catch (e) {
      return false;
    }
  });
}

// Clean up old history records if they exceed 500 items
function trimHistoryLogs(db: any) {
  try {
    if (db?.data?.historyLog && typeof db.data.historyLog === 'object') {
      const keys = Object.keys(db.data.historyLog);
      if (keys.length > 500) {
        keys.sort((a, b) => Number(a) - Number(b));
        const toDelete = keys.slice(0, keys.length - 500);
        toDelete.forEach(k => delete db.data.historyLog[k]);
      }
    }
  } catch (e) {
    // ignore
  }
}

// Helper to normalize issue text across English and Bengali scripts
function normalizeIssueText(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s\u0980-\u09FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Nested property helpers
function getValueByPath(obj: any, pathStr: string) {
  if (!pathStr) return obj;
  const parts = pathStr.split('/').filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setValueByPath(obj: any, pathStr: string, value: any, isExplicitReopen: boolean = false) {
  const parts = pathStr.split('/').filter(Boolean);
  if (parts.length === 0) return value;
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];

  // Protection for maintenance tickets: NEVER downgrade 'solved' to 'in-progress' or 'reported' unless isExplicitReopen is true
  if (parts.length >= 3 && parts[0] === 'data' && parts[1] === 'maintenanceTickets') {
    // Case 1: updating status property directly (e.g. data/maintenanceTickets/date/ticketId/status)
    if (lastPart === 'status' && current[lastPart] === 'solved' && value !== 'solved' && !isExplicitReopen) {
      console.warn(`🛡️ Blocked attempt to downgrade solved ticket status at ${pathStr} to '${value}'`);
      return obj;
    }
    // Case 2: updating the entire ticket object (e.g. data/maintenanceTickets/date/ticketId)
    if (lastPart !== 'status' && current[lastPart] && typeof current[lastPart] === 'object' && typeof value === 'object') {
      const existingTicket = current[lastPart];
      if (existingTicket.status === 'solved' && value.status && value.status !== 'solved' && !isExplicitReopen && !value.isExplicitReopen) {
        console.warn(`🛡️ Blocked attempt to downgrade solved ticket at ${pathStr} to '${value.status}'`);
        value = {
          ...value,
          status: 'solved',
          solvedAt: existingTicket.solvedAt || value.solvedAt || new Date().toISOString(),
          resolutionNotes: (existingTicket.resolutionNotes && existingTicket.resolutionNotes.trim()) || value.resolutionNotes || '',
          solutionImageUrl: existingTicket.solutionImageUrl || value.solutionImageUrl
        };
      }
    }
  }

  if (value === null || value === undefined) {
    delete current[lastPart];
    if (parts.length >= 4 && parts[0] === 'data' && parts[1] === 'maintenanceTickets') {
      const targetDate = parts[2];
      const targetId = parts[3];
      cleanupDeletedTicket(obj, targetId, targetDate);
    }
  } else {
    current[lastPart] = value;
  }

  // When a ticket becomes 'solved' or 'in-progress', synchronize any duplicate copies across all dates
  if (parts.length >= 3 && parts[0] === 'data' && parts[1] === 'maintenanceTickets' && obj.data?.maintenanceTickets) {
    const updatedStatus = lastPart === 'status' ? value : value?.status;
    if (updatedStatus === 'solved' || updatedStatus === 'in-progress') {
      const targetTicket = lastPart === 'status' ? current : value;
      const targetRideId = targetTicket?.rideId;
      const targetProb = (targetTicket?.problem || '').toLowerCase().trim();
      const targetMsgId = targetTicket?.whatsappMessageId;
      const targetId = lastPart === 'status' ? parts[parts.length - 2] : lastPart;
      const targetDate = parts[2];

      for (const [dKey, dayMap] of Object.entries(obj.data.maintenanceTickets as Record<string, any>)) {
        if (!dayMap || typeof dayMap !== 'object') continue;
        for (const [tId, tObjRaw] of Object.entries(dayMap)) {
          if (!tObjRaw || typeof tObjRaw !== 'object') continue;
          const tObj = tObjRaw as any;
          if (dKey === targetDate && tId === targetId) continue; // Same instance
          
          const isSameId = tId === targetId || tObj.id === targetId;
          const isSameMsg = Boolean(targetMsgId && tObj.whatsappMessageId === targetMsgId);
          const isSameRideAndProb = Boolean(
            targetRideId && tObj.rideId === targetRideId && 
            targetProb.length > 3 && (
              normalizeIssueText(tObj.problem) === normalizeIssueText(targetProb) ||
              normalizeIssueText(tObj.problem).includes(normalizeIssueText(targetProb)) ||
              normalizeIssueText(targetProb).includes(normalizeIssueText(tObj.problem))
            )
          );

          if (isSameId || isSameMsg || isSameRideAndProb) {
            tObj.status = updatedStatus;
            if (updatedStatus === 'solved') {
              tObj.solvedAt = targetTicket?.solvedAt || tObj.solvedAt || new Date().toISOString();
              if (targetTicket?.resolutionNotes) tObj.resolutionNotes = targetTicket.resolutionNotes;
              if (targetTicket?.solutionImageUrl) tObj.solutionImageUrl = targetTicket.solutionImageUrl;
              if (targetTicket?.assignedToId) tObj.assignedToId = targetTicket.assignedToId;
              if (targetTicket?.assignedToName) tObj.assignedToName = targetTicket.assignedToName;
            } else if (updatedStatus === 'in-progress') {
              tObj.inProgressAt = targetTicket?.inProgressAt || tObj.inProgressAt || new Date().toISOString();
              if (targetTicket?.assignedToId) tObj.assignedToId = targetTicket.assignedToId;
              if (targetTicket?.assignedToName) tObj.assignedToName = targetTicket.assignedToName;
              if (targetTicket?.helperIds) tObj.helperIds = targetTicket.helperIds;
              if (targetTicket?.helperNames) tObj.helperNames = targetTicket.helperNames;
            }
          }
        }
      }
    }
  }

  return obj;
}

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Global anti-cache middleware for all API endpoints to prevent mobile Safari/Chrome caching
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // 1. Load initial memory & local cache
  loadDatabase();

  // 2. Synchronize with Firestore cloud database on boot and start realtime cloud listener
  await syncFromFirestoreOnStartup();
  startFirestoreRealtimeListener();

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    if (firestoreQuotaExceededUntil <= Date.now() && fs.existsSync(QUOTA_FILE)) {
      try {
        const qData = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf-8'));
        if (qData && qData.blockedUntil && Number(qData.blockedUntil) > Date.now()) {
          firestoreQuotaExceededUntil = Number(qData.blockedUntil);
        }
      } catch (e) {}
    }
    const isQuotaBlocked = Date.now() < firestoreQuotaExceededUntil;
    res.json({
      status: 'ok',
      dbVersion: memoryDb?.version || 1,
      dbLastUpdated: memoryDb?.lastUpdated || '',
      activeOperationalDate: memoryDb?.config?.appConfig?.activeOperationalDate || '',
      clients: sseClients.length,
      firestoreConnected: isFirestoreReady && !isQuotaBlocked,
      firestoreQuotaExceeded: isQuotaBlocked,
      firestoreQuotaBlockedUntil: isQuotaBlocked ? firestoreQuotaExceededUntil : 0,
      time: new Date().toISOString()
    });
  });

  // Manual trigger for Cloud Sync (Firestore)
  app.post('/api/db/cloud-sync', async (req, res) => {
    try {
      if (Date.now() < firestoreQuotaExceededUntil || !isFirestoreReady) {
        return res.json({ 
          success: true, 
          quotaExceeded: true, 
          message: 'Local database is fully persistent on disk. Firestore daily cloud write quota is currently resetting.',
          version: memoryDb?.version 
        });
      }
      await pushToFirestore();
      res.json({ success: true, message: 'Cloud database synced to Firestore successfully.', version: memoryDb?.version });
    } catch (err) {
      res.status(500).json({ error: 'Failed to sync to Firestore' });
    }
  });

  // Broadcast current view and state to all devices
  app.post('/api/db/broadcast-sync', async (req, res) => {
    try {
      const { db, activeDate, activeView, maintenancePortal, maintenanceStatusTab, maintenanceViewScope, senderId } = req.body;
      if (db && typeof db === 'object') {
        memoryDb = {
          version: (memoryDb?.version || 1) + 1,
          lastUpdated: new Date().toISOString(),
          config: {
            ...(memoryDb?.config || {}),
            ...(db.config || {})
          },
          data: (() => {
            const currentData = memoryDb?.data || {};
            const incomingData = db.data || {};
            const mergedData = { ...currentData, ...incomingData };
            if (currentData.maintenanceTickets && incomingData.maintenanceTickets) {
              const statusRank: Record<string, number> = { 'solved': 3, 'in-progress': 2, 'reported': 1 };
              const mergedMaint = { ...incomingData.maintenanceTickets };
              Object.keys(currentData.maintenanceTickets).forEach(dKey => {
                if (!mergedMaint[dKey]) {
                  mergedMaint[dKey] = { ...currentData.maintenanceTickets[dKey] };
                } else {
                  const dayTickets = { ...mergedMaint[dKey] };
                  for (const [tId, curTicket] of Object.entries(currentData.maintenanceTickets[dKey] as Record<string, any>)) {
                    const incTicket = dayTickets[tId];
                    if (!incTicket) {
                      dayTickets[tId] = curTicket;
                    } else {
                      const curRank = statusRank[curTicket.status] || 0;
                      const incRank = statusRank[incTicket.status] || 0;
                      if (curRank >= incRank) {
                        dayTickets[tId] = {
                          ...incTicket,
                          ...curTicket,
                          resolutionNotes: (curTicket.resolutionNotes && curTicket.resolutionNotes.trim()) || incTicket.resolutionNotes || '',
                          solutionImageUrl: curTicket.solutionImageUrl || incTicket.solutionImageUrl,
                          solvedAt: curTicket.solvedAt || incTicket.solvedAt
                        };
                      }
                    }
                  }
                  mergedMaint[dKey] = dayTickets;
                }
              });
              mergedData.maintenanceTickets = mergedMaint;
            }
            return mergedData;
          })()
        };
      }
      if (!memoryDb.config.appConfig) memoryDb.config.appConfig = {};
      if (activeDate) memoryDb.config.appConfig.activeOperationalDate = activeDate;
      if (activeView) memoryDb.config.appConfig.activeView = activeView;
      if (maintenancePortal) memoryDb.config.appConfig.activeMaintenancePortal = maintenancePortal;
      if (maintenanceStatusTab) memoryDb.config.appConfig.activeMaintenanceStatusTab = maintenanceStatusTab;
      if (maintenanceViewScope) memoryDb.config.appConfig.activeMaintenanceViewScope = maintenanceViewScope;

      saveDatabaseToDisk({ type: 'sync', activeDate, activeView, senderId, force: true });
      if (isFirestoreReady && Date.now() >= firestoreQuotaExceededUntil) {
        scheduleFirestorePush(senderId, false);
      }
      // Broadcast current operators explicitly so all connected clients update associates immediately
      broadcastMutation({
        type: 'set',
        path: 'config/operators',
        value: memoryDb?.config?.operators || {},
        version: memoryDb?.version
      });
      broadcastMutation({ 
        type: 'sync', 
        activeDate, 
        activeView, 
        maintenancePortal, 
        maintenanceStatusTab, 
        maintenanceViewScope, 
        version: memoryDb?.version, 
        force: true 
      });
      res.json({ success: true, version: memoryDb?.version, message: 'Broadcast sync successful to all devices.' });
    } catch (err) {
      console.error('Error in broadcast-sync:', err);
      res.status(500).json({ error: 'Failed to broadcast sync.' });
    }
  });

  // Comprehensive Software Refresh: pulls latest WhatsApp messages, re-loads authoritative database, and broadcasts sync
  app.post('/api/db/refresh', async (req, res) => {
    try {
      const { activeDate, senderId } = req.body || {};
      
      // 1. Pull latest WhatsApp technical support messages
      try {
        await syncGreenApiGroupMessages(true);
      } catch (waErr) {
        console.warn('WhatsApp refresh skipped during software refresh:', waErr);
      }

      // 2. Load latest authoritative database state
      const db = loadDatabase();

      // 3. If activeDate is specified and valid, align operational date
      if (activeDate && /^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
        setValueByPath(db, 'config/appConfig/activeOperationalDate', activeDate);
      }

      // 4. Force disk commit and SSE broadcast to all connected devices
      saveDatabaseToDisk({ type: 'sync', force: true, senderId });

      res.json({
        success: true,
        db,
        version: db.version,
        refreshedAt: new Date().toISOString(),
        message: 'Software and date-wise data refreshed successfully.'
      });
    } catch (err: any) {
      console.error('Error in /api/db/refresh:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Full DB or subpath
  app.get('/api/db', (req, res) => {
    const pathQuery = req.query.path as string;
    const db = loadDatabase();
    if (pathQuery) {
      const val = getValueByPath(db, pathQuery);
      return res.json({ success: true, data: val, version: db.version });
    }
    res.json({ success: true, db, version: db.version });
  });

  // Set single path
  app.post('/api/db/set', (req, res) => {
    const { path: pathStr, value, senderId } = req.body;
    if (pathStr === undefined) {
      return res.status(400).json({ error: 'path is required' });
    }
    const db = loadDatabase();
    setValueByPath(db, pathStr, value);
    if (pathStr.startsWith('data/historyLog')) {
      trimHistoryLogs(db);
    }
    saveDatabaseToDisk({ type: 'set', path: pathStr, value, senderId });
    res.json({ success: true, version: db.version });
  });

  // Atomic Increment/Decrement (High concurrency protection)
  app.post('/api/db/increment', (req, res) => {
    const { path: pathStr, delta = 1, min = 0, senderId } = req.body;
    if (!pathStr) {
      return res.status(400).json({ error: 'path is required' });
    }
    const db = loadDatabase();
    const currentVal = Number(getValueByPath(db, pathStr)) || 0;
    const newVal = Math.max(min, currentVal + Number(delta));
    setValueByPath(db, pathStr, newVal);
    saveDatabaseToDisk({ type: 'increment', path: pathStr, delta, value: newVal, senderId });
    res.json({ success: true, version: db.version, value: newVal });
  });

  // Batch sync queue for offline mutations
  app.post('/api/db/sync-queue', (req, res) => {
    const { queue, senderId } = req.body;
    if (!Array.isArray(queue) || queue.length === 0) {
      return res.json({ success: true, processed: 0, version: memoryDb?.version || 1 });
    }
    const db = loadDatabase();
    let processed = 0;
    const appliedUpdates: Record<string, any> = {};

    for (const op of queue) {
      if (!op || typeof op !== 'object') continue;
      const { type, path: pathStr, value, delta, min = 0, updates, basePath = '' } = op;

      if (type === 'set' && pathStr !== undefined) {
        setValueByPath(db, pathStr, value);
        appliedUpdates[pathStr] = value;
        processed++;
      } else if (type === 'increment' && pathStr) {
        const currentVal = Number(getValueByPath(db, pathStr)) || 0;
        const newVal = Math.max(min, currentVal + Number(delta || 1));
        setValueByPath(db, pathStr, newVal);
        appliedUpdates[pathStr] = newVal;
        processed++;
      } else if (type === 'update' && updates && typeof updates === 'object') {
        for (const [p, v] of Object.entries(updates)) {
          let full = p;
          if (!p.startsWith('data/') && !p.startsWith('config/')) {
            full = basePath ? `${basePath}/${p}` : p;
          }
          setValueByPath(db, full, v);
          appliedUpdates[full] = v;
        }
        processed++;
      } else if (type === 'remove' && pathStr) {
        if (pathStr.startsWith('data/maintenanceTickets')) {
          const parts = pathStr.split('/').filter(Boolean);
          if (parts.length >= 4) {
            cleanupDeletedTicket(db, parts[3], parts[2]);
          }
        }
        setValueByPath(db, pathStr, null);
        appliedUpdates[pathStr] = null;
        processed++;
      } else if (type === 'delete-ticket') {
        cleanupDeletedTicket(db, op.ticketId, op.date, op.whatsappMessageId, op.rideId, op.problem);
        processed++;
      } else if (type === 'clear-reported-tickets' && op.date) {
        if (db.data?.maintenanceTickets?.[op.date]) {
          for (const [tId, tObjRaw] of Object.entries(db.data.maintenanceTickets[op.date])) {
            const tObj = tObjRaw as any;
            if (tObj && tObj.status === 'reported') {
              if (tObj.id) {
                if (!db.config.deletedTicketIds) db.config.deletedTicketIds = [];
                if (!db.config.deletedTicketIds.includes(tObj.id)) db.config.deletedTicketIds.push(tObj.id);
              }
              if (tObj.whatsappMessageId) {
                if (!db.config.deletedWhatsAppMessageIds) db.config.deletedWhatsAppMessageIds = [];
                if (!db.config.deletedWhatsAppMessageIds.includes(tObj.whatsappMessageId)) db.config.deletedWhatsAppMessageIds.push(tObj.whatsappMessageId);
              }
              delete db.data.maintenanceTickets[op.date][tId];
            }
          }
          if (Object.keys(db.data.maintenanceTickets[op.date]).length === 0) {
            delete db.data.maintenanceTickets[op.date];
          }
        }
        processed++;
      }
    }

    if (Object.keys(appliedUpdates).some(k => k.includes('historyLog'))) {
      trimHistoryLogs(db);
    }

    saveDatabaseToDisk({ type: 'update', updates: appliedUpdates, senderId });
    res.json({ success: true, processed, version: db.version });
  });

  // --- WhatsApp Webhook Integration for Maintenance Tickets ---
  // Verification challenge handler (supports Meta Cloud API, Green API, Whapi, etc.)
  app.get('/api/webhooks/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe') {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Verification failed');
    }

    res.json({
      status: 'online',
      service: 'TFW Maintenance WhatsApp Webhook Gateway',
      webhookEndpoint: '/api/webhooks/whatsapp',
      databaseSafety: 'Fully isolated in data/maintenanceTickets with zero impact on counters, sales, or attendance',
      supportedGateways: ['Green API', 'Whapi.cloud', 'UltraMsg', 'Twilio', 'Meta Cloud API', 'Direct JSON / HTTP POST']
    });
  });

  // Intelligent Ride Matcher for incoming WhatsApp messages
  // Prioritizes 1st line as instructed ("in the 1st line the game or ride name will be, so TAG name from there")
  function matchRideFromMessage(
    cleanMessage: string,
    ridesList: Array<{ id: number; name: string; floor?: string | number }>
  ): { id: number; name: string } {
    if (!ridesList || ridesList.length === 0) {
      return { id: 1, name: 'General Attraction' };
    }

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/\bvirtual\b/gi, 'vr') // "Virtual Egg" -> "vr egg"
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const isSimilar = (w1: string, w2: string): boolean => {
      if (w1 === w2) return true;
      if (Math.abs(w1.length - w2.length) > 1) return false;
      let diff = 0, i = 0, j = 0;
      while (i < w1.length && j < w2.length) {
        if (w1[i] !== w2[j]) {
          diff++;
          if (diff > 1) return false;
          if (w1.length > w2.length) i++;
          else if (w2.length > w1.length) j++;
          else { i++; j++; }
        } else {
          i++; j++;
        }
      }
      return true;
    };

    const lines = cleanMessage.split('\n').map(l => l.trim()).filter(Boolean);
    const floorMatch = cleanMessage.match(/\b(?:level|floor|lvl|flr|l)[-\s:]*(\d+)\b/i);
    const detectedFloorNum = floorMatch ? floorMatch[1] : null;

    // Filter out standalone floor indicators (e.g. "L-11", "Level 11", "Floor 14") so the game/ride line is prioritized
    const candidateLines = lines.filter(l => !/^(?:level|floor|lvl|flr|l)[-\s:]*\d+$/i.test(l.trim()));
    const primaryLine = candidateLines[0] || lines[0] || cleanMessage;
    const normPrimary = normalize(primaryLine);
    const normFull = normalize(cleanMessage);

    // If floor is detected, prioritize rides on that floor first
    let candidateRides = [...ridesList].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
    if (detectedFloorNum) {
      const onFloor = candidateRides.filter(r => String(r.floor || '').includes(detectedFloorNum));
      const offFloor = candidateRides.filter(r => !String(r.floor || '').includes(detectedFloorNum));
      candidateRides = [...onFloor, ...offFloor];
    }

    // 1. Exact or substring match on primary line
    for (const r of candidateRides) {
      if (!r.name) continue;
      const normRide = normalize(r.name);
      const regex = new RegExp(`(?:^|\\s)${normRide}(?:\\s|$)`, 'i');
      if (regex.test(normPrimary) || normPrimary.includes(normRide)) {
        return { id: r.id, name: r.name };
      }
    }

    // 2. Fuzzy match on primary line (handles spelling variations like "Power Track" -> "Power Truck")
    const primaryWords = normPrimary.split(' ').filter(w => w.length >= 3 && !['the', 'and', 'not', 'working', 'sound', 'broken', 'problem', 'test', 'issue'].includes(w));
    if (primaryWords.length > 0) {
      for (const r of candidateRides) {
        if (!r.name) continue;
        const rideWords = normalize(r.name).split(' ').filter(w => w.length >= 3 && !['the', 'and'].includes(w));
        if (rideWords.length > 0) {
          const matchesAll = rideWords.every(rw => primaryWords.some(pw => isSimilar(rw, pw)));
          if (matchesAll) return { id: r.id, name: r.name };
        }
      }
    }

    // 3. Key phrases on primary line
    for (const r of candidateRides) {
      if (!r.name) continue;
      const normRide = normalize(r.name);
      const words = normRide.split(' ').filter(w => !['1', '2', '3', 'blue', 'red', 'seat'].includes(w));
      if (words.length > 0) {
        const phrase = words.join(' ');
        if (normPrimary.includes(phrase)) {
          return { id: r.id, name: r.name };
        }
      }
    }

    // 4. Distinctive single-word match on primary line
    for (const r of candidateRides) {
      if (!r.name) continue;
      const normRide = normalize(r.name);
      const words = normRide.split(' ').filter(w => w.length >= 3 && !['the', 'and', 'kids', 'car', 'tour', 'world', 'park', 'sports', 'flight', 'racer', 'vr', 'game', 'area', 'zone', 'line', 'door'].includes(w));
      for (const w of words) {
        const wRegex = new RegExp(`(?:^|\\s)${w}(?:\\s|$)`, 'i');
        if (wRegex.test(normPrimary)) {
          return { id: r.id, name: r.name };
        }
      }
    }

    // 5. Full message check
    for (const r of candidateRides) {
      if (!r.name) continue;
      const normRide = normalize(r.name);
      const regex = new RegExp(`(?:^|\\s)${normRide}(?:\\s|$)`, 'i');
      if (regex.test(normFull) || normFull.includes(normRide)) {
        return { id: r.id, name: r.name };
      }
    }

    // 6. Fuzzy multi-word match on full message
    const fullWords = normFull.split(' ').filter(w => w.length >= 3 && !['the', 'and', 'not', 'working', 'problem', 'test', 'issue'].includes(w));
    for (const r of candidateRides) {
      if (!r.name) continue;
      const rideWords = normalize(r.name).split(' ').filter(w => w.length >= 3 && !['the', 'and'].includes(w));
      if (rideWords.length >= 2) {
        const matchesAll = rideWords.every(rw => fullWords.some(pw => isSimilar(rw, pw)));
        if (matchesAll) return { id: r.id, name: r.name };
      }
    }

    // Fallback: Level / Floor if detected in message, otherwise general facility
    if (detectedFloorNum) {
      return {
        id: 1000 + Number(detectedFloorNum),
        name: `Level ${detectedFloorNum} Facility`
      };
    }

    return {
      id: 1,
      name: 'General Facility'
    };
  }

  function detectTicketPriority(message: string): 'normal' | 'high' | 'urgent' {
    if (/urgent|emergency|danger|smoke|fire|halt|injury|serious|hazard/i.test(message)) {
      return 'urgent';
    } else if (/broken|critical|stopped|stuck|high|not working|damaged|shutdown|down/i.test(message)) {
      return 'high';
    }
    return 'normal';
  }

  // Filter out any resolution reports, technician dispatches, leave requests, or general chatter
  function isResolutionOrSystemMessage(msg: string): boolean {
    if (!msg) return true;
    const lower = msg.toLowerCase().trim();
    if (lower.length < 3) return true;
    if (['ok', 'noted', 'done', 'received', 'good', 'thanks', 'thank you', 'yes', 'no', 'fine', 'clear', 'all ok', 'hi', 'hello'].includes(lower)) return true;
    
    // Filter leave requests or staff operational announcements
    if (
      lower.includes('ছুটি') ||
      lower.includes('সর্টলিপ') ||
      lower.includes('অনুমতি কামনা') ||
      lower.includes('আসেন') ||
      lower.includes('lunch') ||
      lower.includes('prayer') ||
      lower.includes('নামাজ') ||
      lower.includes('খাবার') ||
      lower.includes('attendance')
    ) {
      return true;
    }

    return (
      lower.includes('[tfw maintenance') ||
      lower.includes('tfw maintenance') ||
      lower.includes('maintenance team - solved') ||
      lower.includes('technician dispatched') ||
      lower.includes('[tfw technical support') ||
      lower.includes('resolution notes:') ||
      lower.includes('time solved:') ||
      lower.includes('dispatched at:') ||
      lower.includes('operational clearance') ||
      lower.includes('repaired and cleared') ||
      lower.includes('engineer / technician:') ||
      lower.includes('problem solved') ||
      lower.includes('issue resolved') ||
      lower.includes('issue solved') ||
      lower.includes('resolved') ||
      lower.includes('solved') ||
      lower.includes('solution') ||
      lower.includes('repaired') ||
      lower.includes('work done') ||
      lower.includes('fixed') ||
      lower.includes('cleared') ||
      lower.includes('operational') ||
      lower.includes('running fine') ||
      lower.includes('working now') ||
      lower.includes('all ok') ||
      lower.includes('all done') ||
      lower.includes('photo reported via whatsapp') ||
      lower.startsWith('✅') ||
      lower.startsWith('🔧') ||
      lower.startsWith('📢') ||
      (lower.includes('done') && (lower.includes('level') || lower.includes('problem') || lower.includes('issue') || lower.includes('ride') || lower.includes('bumper') || lower.includes('tag'))) ||
      lower.includes('in progress return') ||
      lower.includes('return gese') ||
      lower.includes('resolving theke')
    );
  }

  // Helper to check if an issue for this ride and problem was already solved anywhere in the database
  function isIssueAlreadySolved(
    db: any,
    rideId?: number,
    messageText?: string,
    whatsappMessageId?: string
  ): boolean {
    if (!db?.data?.maintenanceTickets) return false;

    // Only block if the EXACT same WhatsApp message ID was already solved
    if (whatsappMessageId) {
      for (const dayTickets of Object.values(db.data.maintenanceTickets)) {
        if (!dayTickets || typeof dayTickets !== 'object') continue;
        for (const t of Object.values(dayTickets as Record<string, any>)) {
          if (!t || typeof t !== 'object') continue;
          if (t.status === 'solved' && t.whatsappMessageId && t.whatsappMessageId === whatsappMessageId) {
            return true;
          }
        }
      }
    }
    // Recurring issues on rides are real new problems - never suppress them based on older solved tickets
    return false;
  }

  // Helper to find an existing ticket across all dates in memoryDb/db
  function findExistingMaintenanceTicket(
    db: any, 
    ticketId?: string, 
    whatsappMessageId?: string, 
    rideId?: number, 
    messageText?: string
  ): { dateKey: string; ticketId: string; ticket: any } | null {
    if (!db?.data?.maintenanceTickets) return null;
    const cleanMsg = normalizeIssueText(messageText || '');
    const coreId = ticketId ? ticketId.replace(/^\d{4}-\d{2}-\d{2}-/, '') : '';
    const now = Date.now();

    for (const [dateKey, dayTickets] of Object.entries(db.data.maintenanceTickets)) {
      if (!dayTickets || typeof dayTickets !== 'object') continue;
      for (const [tId, t] of Object.entries(dayTickets as Record<string, any>)) {
        if (!t || typeof t !== 'object') continue;
        if (ticketId && (tId === ticketId || t.id === ticketId)) {
          return { dateKey, ticketId: tId, ticket: t };
        }
        if (coreId && coreId.length > 5) {
          const targetCore = String(t.id || tId).replace(/^\d{4}-\d{2}-\d{2}-/, '');
          if (targetCore === coreId) {
            return { dateKey, ticketId: tId, ticket: t };
          }
        }
        if (whatsappMessageId && t.whatsappMessageId && t.whatsappMessageId === whatsappMessageId) {
          return { dateKey, ticketId: tId, ticket: t };
        }
        // Deduplication for rapid double-posts: only match if reported within the last 15 minutes on the same ride with exact problem text
        if (rideId && t.rideId === rideId && cleanMsg.length > 3 && t.status !== 'solved') {
          const tTime = new Date(t.reportedAt || t.date || 0).getTime();
          if (now - tTime < 15 * 60 * 1000) {
            const existingProb = normalizeIssueText(t.problem || '');
            if (existingProb && existingProb === cleanMsg) {
              return { dateKey, ticketId: tId, ticket: t };
            }
          }
        }
      }
    }
    return null;
  }

  // In-memory cache to prevent accidental duplicate ticket generation from duplicate webhooks within 5 seconds
  const recentWhatsAppTickets = new Map<string, number>();

  app.post('/api/webhooks/whatsapp', (req, res) => {
    try {
      const body = req.body || {};

      // Ignore outgoing API message webhook events generated by our dashboard/bot updates
      if (
        body.typeWebhook === 'outgoingMessageReceived' ||
        body.typeWebhook === 'outgoingAPIMessageReceived' || 
        body.typeWebhook === 'outgoingMessage' ||
        body.sendByApi === true ||
        body.messageData?.sendByApi === true
      ) {
        return res.status(200).json({ status: 'ignored', reason: 'Outgoing system/bot API message ignored' });
      }

      let messageText = '';
      let senderName = '';
      let senderPhone = '';
      let imageUrl = '';

      let detectedChatId = '';
      let detectedChatName = '';

      // 1. Direct / Generic JSON payload or Dashboard Simulator
      if (body.message || body.text || body.problem) {
        messageText = String(body.message || body.text || body.problem || '');
        senderName = String(body.senderName || body.sender || body.name || '');
        senderPhone = String(body.phone || body.from || '');
        imageUrl = String(body.imageUrl || body.photoUrl || '');
        detectedChatName = String(body.groupName || body.chatName || 'TFW Technical group');
        detectedChatId = String(body.chatId || '');
      }
      // 2. Green API (Incoming message from WhatsApp group)
      else if (body.typeWebhook === 'incomingMessageReceived' && body.messageData) {
        senderName = String(body.senderData?.senderName || body.senderData?.senderContactName || body.senderData?.chatName || (body.typeWebhook === 'outgoingMessageReceived' ? 'WhatsApp Member' : ''));
        senderPhone = String(body.senderData?.sender || body.senderData?.chatId || '').replace(/@c\.us|@s\.whatsapp\.net/g, '');
        detectedChatName = String(body.senderData?.chatName || 'TFW Technical group');
        detectedChatId = String(body.senderData?.chatId || '');

        const mData = body.messageData;
        const msgType = mData.typeMessage;

        if (msgType === 'textMessage') {
          messageText = String(mData.textMessageData?.textMessage || '');
        } else if (msgType === 'extendedTextMessage') {
          messageText = String(mData.extendedTextMessageData?.textMessage || mData.extendedTextMessageData?.description || '');
        } else if (msgType === 'quotedMessage') {
          messageText = String(mData.extendedTextMessageData?.textMessage || mData.quotedMessage?.textMessage || '');
        } else if (msgType === 'imageMessage') {
          messageText = String(mData.imageMessageData?.caption || 'Photo reported via WhatsApp');
          imageUrl = String(mData.imageMessageData?.downloadUrl || mData.fileMessageData?.downloadUrl || '');
        } else if (msgType === 'documentMessage') {
          messageText = String(mData.documentMessageData?.caption || mData.documentMessageData?.fileName || 'Document reported via WhatsApp');
          imageUrl = String(mData.documentMessageData?.downloadUrl || '');
        } else if (msgType === 'audioMessage') {
          messageText = String(mData.audioMessageData?.caption || 'Voice note reported via WhatsApp');
        } else if (msgType === 'videoMessage') {
          messageText = String(mData.videoMessageData?.caption || 'Video clip reported via WhatsApp');
          imageUrl = String(mData.videoMessageData?.downloadUrl || '');
        } else {
          messageText = String(
            mData.textMessageData?.textMessage || 
            mData.extendedTextMessageData?.textMessage || 
            mData.caption || 
            'Message from WhatsApp group'
          );
        }
      }
      // 3. Whapi.cloud (Group message event)
      else if (Array.isArray(body.messages) && body.messages.length > 0) {
        const m = body.messages[0];
        senderName = String(m.from_name || '');
        senderPhone = String(m.from || '');
        messageText = String(m.text?.body || m.caption || '');
        if (m.image?.link) imageUrl = String(m.image.link);
      }
      // 4. UltraMsg / Chat-API
      else if (body.data) {
        senderName = String(body.data.pushname || body.data.from || '');
        senderPhone = String(body.data.from || '');
        messageText = String(body.data.body || '');
        if (body.data.media) imageUrl = String(body.data.media);
      }
      // 5. Meta WhatsApp Cloud API
      else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const val = body.entry[0].changes[0].value;
        const m = val.messages[0];
        senderName = String(val.contacts?.[0]?.profile?.name || '');
        senderPhone = String(m.from || '');
        messageText = String(m.text?.body || '');
      }
      // 6. Twilio WhatsApp
      else if (body.Body) {
        messageText = String(body.Body || '');
        senderName = String(body.ProfileName || '');
        senderPhone = String(body.From || '');
      }

      // User directive: "Please sync only ' Technical support TFW' , rest of the msg will not come into Reported Issue (Associates)"
      const TECH_SUPPORT_CHAT_ID = '120363024724303859@g.us';
      const isTechSupportGroup = (chatId: string, chatName: string) => {
        const id = String(chatId || '').toLowerCase().trim();
        const name = String(chatName || '').toLowerCase().trim();
        if (id === TECH_SUPPORT_CHAT_ID) return true;
        if (name.includes('technical support') || name.includes('tfw technical group')) {
          return true;
        }
        return false;
      };

      if (detectedChatId && !isTechSupportGroup(detectedChatId, detectedChatName)) {
        return res.status(200).json({ status: 'ignored', reason: 'Only messages from Technical support TFW are synced' });
      }
      if (detectedChatName && !isTechSupportGroup(detectedChatId, detectedChatName)) {
        return res.status(200).json({ status: 'ignored', reason: 'Only messages from Technical support TFW are synced' });
      }

      // If no valid text message in payload (e.g. status acknowledgment or read receipt), ignore gracefully
      if (!messageText.trim()) {
        return res.status(200).json({ status: 'ignored', reason: 'No message content in payload' });
      }

      const cleanMessage = messageText.trim().slice(0, 1000);

      // Block any resolved records or system notifications from entering Reported Issues
      if (isResolutionOrSystemMessage(cleanMessage)) {
        return res.status(200).json({ status: 'ignored', reason: 'Resolved record or system notification message ignored' });
      }

      if (
        senderName.toLowerCase().includes('tfw management') ||
        senderName.toLowerCase().includes('maintenance desk') ||
        senderName.toLowerCase().includes('maintenance dashboard')
      ) {
        return res.status(200).json({ status: 'ignored', reason: 'System / bot sender ignored' });
      }

      // Deduplication check: prevent same sender sending exact duplicate text within 5 seconds
      const dedupKey = `${senderPhone || senderName}:${cleanMessage}`;
      const now = Date.now();
      if (recentWhatsAppTickets.has(dedupKey)) {
        const lastTime = recentWhatsAppTickets.get(dedupKey) || 0;
        if (now - lastTime < 5000) {
          return res.status(200).json({ status: 'ignored', reason: 'Duplicate message filtered' });
        }
      }
      recentWhatsAppTickets.set(dedupKey, now);
      // Clean old keys from deduplication cache
      if (recentWhatsAppTickets.size > 200) {
        for (const [k, t] of recentWhatsAppTickets.entries()) {
          if (now - t > 60000) recentWhatsAppTickets.delete(k);
        }
      }

      const db = loadDatabase();

      // Retrieve configured rides to match against message
      let ridesList: Array<{ id: number; name: string; floor?: string }> = [];
      if (Array.isArray(db.config?.rides)) {
        ridesList = db.config.rides;
      } else if (db.config?.rides && typeof db.config.rides === 'object') {
        ridesList = Object.entries(db.config.rides).map(([id, r]: any) => ({
          id: Number(id),
          name: r.name || `Ride ${id}`,
          floor: r.floor
        }));
      }

      // Match ride using 1st-line prioritized matcher
      let matchedRide: { id: number; name: string } | null = null;
      if (body.rideId && ridesList.some(r => r.id === Number(body.rideId))) {
        matchedRide = ridesList.find(r => r.id === Number(body.rideId))!;
      } else {
        matchedRide = matchRideFromMessage(cleanMessage, ridesList);
      }

      // Detect ticket priority automatically from keywords
      const priority = detectTicketPriority(cleanMessage);

      // Check if ticket was permanently deleted or discarded
      const incomingMsgId = String(body.idMessage || body.messageData?.idMessage || '');
      if (incomingMsgId && processedWhatsAppMessageIds.has(incomingMsgId)) {
        return res.status(200).json({ status: 'ignored', reason: 'WhatsApp message already processed' });
      }
      if (isTicketDeleted(db, undefined, incomingMsgId, matchedRide.id, cleanMessage)) {
        if (incomingMsgId) markWhatsAppMessageProcessed(incomingMsgId);
        return res.status(200).json({ status: 'ignored', reason: 'Ticket was previously deleted/discarded' });
      }

      // Check if this issue is already solved anywhere in Resolved Records
      if (isIssueAlreadySolved(db, matchedRide.id, cleanMessage, incomingMsgId)) {
        if (incomingMsgId) markWhatsAppMessageProcessed(incomingMsgId);
        return res.status(200).json({ status: 'ignored', reason: 'Issue is already solved in Resolved Records' });
      }

      // Check if ticket already exists anywhere in the database
      const existing = findExistingMaintenanceTicket(db, undefined, incomingMsgId, matchedRide.id, cleanMessage);
      if (existing) {
        if (incomingMsgId) {
          markWhatsAppMessageProcessed(incomingMsgId);
        }
        if (existing.ticket.status === 'solved' || existing.ticket.status === 'in-progress') {
          return res.status(200).json({ status: 'ignored', reason: 'Ticket already exists and is active/resolved', ticketId: existing.ticketId });
        }
      }

      // Construct safe ticket object complying strictly with MaintenanceTicket interface
      const msgTime = new Date();
      const ticketDate = getDhakaDateString(msgTime);
      const ticketId = `${ticketDate}-${matchedRide.id}-${now}`;

      const newTicket = {
        id: ticketId,
        date: ticketDate,
        rideId: matchedRide.id,
        rideName: matchedRide.name,
        problem: cleanMessage,
        status: 'reported',
        reportedById: 9999,
        reportedByName: senderName ? `${senderName} (WhatsApp)` : 'WhatsApp Group Member',
        reportedByRole: senderPhone ? `WhatsApp: ${senderPhone}` : 'WhatsApp Group Report',
        source: 'whatsapp',
        feedbackCategory: 'WhatsApp Group Report',
        priority,
        reportedAt: msgTime.toISOString(),
        photoUrl: imageUrl || undefined,
        whatsappGroup: 'Technical support TFW',
        whatsappChatId: detectedChatId || TECH_SUPPORT_CHAT_ID,
        whatsappMessageId: incomingMsgId || undefined
      };

      // Ensure data.maintenanceTickets container exists
      if (!db.data.maintenanceTickets) db.data.maintenanceTickets = {};
      if (!db.data.maintenanceTickets[ticketDate]) db.data.maintenanceTickets[ticketDate] = {};

      if (!db.config.whatsappConfig) {
        db.config.whatsappConfig = {
          targetGroupName: 'Technical support TFW',
          autoNotifyOnSolved: true,
          autoNotifyOnAssigned: false
        };
      }
      db.config.whatsappConfig.targetGroupName = 'Technical support TFW';
      db.config.whatsappConfig.groupChatId = TECH_SUPPORT_CHAT_ID;
      db.config.whatsappConfig.detectedGroupName = 'Technical support TFW';
      db.config.whatsappConfig.lastMessage = cleanMessage;
      db.config.whatsappConfig.lastSender = senderName;
      db.config.whatsappConfig.lastMessageAt = new Date().toISOString();

      // Completely isolated write: only touches data.maintenanceTickets[ticketDate][ticketId]
      db.data.maintenanceTickets[ticketDate][ticketId] = newTicket;

      // Add record to historyLog for auditability
      if (!db.data.historyLog) db.data.historyLog = {};
      const historyId = now;
      const historyEntry = {
        id: historyId,
        timestamp: new Date().toISOString(),
        user: senderName ? `${senderName} (WhatsApp)` : 'WhatsApp Gateway',
        action: 'WHATSAPP_TICKET_CREATED',
        details: `[WHATSAPP ${detectedChatName ? `(${detectedChatName})` : ''}] ${matchedRide.name}: ${cleanMessage.slice(0, 100)}`
      };
      db.data.historyLog[historyId] = historyEntry;
      trimHistoryLogs(db);

      // Save safely to atomic disk and broadcast immediately via SSE to all open tabs
      saveDatabaseToDisk({
        type: 'update',
        updates: {
          [`data/maintenanceTickets/${ticketDate}/${ticketId}`]: newTicket,
          [`data/historyLog/${historyId}`]: historyEntry,
          'config/whatsappConfig': db.config.whatsappConfig
        },
        senderId: 'whatsapp-webhook'
      });

      console.log(`[WhatsApp Webhook] Ticket created: ${ticketId} for ride "${matchedRide.name}" from ${senderName || senderPhone} (Group: ${detectedChatName || 'TFW Group'})`);

      res.status(200).json({
        success: true,
        ticketId,
        rideId: matchedRide.id,
        rideName: matchedRide.name,
        groupName: detectedChatName || 'Technical support TFW',
        groupChatId: detectedChatId,
        priority,
        reportedAt: newTicket.reportedAt,
        message: 'Maintenance ticket created and broadcasted to dashboard successfully'
      });
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Processing error:', err);
      // Even in case of unexpected input error, return 500 without corrupting database
      res.status(500).json({ error: 'Failed to process WhatsApp webhook payload', details: err?.message });
    }
  });

  // Outgoing WhatsApp Message Helper via Green API
  async function sendGreenApiWhatsAppMessage(message: string, overrideChatId?: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const db = loadDatabase();
    const cfg = db.config?.whatsappConfig || {};
    const idInstance = cfg.idInstance || process.env.GREEN_API_ID_INSTANCE;
    const apiTokenInstance = cfg.apiTokenInstance || process.env.GREEN_API_TOKEN_INSTANCE;
    const chatId = overrideChatId || cfg.groupChatId || cfg.detectedGroupChatId;

    if (!idInstance || !apiTokenInstance) {
      return { 
        success: false, 
        error: 'Green API Instance ID and Token are not configured yet. Please enter them in the WhatsApp Group settings modal.' 
      };
    }
    if (!chatId) {
      return { 
        success: false, 
        error: 'Target WhatsApp Group ID (@g.us) not detected yet. Post any test message in "Technical support TFW" on your phone, and the system will automatically lock onto the group.' 
      };
    }

    try {
      const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.idMessage) {
        return { success: true, messageId: data.idMessage };
      }
      return { success: false, error: data.message || `Green API returned status ${response.status}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error contacting Green API' };
    }
  }

  // Outgoing WhatsApp Media Helper (uploads image and sends with caption via Green API)
  async function sendGreenApiWhatsAppMedia(
    mediaData: string, 
    caption: string, 
    overrideChatId?: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const db = loadDatabase();
    const cfg = db.config?.whatsappConfig || {};
    const idInstance = cfg.idInstance || process.env.GREEN_API_ID_INSTANCE;
    const apiTokenInstance = cfg.apiTokenInstance || process.env.GREEN_API_TOKEN_INSTANCE;
    const chatId = overrideChatId || cfg.groupChatId || cfg.detectedGroupChatId;

    if (!idInstance || !apiTokenInstance) {
      return { 
        success: false, 
        error: 'Green API Instance ID and Token are not configured yet.' 
      };
    }
    if (!chatId) {
      return { 
        success: false, 
        error: 'Target WhatsApp Group ID (@g.us) not detected yet.' 
      };
    }

    try {
      let fileUrl = mediaData;
      let fileName = 'repair_proof.jpg';

      // If mediaData is a base64 Data URL, upload it to Green API's media cloud storage first
      if (mediaData.startsWith('data:')) {
        let mimeType = 'image/jpeg';
        let buffer: Buffer;

        const matches = mediaData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1] || 'image/jpeg';
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          const comma = mediaData.indexOf(',');
          buffer = Buffer.from(mediaData.slice(comma + 1), 'base64');
        }

        if (mimeType.includes('png')) fileName = 'repair_proof.png';
        else if (mimeType.includes('webp')) fileName = 'repair_proof.webp';
        else fileName = 'repair_proof.jpg';

        const uploadUrl = `https://api.green-api.com/waInstance${idInstance}/uploadFile/${apiTokenInstance}`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': mimeType
          },
          body: buffer
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData.urlFile) {
          throw new Error(uploadData.message || `Failed to upload image to Green API (status ${uploadRes.status})`);
        }
        fileUrl = uploadData.urlFile;
      }

      // Dispatch file with caption to the WhatsApp group
      const sendUrl = `https://api.green-api.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;
      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          urlFile: fileUrl,
          fileName,
          caption: caption.length > 1024 ? caption.slice(0, 1020) + '...' : caption
        })
      });

      const sendData = await sendRes.json().catch(() => ({}));
      if (sendRes.ok && sendData.idMessage) {
        return { success: true, messageId: sendData.idMessage };
      }
      throw new Error(sendData.message || `Green API sendFileByUrl error: status ${sendRes.status}`);
    } catch (err: any) {
      console.warn('Green API media send failed, falling back to text notification:', err.message);
      // Graceful fallback to text message
      return sendGreenApiWhatsAppMessage(caption, overrideChatId);
    }
  }

  // WhatsApp Configuration Endpoints
  app.get('/api/whatsapp/config', (req, res) => {
    const db = loadDatabase();
    const cfg = db.config?.whatsappConfig || {};
    res.json({
      idInstance: cfg.idInstance || process.env.GREEN_API_ID_INSTANCE || '',
      hasToken: Boolean(cfg.apiTokenInstance || process.env.GREEN_API_TOKEN_INSTANCE),
      groupChatId: cfg.groupChatId || cfg.detectedGroupChatId || '',
      detectedGroupName: cfg.detectedGroupName || 'Technical support TFW',
      targetGroupName: cfg.targetGroupName || 'Technical support TFW',
      autoNotifyOnSolved: cfg.autoNotifyOnSolved !== false,
      autoNotifyOnAssigned: cfg.autoNotifyOnAssigned === true,
      lastMessage: cfg.lastMessage || null,
      lastSender: cfg.lastSender || null,
      lastMessageAt: cfg.lastMessageAt || null
    });
  });

  app.post('/api/whatsapp/config', (req, res) => {
    const { idInstance, apiTokenInstance, groupChatId, targetGroupName, autoNotifyOnSolved, autoNotifyOnAssigned } = req.body || {};
    const db = loadDatabase();
    if (!db.config.whatsappConfig) db.config.whatsappConfig = {};

    if (idInstance !== undefined) db.config.whatsappConfig.idInstance = String(idInstance).trim();
    if (apiTokenInstance !== undefined && String(apiTokenInstance).trim() !== '') {
      db.config.whatsappConfig.apiTokenInstance = String(apiTokenInstance).trim();
    }
    if (groupChatId !== undefined) db.config.whatsappConfig.groupChatId = String(groupChatId).trim();
    if (targetGroupName !== undefined) db.config.whatsappConfig.targetGroupName = String(targetGroupName).trim();
    if (autoNotifyOnSolved !== undefined) db.config.whatsappConfig.autoNotifyOnSolved = Boolean(autoNotifyOnSolved);
    if (autoNotifyOnAssigned !== undefined) db.config.whatsappConfig.autoNotifyOnAssigned = Boolean(autoNotifyOnAssigned);

    saveDatabaseToDisk({
      type: 'update',
      updates: { 'config/whatsappConfig': db.config.whatsappConfig }
    });

    res.json({ success: true, config: db.config.whatsappConfig });
  });

  // Outgoing message send endpoint (Direct chat to WhatsApp group)
  app.post('/api/whatsapp/send', async (req, res) => {
    const { message, chatId, sender = 'Maintenance Desk' } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const result = await sendGreenApiWhatsAppMessage(String(message).trim(), chatId);
    if (result.success) {
      if (result.messageId) {
        markWhatsAppMessageProcessed(result.messageId);
      }
      // Record outgoing broadcast in history log
      const db = loadDatabase();
      const now = Date.now();
      const historyId = now;
      const historyEntry = {
        id: historyId,
        timestamp: new Date().toISOString(),
        user: sender,
        action: 'WHATSAPP_MESSAGE_SENT',
        details: `[WHATSAPP OUTGOING] Sent to group: ${String(message).slice(0, 120)}`
      };
      if (!db.data.historyLog) db.data.historyLog = {};
      db.data.historyLog[historyId] = historyEntry;
      trimHistoryLogs(db);

      saveDatabaseToDisk({
        type: 'update',
        updates: { [`data/historyLog/${historyId}`]: historyEntry }
      });

      return res.json({ success: true, messageId: result.messageId });
    }

    res.status(400).json({ error: result.error });
  });

  // Deduplication cache for outgoing solved notifications (prevents duplicate WhatsApp messages within 10 seconds)
  const recentSolvedNotifications = new Map<string, number>();

  // Dispatch formatted ticket update to WhatsApp group
  app.post('/api/whatsapp/send-ticket-update', async (req, res) => {
    const { 
      ticketId, 
      rideName, 
      action, // 'solved' | 'assigned' | 'progress' | 'custom'
      technicianName, 
      helpers = [], 
      notes, 
      reportedProblem,
      photoData,
      imageUrl,
      solutionImageUrl,
      sender = 'Maintenance Dashboard' 
    } = req.body || {};

    if (action === 'solved' && ticketId) {
      const lastSent = recentSolvedNotifications.get(ticketId);
      if (lastSent && Date.now() - lastSent < 10000) {
        return res.json({ success: true, alreadySent: true, message: 'Notification already sent recently.' });
      }

      // Auto-update ticket status in persistent database and broadcast via SSE to all clients in real-time
      try {
        const db = loadDatabase();
        if (db.data?.maintenanceTickets) {
          let updatedTicket: any = null;
          let targetDateKey: string = '';

          for (const [d, dayTickets] of Object.entries(db.data.maintenanceTickets)) {
            if (dayTickets && typeof dayTickets === 'object' && (dayTickets as any)[ticketId]) {
              targetDateKey = d;
              updatedTicket = (dayTickets as any)[ticketId];
              break;
            }
          }

          if (!updatedTicket && req.body?.rideId) {
            for (const [d, dayTickets] of Object.entries(db.data.maintenanceTickets)) {
              if (dayTickets && typeof dayTickets === 'object') {
                for (const [tId, t] of Object.entries(dayTickets as any)) {
                  if (t && (t as any).rideId === req.body.rideId && (t as any).status !== 'solved') {
                    targetDateKey = d;
                    updatedTicket = t;
                    break;
                  }
                }
              }
              if (updatedTicket) break;
            }
          }

          if (updatedTicket) {
            const validSolvedAt = (req.body?.solvedAt && !isNaN(new Date(req.body.solvedAt).getTime()))
              ? new Date(req.body.solvedAt).toISOString()
              : new Date().toISOString();
            updatedTicket.status = 'solved';
            updatedTicket.solvedAt = validSolvedAt;
            updatedTicket.updatedAt = new Date().toISOString();
            if (notes) updatedTicket.resolutionNotes = notes;
            if (photoData || imageUrl || solutionImageUrl || req.body?.photoUrl) {
              updatedTicket.solutionImageUrl = photoData || imageUrl || solutionImageUrl || req.body?.photoUrl;
            }
            if (technicianName) updatedTicket.assignedToName = technicianName;
            if (Array.isArray(helpers) && helpers.length > 0) updatedTicket.helperNames = helpers;

            saveDatabaseToDisk({
              type: 'update',
              updates: {
                [`data/maintenanceTickets/${targetDateKey}/${updatedTicket.id || ticketId}`]: updatedTicket
              }
            });
          }
        }
      } catch (err) {
        console.error('Error auto-updating ticket in send-ticket-update:', err);
      }
    }

    const rawPhoto = photoData || imageUrl || solutionImageUrl || req.body?.photoUrl;

    let formattedMessage = '';
    // Format timestamp in GMT+6 (Asia/Dhaka) Bangladesh Standard Time
    const targetDate = req.body?.solvedAt ? new Date(req.body.solvedAt) : (req.body?.timestamp ? new Date(req.body.timestamp) : new Date());
    const validDate = isNaN(targetDate.getTime()) ? new Date() : targetDate;
    const timeStr = validDate.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (action === 'assigned') {
      // Dispatched / Assigned notifications are disabled per user request
      return res.json({ success: true, ignored: true, message: 'Dispatched notifications are disabled.' });
    }

    if (action === 'solved') {
      formattedMessage = 
        `✅ *[TFW Maintenance Team - SOLVED]*\n` +
        `🎢 *Ride:* ${rideName || 'Attraction'}\n` +
        `🛠️ *Engineer / Technician:* ${technicianName || 'Maintenance Team'}${helpers.length ? ` (Helpers: ${helpers.join(', ')})` : ''}\n` +
        `📋 *Issue:* ${reportedProblem || 'Reported problem'}\n` +
        `💡 *Resolution Notes:* ${notes || 'Issue repaired and operational clearance given.'}\n` +
        `⏱️ *Time Solved:* ${timeStr}\n` +
        `🏢 *Dispatched By:* Maintenance Team`;
    } else if (action === 'assigned') {
      formattedMessage = 
        `🔧 *[TFW Maintenance - TECHNICIAN DISPATCHED]*\n` +
        `🎢 *Ride:* ${rideName || 'Attraction'}\n` +
        `👷 *Assigned Engineer / Technician:* ${technicianName || 'Engineer / Technician'}${helpers.length ? ` (Helpers: ${helpers.join(', ')})` : ''}\n` +
        `📋 *Problem:* ${reportedProblem || 'Inspection requested'}\n` +
        `⏱️ *Dispatched At:* ${timeStr}`;
    } else {
      formattedMessage = 
        `📢 *[TFW Technical Support Update]*\n` +
        `🎢 *Ride:* ${rideName || 'Attraction'}\n` +
        `📝 *Update:* ${notes || reportedProblem || ''}\n` +
        `⏱️ *Time:* ${timeStr}`;
    }

    let result: { success: boolean; error?: string; messageId?: string };
    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().length > 10) {
      result = await sendGreenApiWhatsAppMedia(rawPhoto.trim(), formattedMessage);
    } else {
      result = await sendGreenApiWhatsAppMessage(formattedMessage);
    }

    if (result.success) {
      if (ticketId) {
        recentSolvedNotifications.set(ticketId, Date.now());
      }
      if (result.messageId) {
        markWhatsAppMessageProcessed(result.messageId);
      }
      return res.json({ success: true, messageId: result.messageId, formattedMessage, hasMedia: Boolean(rawPhoto) });
    }
    // Return friendly status without breaking the UI flow
    res.status(200).json({ success: false, error: result.error, fallbackLogged: true });
  });

  // Pre-seed processed IDs on startup from persistent database and all existing tickets
  try {
    const initialDb = loadDatabase();
    if (Array.isArray(initialDb.config?.whatsappConfig?.processedMessageIds)) {
      for (const id of initialDb.config.whatsappConfig.processedMessageIds) {
        if (id) processedWhatsAppMessageIds.add(String(id));
      }
    }
    if (initialDb.data?.maintenanceTickets) {
      for (const dayTickets of Object.values(initialDb.data.maintenanceTickets)) {
        if (dayTickets && typeof dayTickets === 'object') {
          for (const t of Object.values(dayTickets as Record<string, any>)) {
            if (t?.whatsappMessageId) {
              processedWhatsAppMessageIds.add(String(t.whatsappMessageId));
            }
          }
        }
      }
    }
  } catch (e) {}

  let greenApiRateLimitedUntil = 0;

  // Background WhatsApp Sync Engine: Directly polls Green API for new incoming group messages
  async function syncGreenApiGroupMessages(force = false): Promise<{ success: boolean; newTickets: number; error?: string }> {
    if (!force && Date.now() < greenApiRateLimitedUntil) {
      return { success: false, newTickets: 0, error: 'Green API rate limited (429) - waiting for cooldown' };
    }
    const db = loadDatabase();
    const cfg = db.config?.whatsappConfig || {};
    const idInstance = cfg.idInstance || process.env.GREEN_API_ID_INSTANCE || '710522727617';
    const apiTokenInstance = cfg.apiTokenInstance || process.env.GREEN_API_TOKEN_INSTANCE || '8ef1451101d7484cbd2e35bbc21615f1c3b929591a9644e9a8';

    if (!idInstance || !apiTokenInstance) {
      return { success: false, newTickets: 0, error: 'Green API credentials missing' };
    }

    // User directive: "Please sync only ' Technical support TFW' , rest of the msg will not come into Reported Issue (Associates)"
    const targetGroupId = '120363024724303859@g.us';
    const targetGroupName = 'Technical support TFW';

    // Seed set of WhatsApp message IDs that already have tickets in maintenanceTickets
    const existingTicketMsgIds = new Set<string>();
    if (db.data?.maintenanceTickets) {
      for (const d of Object.keys(db.data.maintenanceTickets)) {
        for (const t of Object.values(db.data.maintenanceTickets[d]) as any[]) {
          if (t?.whatsappMessageId) {
            existingTicketMsgIds.add(String(t.whatsappMessageId));
            markWhatsAppMessageProcessed(String(t.whatsappMessageId));
          }
        }
      }
    }

    try {
      // Strictly fetch messages only from the official "Technical support TFW" group (120363024724303859@g.us)
      const allIncomingMessages: any[] = [];

      try {
        const historyUrl = `https://api.green-api.com/waInstance${idInstance}/getChatHistory/${apiTokenInstance}`;
        const res = await fetch(historyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: targetGroupId, count: 50 })
        });
        if (res.status === 429) {
          greenApiRateLimitedUntil = Date.now() + 25000;
          return { success: false, newTickets: 0, error: 'Green API rate limited (429) - waiting for cooldown' };
        }
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            for (const m of list) {
              if (m) {
                m._sourceChatId = targetGroupId;
                allIncomingMessages.push(m);
              }
            }
          }
        }
      } catch (e) {
        console.error('[WhatsApp Sync] Failed to fetch chat history for Technical support TFW:', e);
      }

      // Deduplicate array by idMessage
      const uniqueMsgs = new Map<string, any>();
      for (const m of allIncomingMessages) {
        if (m && m.idMessage && !uniqueMsgs.has(m.idMessage)) {
          uniqueMsgs.set(m.idMessage, m);
        }
      }

      // Sort chronologically (oldest to newest)
      const sortedMsgs = Array.from(uniqueMsgs.values()).sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );

      let newTicketsCount = 0;
      const now = Date.now();

      // Prepare rides list for auto-detection
      let ridesList: Array<{ id: number; name: string; floor?: number | string }> = [];
      if (Array.isArray(db.config?.rides)) {
        ridesList = db.config.rides;
      } else if (db.config?.rides && typeof db.config.rides === 'object') {
        ridesList = Object.entries(db.config.rides).map(([id, r]: any) => ({
          id: Number(id),
          name: r.name || `Ride ${id}`,
          floor: r.floor
        }));
      }

      const newTicketUpdates: { [path: string]: any } = {};

      for (const m of sortedMsgs) {
        const idMessage = String(m.idMessage || '');
        if (!idMessage) continue;

        // If this message already created a ticket that currently exists in maintenanceTickets, skip creation
        if (existingTicketMsgIds.has(idMessage)) {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // If user explicitly deleted this specific WhatsApp message, honor the deletion
        if (db.config?.deletedWhatsAppMessageIds?.includes(idMessage)) {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // In normal polling, skip if already marked processed
        if (!force && processedWhatsAppMessageIds.has(idMessage)) {
          continue;
        }

        // Skip automated bot messages sent by our system via API or outgoing messages
        if (m.sendByApi === true || m.type === 'outgoing') {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // Ignore pure reaction messages or status stubs
        if (m.typeMessage === 'reactionMessage') {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // Extract text thoroughly from various Green API message shapes
        const cleanMessage = String(
          m.textMessage ||
          m.extendedTextMessage?.text ||
          m.extendedTextMessageData?.textMessage ||
          m.caption ||
          m.imageMessageData?.caption ||
          m.quotedMessage?.textMessage ||
          m.messageData?.textMessageData?.textMessage ||
          m.messageData?.extendedTextMessageData?.textMessage ||
          m.messageData?.imageMessageData?.caption ||
          ''
        ).trim();

        if (!cleanMessage) {
          continue;
        }

        // Strictly filter out any resolved records or maintenance broadcasts so they never create tickets
        if (isResolutionOrSystemMessage(cleanMessage)) {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // Sender info
        const senderName = String(
          m.senderContactName ||
          m.senderName ||
          m.senderData?.senderContactName ||
          m.senderData?.senderName ||
          (m.type === 'outgoing' ? 'TFW Staff' : 'WhatsApp Member')
        );
        if (
          senderName.toLowerCase().includes('tfw management') ||
          senderName.toLowerCase().includes('maintenance desk') ||
          senderName.toLowerCase().includes('maintenance dashboard')
        ) {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        const senderPhone = String(m.senderId || m.sender || m.chatId || m.senderData?.sender || '').replace(/@c\.us|@g\.us|@s\.whatsapp\.net/g, '');
        const imageUrl = String(
          m.downloadUrl ||
          m.fileMessageData?.downloadUrl ||
          m.imageMessageData?.downloadUrl ||
          m.messageData?.imageMessageData?.downloadUrl ||
          m.messageData?.fileMessageData?.downloadUrl ||
          ''
        );

        // Match ride using prioritized matcher
        const matchedRide = matchRideFromMessage(cleanMessage, ridesList);

        // Detect priority
        const priority = detectTicketPriority(cleanMessage);

        const msgTime = m.timestamp ? new Date(m.timestamp * 1000) : new Date();
        const ticketDate = getDhakaDateString(msgTime);
        const ticketId = `${ticketDate}-${matchedRide.id}-${m.timestamp || now}`;

        // Check if ticket was deleted or discarded
        if (isTicketDeleted(db, ticketId, idMessage, matchedRide.id, cleanMessage)) {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // Check if this issue is already solved in Resolved Records
        if (isIssueAlreadySolved(db, matchedRide.id, cleanMessage, idMessage)) {
          markWhatsAppMessageProcessed(idMessage);
          continue;
        }

        // Check if ticket already exists across all dates
        const existing = findExistingMaintenanceTicket(db, ticketId, idMessage, matchedRide.id, cleanMessage);
        if (existing) {
          markWhatsAppMessageProcessed(idMessage);
          // If already in-progress or solved, NEVER overwrite or downgrade status!
          if (existing.ticket.status === 'solved' || existing.ticket.status === 'in-progress') {
            continue;
          }
          // If reported, only update photoUrl if it was missing
          if (imageUrl && !existing.ticket.photoUrl) {
            existing.ticket.photoUrl = imageUrl;
            db.data.maintenanceTickets[existing.dateKey][existing.ticketId] = existing.ticket;
            newTicketUpdates[`data/maintenanceTickets/${existing.dateKey}/${existing.ticketId}/photoUrl`] = imageUrl;
          }
          continue;
        }

        const msgChatId = targetGroupId;
        const msgGroupName = targetGroupName;

        const newTicket = {
          id: ticketId,
          date: ticketDate,
          rideId: matchedRide.id,
          rideName: matchedRide.name,
          problem: cleanMessage,
          status: 'reported',
          reportedById: 9999,
          reportedByName: `${senderName} (WhatsApp)`,
          reportedByRole: senderPhone ? `WhatsApp: ${senderPhone}` : 'Technical support TFW',
          source: 'whatsapp',
          feedbackCategory: 'WhatsApp Group Report',
          priority,
          reportedAt: msgTime.toISOString(),
          photoUrl: imageUrl || undefined,
          whatsappGroup: targetGroupName,
          whatsappChatId: targetGroupId,
          whatsappMessageId: idMessage
        };

        if (!db.data.maintenanceTickets) db.data.maintenanceTickets = {};
        if (!db.data.maintenanceTickets[ticketDate]) db.data.maintenanceTickets[ticketDate] = {};

        db.data.maintenanceTickets[ticketDate][ticketId] = newTicket;
        existingTicketMsgIds.add(idMessage);
        markWhatsAppMessageProcessed(idMessage);
        newTicketsCount++;

        // History log
        if (!db.data.historyLog) db.data.historyLog = {};
        const historyId = Date.now() + newTicketsCount;
        const historyEntry = {
          id: historyId,
          timestamp: new Date().toISOString(),
          user: `${senderName} (WhatsApp)`,
          action: 'WHATSAPP_TICKET_CREATED',
          details: `[WHATSAPP (${targetGroupName})] ${matchedRide.name}: ${cleanMessage.slice(0, 100)}`
        };
        db.data.historyLog[historyId] = historyEntry;

        // Update config
        if (!db.config.whatsappConfig) db.config.whatsappConfig = {};
        db.config.whatsappConfig.groupChatId = targetGroupId;
        db.config.whatsappConfig.detectedGroupName = targetGroupName;
        db.config.whatsappConfig.targetGroupName = targetGroupName;
        db.config.whatsappConfig.lastMessage = cleanMessage;
        db.config.whatsappConfig.lastSender = senderName;
        db.config.whatsappConfig.lastMessageAt = msgTime.toISOString();

        // Queue real-time delta update paths (use ticketDate so it lands in the right date container)
        newTicketUpdates[`data/maintenanceTickets/${ticketDate}/${ticketId}`] = newTicket;
        newTicketUpdates[`data/historyLog/${historyId}`] = historyEntry;
        newTicketUpdates['config/whatsappConfig'] = db.config.whatsappConfig;
      }

      if (newTicketsCount > 0) {
        trimHistoryLogs(db);
        saveDatabaseToDisk({
          type: 'update',
          updates: newTicketUpdates
        });
        broadcastMutation({
          type: 'update',
          updates: newTicketUpdates,
          senderId: 'server-instance'
        });
        console.log(`[WhatsApp Sync Engine] Synchronized ${newTicketsCount} new tickets from WhatsApp`);
      }

      return { success: true, newTickets: newTicketsCount };
    } catch (err: any) {
      console.error('[WhatsApp Sync Engine Error]:', err);
      return { success: false, newTickets: 0, error: err.message };
    }
  }

  // Manual WhatsApp Sync Now endpoint
  app.post('/api/whatsapp/sync-now', async (req, res) => {
    try {
      const result = await syncGreenApiGroupMessages(true);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset processed WhatsApp message IDs (re-seeds only from actual existing tickets)
  app.post('/api/whatsapp/reset-processed', (req, res) => {
    processedWhatsAppMessageIds.clear();
    const db = loadDatabase();
    const existingTicketMsgIds = new Set<string>();
    if (db.data?.maintenanceTickets) {
      for (const dayTickets of Object.values(db.data.maintenanceTickets)) {
        if (dayTickets && typeof dayTickets === 'object') {
          for (const t of Object.values(dayTickets as Record<string, any>)) {
            if (t?.whatsappMessageId) {
              existingTicketMsgIds.add(String(t.whatsappMessageId));
              processedWhatsAppMessageIds.add(String(t.whatsappMessageId));
            }
          }
        }
      }
    }
    const cleanList = Array.from(existingTicketMsgIds);
    if (!db.config.whatsappConfig) db.config.whatsappConfig = {};
    db.config.whatsappConfig.processedMessageIds = cleanList;
    saveDatabaseToDisk({
      type: 'update',
      updates: { 'config/whatsappConfig/processedMessageIds': cleanList }
    });
    res.json({ success: true, message: 'Processed WhatsApp message IDs reset to active tickets', count: cleanList.length });
  });

  // Automatically configure Green API Webhook so incoming messages push immediately (<500ms)
  async function configureGreenApiWebhook() {
    const db = loadDatabase();
    const cfg = db.config?.whatsappConfig || {};
    const idInstance = cfg.idInstance || process.env.GREEN_API_ID_INSTANCE || '710522727617';
    const apiTokenInstance = cfg.apiTokenInstance || process.env.GREEN_API_TOKEN_INSTANCE || '8ef1451101d7484cbd2e35bbc21615f1c3b929591a9644e9a8';
    if (!idInstance || !apiTokenInstance) return;

    const appUrl = process.env.APP_URL || process.env.ORIGIN || 'https://ais-dev-57yrju4daawns34nnirr2j-662885913055.asia-southeast1.run.app';
    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/whatsapp`;

    try {
      const res = await fetch(`https://api.green-api.com/waInstance${idInstance}/setSettings/${apiTokenInstance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          incomingWebhook: 'yes',
          outgoingWebhook: 'yes',
          outgoingMessageWebhook: 'yes',
          outgoingAPIMessageWebhook: 'no'
        })
      });
      if (res.ok) {
        console.log(`[Green API] Webhook registered successfully to: ${webhookUrl}`);
      }
    } catch (e) {
      console.error('[Green API] Failed to set webhook settings:', e);
    }
  }

  // Register Green API webhook on startup
  setTimeout(() => {
    configureGreenApiWebhook().catch(() => {});
  }, 1000);

  // Background periodic polling every 12 seconds for reliable message detection without hitting rate limits
  setInterval(() => {
    syncGreenApiGroupMessages().catch(() => {});
  }, 12000);

  // Initial sync 2 seconds after startup
  setTimeout(() => {
    syncGreenApiGroupMessages().catch(() => {});
  }, 2000);

  // Batch update
  app.post('/api/db/update', (req, res) => {
    const { updates, basePath = '', senderId } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' });
    }
    const db = loadDatabase();
    const isExplicitReopen = Boolean(req.body.isExplicitReopen || updates.isExplicitReopen);
    for (const [p, val] of Object.entries(updates)) {
      setValueByPath(db, p, val, isExplicitReopen);
    }
    if (Object.keys(updates).some(k => k.includes('historyLog'))) {
      trimHistoryLogs(db);
    }
    saveDatabaseToDisk({ type: 'update', updates, senderId });
    res.json({ success: true, version: db.version });
  });

  // Remove path
  app.post('/api/db/remove', (req, res) => {
    const { path: pathStr, senderId } = req.body;
    if (!pathStr) {
      return res.status(400).json({ error: 'path is required' });
    }
    const db = loadDatabase();
    if (pathStr.startsWith('data/maintenanceTickets')) {
      const parts = pathStr.split('/').filter(Boolean);
      if (parts.length >= 4) {
        const targetDate = parts[2];
        const targetId = parts[3];
        cleanupDeletedTicket(db, targetId, targetDate);
      }
    }
    setValueByPath(db, pathStr, null);
    saveDatabaseToDisk({ type: 'remove', path: pathStr, senderId });
    res.json({ success: true, version: db.version });
  });

  // Permanently delete a maintenance ticket across all dates and cache
  app.post('/api/db/delete-ticket', (req, res) => {
    const { ticketId, date, whatsappMessageId, rideId, problem, senderId } = req.body;
    if (!ticketId && !whatsappMessageId) {
      return res.status(400).json({ error: 'ticketId or whatsappMessageId is required' });
    }
    const db = loadDatabase();
    const result = cleanupDeletedTicket(
      db,
      ticketId,
      date,
      whatsappMessageId,
      rideId ? Number(rideId) : undefined,
      problem
    );
    saveDatabaseToDisk({
      type: 'delete-ticket',
      ticketId,
      whatsappMessageId,
      rideId: rideId ? Number(rideId) : undefined,
      problem,
      date,
      deletedIds: result.deletedIds,
      deletedSignatures: db.config?.deletedTicketSignatures,
      maintenanceTickets: db.data?.maintenanceTickets,
      senderId
    });
    // Multi-device immediate broadcast: send clean maintenance tickets map directly
    broadcastMutation({
      type: 'set',
      path: 'data/maintenanceTickets',
      value: db.data?.maintenanceTickets || {},
      senderId
    });
    res.json({ success: true, deletedCount: result.deletedCount, version: db.version });
  });

  // Permanently clear all reported maintenance tickets for a given date
  app.post('/api/db/clear-reported-tickets', (req, res) => {
    const { date, senderId } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    const db = loadDatabase();
    if (!db.config) db.config = {};
    if (!Array.isArray(db.config.deletedTicketIds)) db.config.deletedTicketIds = [];
    if (!Array.isArray(db.config.deletedWhatsAppMessageIds)) db.config.deletedWhatsAppMessageIds = [];

    let deletedCount = 0;
    if (db.data?.maintenanceTickets && typeof db.data.maintenanceTickets === 'object') {
      const maint = db.data.maintenanceTickets;
      for (const dKey of Object.keys(maint)) {
        if (!maint[dKey] || typeof maint[dKey] !== 'object') continue;
        for (const [tId, tObjRaw] of Object.entries(maint[dKey])) {
          const tObj = tObjRaw as any;
          if (tObj && tObj.status === 'reported') {
            const isMatchDate = dKey === date || tObj.date === date || (tObj.reportedAt && tObj.reportedAt.startsWith(date));
            if (isMatchDate) {
              if (tObj.id && !db.config.deletedTicketIds.includes(tObj.id)) {
                db.config.deletedTicketIds.push(tObj.id);
              }
              if (tObj.whatsappMessageId) {
                if (!db.config.deletedWhatsAppMessageIds.includes(tObj.whatsappMessageId)) {
                  db.config.deletedWhatsAppMessageIds.push(tObj.whatsappMessageId);
                }
                markWhatsAppMessageProcessed(tObj.whatsappMessageId);
              }
              delete maint[dKey][tId];
              deletedCount++;
            }
          }
        }
        if (Object.keys(maint[dKey]).length === 0) {
          delete maint[dKey];
        }
      }
    }
    saveDatabaseToDisk({
      type: 'clear-reported-tickets',
      date,
      maintenanceTickets: db.data?.maintenanceTickets,
      senderId
    });
    // Multi-device immediate broadcast: send clean maintenance tickets map directly
    broadcastMutation({
      type: 'set',
      path: 'data/maintenanceTickets',
      value: db.data?.maintenanceTickets || {},
      senderId
    });
    res.json({ success: true, deletedCount, version: db.version });
  });

  // Reset specific day data
  app.post('/api/db/reset-day', (req, res) => {
    const { date, senderId } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    const db = loadDatabase();
    if (db.data.dailyCounts) delete db.data.dailyCounts[date];
    if (db.data.ticketSalesData) delete db.data.ticketSalesData[date];
    if (db.data.operatorAssignments) delete db.data.operatorAssignments[date];
    if (db.data.ticketSalesAssignments) delete db.data.ticketSalesAssignments[date];
    if (db.data.attendance) delete db.data.attendance[date];
    if (db.data.packageSales) delete db.data.packageSales[date];
    if (db.data.maintenanceTickets) delete db.data.maintenanceTickets[date];
    saveDatabaseToDisk({ type: 'reset-day', date, senderId });
    res.json({ success: true, message: `Data for ${date} successfully reset.` });
  });

  // Clean data older than cutoff date (e.g. 3 months / 90 days)
  app.post('/api/db/clean-older-than', (req, res) => {
    const { cutoffDate, senderId } = req.body;
    if (!cutoffDate) {
      return res.status(400).json({ error: 'cutoffDate is required' });
    }
    const db = loadDatabase();
    const collections = ['dailyCounts', 'ticketSalesData', 'operatorAssignments', 'ticketSalesAssignments', 'attendance', 'packageSales', 'maintenanceTickets'];
    const allDates = new Set<string>();
    
    collections.forEach(col => {
      if (db.data[col] && typeof db.data[col] === 'object') {
        Object.keys(db.data[col]).forEach(d => {
          if (d < cutoffDate) {
            allDates.add(d);
            delete db.data[col][d];
          }
        });
      }
    });

    saveDatabaseToDisk({ type: 'clean-older-than', cutoffDate, senderId });
    res.json({ success: true, deletedDatesCount: allDates.size, message: `Cleaned ${allDates.size} dates older than ${cutoffDate}.` });
  });

  // Reset 3-Month cycle, archive operational day logs, and start next interval
  app.post('/api/db/reset-cycle', (req, res) => {
    const { newCycleStartDate, senderId } = req.body;
    const db = loadDatabase();
    const collections = ['dailyCounts', 'ticketSalesData', 'operatorAssignments', 'ticketSalesAssignments', 'attendance', 'packageSales', 'maintenanceTickets'];
    
    collections.forEach(col => {
      if (db.data[col] && typeof db.data[col] === 'object') {
        Object.keys(db.data[col]).forEach(d => {
          if (newCycleStartDate && d < newCycleStartDate) {
            delete db.data[col][d];
          }
        });
      }
    });

    const startDateObj = new Date(newCycleStartDate || new Date().toISOString().split('T')[0]);
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + 3);
    const newCycleEndDate = endDateObj.toISOString().split('T')[0];

    if (!db.config.appConfig) db.config.appConfig = {};
    db.config.appConfig.cycleStartDate = newCycleStartDate;
    db.config.appConfig.cycleEndDate = newCycleEndDate;
    db.config.appConfig.cycleIntervalMonths = 3;
    db.config.appConfig.lastCycleResetDate = new Date().toISOString();
    db.config.appConfig.lastBackupDate = new Date().toISOString();

    saveDatabaseToDisk({ type: 'reset-cycle', newCycleStartDate, senderId });
    res.json({ success: true, message: `Next 3-Month interval initialized from ${newCycleStartDate} to ${newCycleEndDate}.` });
  });

  // Export full database
  app.get('/api/db/export', (req, res) => {
    const db = loadDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=TFW_DB_Export_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(db, null, 2));
  });

  // Import / Restore full database
  app.post('/api/db/import', (req, res) => {
    const backup = req.body;
    if (!backup || (!backup.config && !backup.data)) {
      return res.status(400).json({ error: 'Invalid backup JSON format.' });
    }
    const initial = getInitialDatabase();
    memoryDb = {
      version: (memoryDb?.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
      config: backup.config || initial.config,
      data: backup.data || initial.data
    };
    saveDatabaseToDisk({ type: 'sync' });
    res.json({ success: true, message: 'Database imported successfully.' });
  });

  // Server-Sent Events (SSE) for Real-Time synchronization with Keepalive Heartbeat
  app.get('/api/db/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientId = ++clientCounter;
    const client = { id: clientId, res };
    sseClients.push(client);

    // Send immediate initial handshake
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      version: memoryDb?.version || 1,
      lastUpdated: memoryDb?.lastUpdated || '',
      activeDate: memoryDb?.config?.appConfig?.activeOperationalDate || '',
      activeView: memoryDb?.config?.appConfig?.activeView || '',
      maintenancePortal: memoryDb?.config?.appConfig?.activeMaintenancePortal || '',
      maintenanceStatusTab: memoryDb?.config?.appConfig?.activeMaintenanceStatusTab || '',
      maintenanceViewScope: memoryDb?.config?.appConfig?.activeMaintenanceViewScope || ''
    })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
  });

  // Periodic Keepalive ping every 8s to keep connections alive and ensure client versions match
  setInterval(() => {
    const pingPayload = JSON.stringify({
      type: 'ping',
      version: memoryDb?.version || 1,
      lastUpdated: memoryDb?.lastUpdated || '',
      activeDate: memoryDb?.config?.appConfig?.activeOperationalDate || '',
      time: Date.now()
    });
    sseClients = sseClients.filter(client => {
      try {
        if (client.res.writableEnded || client.res.destroyed) return false;
        client.res.write(`data: ${pingPayload}\n\n`);
        if (typeof (client.res as any).flush === 'function') {
          (client.res as any).flush();
        }
        return true;
      } catch (e) {
        return false;
      }
    });
  }, 8000);

  // Vite middleware for development vs static asset serving in production
  const isDev = process.env.NODE_ENV !== 'production' && !(typeof __filename !== 'undefined' && __filename.endsWith('.cjs'));
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.resolve(__dirname, '.');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TFW Database and Operations Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
