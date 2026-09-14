import * as XLSX from 'xlsx';
import { Ride, Counter, Operator, PackageItem } from '../types';

export type BulkEntityType = 'rides' | 'counters' | 'operators' | 'sales' | 'technicians' | 'cx' | 'all';

export interface ParsedBulkData {
  rides?: Ride[];
  counters?: Counter[];
  operators?: Operator[];
  salesPersonnel?: Operator[];
  maintenancePersonnel?: Operator[];
  cxPersonnel?: Operator[];
  newFloors?: string[];
  errors: string[];
  warnings: string[];
  summary: {
    ridesCount: number;
    countersCount: number;
    operatorsCount: number;
    salesCount: number;
    techsCount: number;
    cxCount: number;
  };
}

// Normalizes header keys (removes spaces, lowercases, underscores)
function normalizeKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function parseSpreadsheetData(
  workbook: XLSX.WorkBook,
  targetEntity: BulkEntityType = 'all',
  existingData?: {
    rides?: Ride[];
    counters?: Counter[];
    operators?: Operator[];
    salesPersonnel?: Operator[];
    maintenancePersonnel?: Operator[];
    cxPersonnel?: Operator[];
    floors?: string[];
  }
): ParsedBulkData {
  const result: ParsedBulkData = {
    rides: [],
    counters: [],
    operators: [],
    salesPersonnel: [],
    maintenancePersonnel: [],
    cxPersonnel: [],
    newFloors: [],
    errors: [],
    warnings: [],
    summary: {
      ridesCount: 0,
      countersCount: 0,
      operatorsCount: 0,
      salesCount: 0,
      techsCount: 0,
      cxCount: 0
    }
  };

  const safeRides = Array.isArray(existingData?.rides) ? existingData!.rides : [];
  const safeCounters = Array.isArray(existingData?.counters) ? existingData!.counters : [];
  const safeOps = Array.isArray(existingData?.operators) ? existingData!.operators : [];
  const safeSales = Array.isArray(existingData?.salesPersonnel) ? existingData!.salesPersonnel : [];
  const safeTechs = Array.isArray(existingData?.maintenancePersonnel) ? existingData!.maintenancePersonnel : [];
  const safeCx = Array.isArray(existingData?.cxPersonnel) ? existingData!.cxPersonnel : [];
  const safeFloors = Array.isArray(existingData?.floors) ? existingData!.floors : [];

  let highestRideId = safeRides.length > 0 ? Math.max(0, ...safeRides.map(r => Number(r?.id) || 0)) : 0;
  let highestCounterId = safeCounters.length > 0 ? Math.max(0, ...safeCounters.map(c => Number(c?.id) || 0)) : 0;
  let highestOpId = safeOps.length > 0 ? Math.max(0, ...safeOps.map(o => Number(o?.id) || 0)) : 0;
  let highestSalesId = safeSales.length > 0 ? Math.max(0, ...safeSales.map(s => Number(s?.id) || 0)) : 0;
  let highestTechId = safeTechs.length > 0 ? Math.max(0, ...safeTechs.map(m => Number(m?.id) || 0)) : 0;
  let highestCxId = safeCx.length > 0 ? Math.max(0, ...safeCx.map(c => Number(c?.id) || 0)) : 0;

  const knownFloors = new Set(safeFloors.map(f => String(f || '').trim().toLowerCase()));
  const newFloorsFound = new Set<string>();

  const processRowsForEntity = (rows: Record<string, any>[], entity: BulkEntityType) => {
    if (!rows || rows.length === 0) return;

    rows.forEach((rawRow, index) => {
      // Build normalized row dictionary
      const row: Record<string, any> = {};
      Object.keys(rawRow).forEach(key => {
        row[normalizeKey(key)] = rawRow[key];
      });

      // Extract common values
      const getName = () => row.name || row.ridename || row.attractionname || row.countername || row.staffname || row.operatorname || row.fullname || row.title;
      const getFloor = () => row.floor || row.floorlevel || row.level || row.zone || row.location || 'Level 1';
      const getPhone = () => String(row.phone || row.mobile || row.contact || row.phonenumber || '').trim();
      const getRole = () => String(row.role || row.designation || row.position || '').trim();
      const getNotes = () => String(row.notes || row.remarks || row.comment || row.description || '').trim();
      const getId = () => {
        const rawId = row.id || row.sl || row.code || row.no;
        const num = Number(rawId);
        return !isNaN(num) && num > 0 ? num : null;
      };

      const name = getName();
      if (!name || String(name).trim() === '') {
        // Skip empty row or note
        return;
      }
      const cleanName = String(name).trim();
      const rawFloor = getFloor() ? String(getFloor()).trim() : 'Level 1';

      if (rawFloor && !knownFloors.has(rawFloor.toLowerCase())) {
        newFloorsFound.add(rawFloor);
        knownFloors.add(rawFloor.toLowerCase());
      }

      if (entity === 'rides') {
        highestRideId += 1;
        const assignedId = getId() || highestRideId;
        const cap = Number(row.capacity || row.maxcapacity || row.seats);
        const statusVal = String(row.status || '').toLowerCase();
        let status: 'active' | 'maintenance' | 'closed' = 'active';
        if (statusVal.includes('maint') || statusVal.includes('repair')) status = 'maintenance';
        else if (statusVal.includes('close') || statusVal.includes('off') || statusVal.includes('inactive')) status = 'closed';

        result.rides!.push({
          id: assignedId,
          name: cleanName,
          floor: rawFloor,
          capacity: !isNaN(cap) && cap > 0 ? cap : undefined,
          status,
          minHeight: row.minheight || row.height || row.heightrequirement ? String(row.minheight || row.height || row.heightrequirement) : undefined,
          notes: getNotes() || undefined,
          imageUrl: row.image || row.imageurl || row.photo ? String(row.image || row.imageurl || row.photo) : undefined
        });
      } else if (entity === 'counters') {
        highestCounterId += 1;
        const assignedId = getId() || highestCounterId;
        const type = String(row.type || row.countertype || row.category || 'Standard Sales').trim();
        const active = row.active !== undefined ? String(row.active).toLowerCase() !== 'false' && String(row.active) !== '0' : true;

        result.counters!.push({
          id: assignedId,
          name: cleanName,
          type,
          location: rawFloor,
          active
        });
      } else if (entity === 'operators') {
        highestOpId += 1;
        const assignedId = getId() || highestOpId;
        const active = row.active !== undefined ? String(row.active).toLowerCase() !== 'false' && String(row.active) !== '0' : true;

        result.operators!.push({
          id: assignedId,
          name: cleanName,
          phone: getPhone() || undefined,
          role: getRole() || 'Games & Ride Associate',
          active,
          notes: getNotes() || undefined
        });
      } else if (entity === 'sales') {
        highestSalesId += 1;
        const assignedId = getId() || highestSalesId;
        const active = row.active !== undefined ? String(row.active).toLowerCase() !== 'false' && String(row.active) !== '0' : true;

        result.salesPersonnel!.push({
          id: assignedId,
          name: cleanName,
          phone: getPhone() || undefined,
          role: getRole() || 'Sales Officer',
          active,
          notes: getNotes() || undefined
        });
      } else if (entity === 'technicians') {
        highestTechId += 1;
        const assignedId = getId() || highestTechId;
        const active = row.active !== undefined ? String(row.active).toLowerCase() !== 'false' && String(row.active) !== '0' : true;

        result.maintenancePersonnel!.push({
          id: assignedId,
          name: cleanName,
          phone: getPhone() || undefined,
          role: getRole() || 'Maintenance Technician',
          active,
          notes: getNotes() || undefined
        });
      } else if (entity === 'cx') {
        highestCxId += 1;
        const assignedId = getId() || highestCxId;
        const active = row.active !== undefined ? String(row.active).toLowerCase() !== 'false' && String(row.active) !== '0' : true;

        result.cxPersonnel!.push({
          id: assignedId,
          name: cleanName,
          phone: getPhone() || undefined,
          role: getRole() || 'Customer Experience Specialist',
          active,
          notes: getNotes() || undefined
        });
      }
    });
  };

  // If specific target entity was requested
  if (targetEntity !== 'all') {
    // Process first sheet or matching sheet
    const firstSheetName = workbook.SheetNames[0];
    if (firstSheetName) {
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      processRowsForEntity(rows, targetEntity);
    }
  } else {
    // Multi-sheet auto detection
    workbook.SheetNames.forEach(sheetName => {
      const lower = sheetName.toLowerCase().replace(/[^a-z]/g, '');
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (lower.includes('ride') || lower.includes('attract')) {
        processRowsForEntity(rows, 'rides');
      } else if (lower.includes('count') || lower.includes('pos') || lower.includes('booth')) {
        processRowsForEntity(rows, 'counters');
      } else if (lower.includes('operat') || lower.includes('rideop')) {
        processRowsForEntity(rows, 'operators');
      } else if (lower.includes('sale') || lower.includes('cashier') || lower.includes('ticket')) {
        processRowsForEntity(rows, 'sales');
      } else if (lower.includes('tech') || lower.includes('maint') || lower.includes('engineer')) {
        processRowsForEntity(rows, 'technicians');
      } else if (lower.includes('cx') || lower.includes('customerexperience') || lower.includes('guestexperience') || lower.includes('feedback')) {
        processRowsForEntity(rows, 'cx');
      } else {
        // Fallback: examine header keys
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]).map(normalizeKey);
          if (keys.some(k => k.includes('ride') || k.includes('capacity') || k.includes('minheight'))) {
            processRowsForEntity(rows, 'rides');
          } else if (keys.some(k => k.includes('counter') || k.includes('countertype'))) {
            processRowsForEntity(rows, 'counters');
          } else if (keys.some(k => k.includes('tech') || k.includes('repair'))) {
            processRowsForEntity(rows, 'technicians');
          } else if (keys.some(k => k.includes('sales'))) {
            processRowsForEntity(rows, 'sales');
          } else if (keys.some(k => k.includes('cx') || k.includes('guest'))) {
            processRowsForEntity(rows, 'cx');
          } else {
            // Default to operators or rides
            processRowsForEntity(rows, 'operators');
          }
        }
      }
    });
  }

  result.newFloors = Array.from(newFloorsFound);
  result.summary = {
    ridesCount: result.rides?.length || 0,
    countersCount: result.counters?.length || 0,
    operatorsCount: result.operators?.length || 0,
    salesCount: result.salesPersonnel?.length || 0,
    techsCount: result.maintenancePersonnel?.length || 0,
    cxCount: result.cxPersonnel?.length || 0
  };

  return result;
}

export function parseRawTextTable(
  rawText: string,
  entity: BulkEntityType,
  existingData?: {
    rides?: Ride[];
    counters?: Counter[];
    operators?: Operator[];
    salesPersonnel?: Operator[];
    maintenancePersonnel?: Operator[];
    cxPersonnel?: Operator[];
    floors?: string[];
  }
): ParsedBulkData {
  if (!rawText || !rawText.trim()) {
    return {
      errors: ['No text entered'],
      warnings: [],
      summary: { ridesCount: 0, countersCount: 0, operatorsCount: 0, salesCount: 0, techsCount: 0, cxCount: 0 }
    };
  }

  // Parse TSV or CSV
  const workbook = XLSX.read(rawText, { type: 'string' });
  return parseSpreadsheetData(workbook, entity, existingData);
}

export async function parseUploadedFile(
  file: File,
  targetEntity: BulkEntityType,
  existingData?: {
    rides?: Ride[];
    counters?: Counter[];
    operators?: Operator[];
    salesPersonnel?: Operator[];
    maintenancePersonnel?: Operator[];
    cxPersonnel?: Operator[];
    floors?: string[];
  }
): Promise<ParsedBulkData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const parsed = parseSpreadsheetData(workbook, targetEntity, existingData);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Generates and triggers download of Excel template with sample records & guidance
export function downloadExcelTemplate(type: BulkEntityType = 'all') {
  const wb = XLSX.utils.book_new();

  if (type === 'all' || type === 'rides') {
    const ridesData = [
      { 'ID': 101, 'Ride Name': 'Roller Coaster X', 'Floor': 'Level 8', 'Capacity': 24, 'Status': 'active', 'Min Height': '120 cm', 'Notes': 'Primary flagship coaster' },
      { 'ID': 102, 'Ride Name': 'Bumper Cars Arena', 'Floor': 'Level 8', 'Capacity': 16, 'Status': 'active', 'Min Height': '100 cm', 'Notes': 'Double tokens required' },
      { 'ID': 103, 'Ride Name': 'VR Space Voyage', 'Floor': 'Level 9', 'Capacity': 8, 'Status': 'active', 'Min Height': '', 'Notes': 'Requires VR headset hygiene wipe' },
      { 'ID': 104, 'Ride Name': 'Haunted Castle Dark Ride', 'Floor': 'Level 10', 'Capacity': 12, 'Status': 'maintenance', 'Min Height': '110 cm', 'Notes': 'Sensor maintenance' }
    ];
    const wsRides = XLSX.utils.json_to_sheet(ridesData);
    wsRides['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, wsRides, 'Rides & Attractions');
  }

  if (type === 'all' || type === 'counters') {
    const countersData = [
      { 'ID': 201, 'Counter Name': 'Main Entry Counter 01', 'Location': 'Level 8', 'Type': 'Ticket Counter', 'Active': 'TRUE' },
      { 'ID': 202, 'Counter Name': 'VIP Express Counter 02', 'Location': 'Level 8', 'Type': 'VIP & Express', 'Active': 'TRUE' },
      { 'ID': 203, 'Counter Name': 'Arcade Card Top-up 03', 'Location': 'Level 9', 'Type': 'Card Recharge', 'Active': 'TRUE' },
      { 'ID': 204, 'Counter Name': 'Food & Merch POS 04', 'Location': 'Level 10', 'Type': 'Merchandise POS', 'Active': 'TRUE' }
    ];
    const wsCounters = XLSX.utils.json_to_sheet(countersData);
    wsCounters['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsCounters, 'Counters');
  }

  if (type === 'all' || type === 'operators') {
    const operatorsData = [
      { 'ID': 301, 'Staff Name': 'Rashid Al Mamun', 'Role': 'Senior Games & Ride Associate', 'Phone': '+880 1711-000001', 'Active': 'TRUE', 'Notes': 'Coaster safety certified' },
      { 'ID': 302, 'Staff Name': 'Tariqul Islam', 'Role': 'Games & Ride Associate', 'Phone': '+880 1812-000002', 'Active': 'TRUE', 'Notes': 'Bumper cars specialist' },
      { 'ID': 303, 'Staff Name': 'Nusrat Jahan', 'Role': 'Games & Ride Associate', 'Phone': '+880 1913-000003', 'Active': 'TRUE', 'Notes': 'VR attraction associate' }
    ];
    const wsOps = XLSX.utils.json_to_sheet(operatorsData);
    wsOps['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsOps, 'Games & Ride Associates');
  }

  if (type === 'all' || type === 'sales') {
    const salesData = [
      { 'ID': 401, 'Staff Name': 'Farhana Akter', 'Role': 'Senior Sales Officer', 'Phone': '+880 1722-000004', 'Active': 'TRUE', 'Notes': 'Corporate packages lead' },
      { 'ID': 402, 'Staff Name': 'Sabbir Ahmed', 'Role': 'Ticket Sales Staff', 'Phone': '+880 1823-000005', 'Active': 'TRUE', 'Notes': 'Counter POS certified' },
      { 'ID': 403, 'Staff Name': 'Sadia Rahman', 'Role': 'Cashier / Sales', 'Phone': '+880 1924-000006', 'Active': 'TRUE', 'Notes': 'Evening shift specialist' }
    ];
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    wsSales['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Staff');
  }

  if (type === 'all' || type === 'technicians') {
    const techsData = [
      { 'ID': 501, 'Staff Name': 'Engr. Mominul Haque', 'Role': 'Lead Electrical Engineer', 'Phone': '+880 1733-000007', 'Active': 'TRUE', 'Notes': 'Ride PLC & Motor certified' },
      { 'ID': 502, 'Staff Name': 'Kamrul Hassan', 'Role': 'Mechanical Technician', 'Phone': '+880 1834-000008', 'Active': 'TRUE', 'Notes': 'Hydraulic & pneumatic tech' },
      { 'ID': 503, 'Staff Name': 'Arifur Rahman', 'Role': 'Safety & Electronics Tech', 'Phone': '+880 1935-000009', 'Active': 'TRUE', 'Notes': 'Sensor and harnesses lead' }
    ];
    const wsTechs = XLSX.utils.json_to_sheet(techsData);
    wsTechs['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTechs, 'Technicians');
  }

  if (type === 'all' || type === 'cx') {
    const cxData = [
      { 'ID': 601, 'Staff Name': 'Sophia CX', 'Role': 'Customer Experience Specialist', 'Phone': '+880 1600-000001', 'Active': 'TRUE', 'Notes': 'Guest feedback & ride inspection' },
      { 'ID': 602, 'Staff Name': 'Rahim CX', 'Role': 'CX Guest Relations Lead', 'Phone': '+880 1600-000002', 'Active': 'TRUE', 'Notes': 'Floor surveys & comfort audits' },
      { 'ID': 603, 'Staff Name': 'Amina CX', 'Role': 'Customer Experience (CX)', 'Phone': '+880 1600-000003', 'Active': 'TRUE', 'Notes': 'Ride issue dispatching' }
    ];
    const wsCx = XLSX.utils.json_to_sheet(cxData);
    wsCx['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, wsCx, 'Customer Experience (CX)');
  }

  const filename = type === 'all' 
    ? 'TFW_Operations_Master_Import_Template.xlsx' 
    : type === 'cx'
    ? 'TFW_CX_Personnel_Import_Template.xlsx'
    : `TFW_${type.charAt(0).toUpperCase() + type.slice(1)}_Import_Template.xlsx`;

  XLSX.writeFile(wb, filename);
}
