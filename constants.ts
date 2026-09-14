import { Ride, Operator, Counter, PackageItem, StaffRoleDefinition, AppConfig } from './types';

// Default initial data for database initialization
export const RIDES_ARRAY: Ride[] = [
  { id: 1, name: "Sky Coaster", floor: "L1", capacity: 24, status: "active", minHeight: "120 cm" },
  { id: 2, name: "Carousel", floor: "L1", capacity: 36, status: "active", minHeight: "90 cm" },
  { id: 3, name: "Bumper Cars", floor: "L2", capacity: 16, status: "active", minHeight: "110 cm" },
  { id: 4, name: "Ghost House", floor: "L2", capacity: 20, status: "active", minHeight: "130 cm" },
  { id: 5, name: "Ferris Wheel", floor: "Outdoor", capacity: 48, status: "active", minHeight: "100 cm" },
  { id: 6, name: "Drop Tower", floor: "Outdoor", capacity: 12, status: "active", minHeight: "140 cm" },
  { id: 7, name: "VR Experience", floor: "L3", capacity: 10, status: "active", minHeight: "120 cm" },
  { id: 8, name: "Arcade Zone", floor: "L3", capacity: 50, status: "active", minHeight: "All Ages" }
];

export const RIDES: Record<number, Omit<Ride, 'id'>> = RIDES_ARRAY.reduce((acc, r) => ({ 
  ...acc, 
  [r.id]: { name: r.name, floor: r.floor, capacity: r.capacity, status: r.status, minHeight: r.minHeight } 
}), {});

export const FLOORS = ["L1", "L2", "L3", "Outdoor", "Ground Floor", "Zone A", "Zone B"];

export const OPERATORS_ARRAY: Operator[] = [];

export const OPERATORS: Record<number, Omit<Operator, 'id'>> = {};

export const TICKET_SALES_PERSONNEL_ARRAY: Operator[] = [
  { id: 201, name: "Alice Sales", phone: "01800000001", role: "Ticket Sales", active: true },
  { id: 202, name: "Bob Ticket", phone: "01800000002", role: "Sales Executive", active: true },
  { id: 203, name: "Carol Booth", phone: "01800000003", role: "Counter Attendant", active: true }
];

export const TICKET_SALES_PERSONNEL: Record<number, Omit<Operator, 'id'>> = TICKET_SALES_PERSONNEL_ARRAY.reduce((acc, o) => ({ 
  ...acc, 
  [o.id]: { name: o.name, phone: o.phone, role: o.role, active: o.active } 
}), {});

export const COUNTERS_ARRAY: Counter[] = [
  { id: 1, name: "Main Entrance Counter", type: "General", location: "L1 Lobby", active: true },
  { id: 2, name: "VIP Kiosk Counter", type: "VIP", location: "L2 VIP Lounge", active: true },
  { id: 3, name: "Online Ticket Pickup", type: "Online", location: "L1 Entrance", active: true },
  { id: 4, name: "Express Pass Counter", type: "Express", location: "Outdoor Gate", active: true }
];

export const DEFAULT_TBG_LOGO = '/tbg-logo.svg';
export const DEFAULT_BCDL_LOGO = '/bcdl-logo.svg';

export const COUNTERS: Record<number, Omit<Counter, 'id'>> = COUNTERS_ARRAY.reduce((acc, c) => ({ 
  ...acc, 
  [c.id]: { name: c.name, type: c.type, location: c.location, active: c.active } 
}), {});

export const MAINTENANCE_PERSONNEL_ARRAY: Operator[] = [
  { id: 301, name: "Tech Tom", phone: "01900000001", role: "Maintenance", active: true },
  { id: 302, name: "Fixit Felix", phone: "01900000002", role: "Mechanical Lead", active: true },
  { id: 303, name: "Dave Hydraulics", phone: "01900000003", role: "Hydraulics Tech", active: true }
];

export const MAINTENANCE_PERSONNEL: Record<number, Omit<Operator, 'id'>> = MAINTENANCE_PERSONNEL_ARRAY.reduce((acc, o) => ({ 
  ...acc, 
  [o.id]: { name: o.name, phone: o.phone, role: o.role, active: o.active } 
}), {});

export const CX_PERSONNEL_ARRAY: Operator[] = [
  { id: 401, name: "Sophia CX", phone: "01600000001", role: "Customer Experience Specialist", active: true },
  { id: 402, name: "Rahim CX", phone: "01600000002", role: "CX Guest Relations Lead", active: true },
  { id: 403, name: "Amina CX", phone: "01600000003", role: "Customer Experience (CX)", active: true }
];

export const CX_PERSONNEL: Record<number, Omit<Operator, 'id'>> = CX_PERSONNEL_ARRAY.reduce((acc, o) => ({ 
  ...acc, 
  [o.id]: { name: o.name, phone: o.phone, role: o.role, active: o.active } 
}), {});

export const DEFAULT_PACKAGES: PackageItem[] = [
  { 
    id: 'pkg-1788672248340', 
    name: 'Toggi Kiddo', 
    price: 1100, 
    category: 'Kids', 
    description: 'Package includes ENTRY + All Rides & Games of Level 9 to 11 (Except: Jumping House & Cosmos Bowling).', 
    active: true 
  },
  { 
    id: 'pkg-1788672381705', 
    name: 'Toggi Xtreme', 
    price: 3500, 
    category: 'All Games', 
    description: 'Package includes ENTRY + All Rides & Games of Level 9 to 17.', 
    active: true 
  },
  { 
    id: 'pkg-1788672459006', 
    name: 'Toggi VIP Concierge', 
    price: 10000, 
    category: 'All Games & Rides', 
    description: 'Package includes ENTRY + All Rides & Games of Level 9 to 17.3 hours of dedicated concierge service.', 
    active: true 
  },
  { 
    id: 'pkg-1788672560838', 
    name: 'Entry Ticket', 
    price: 150, 
    category: 'Per Person', 
    description: '', 
    active: true 
  }
];

export const DEFAULT_STAFF_ROLES: StaffRoleDefinition[] = [
  { id: 'role-1', name: 'Games & Ride Associate', department: 'operations', description: 'Primary associate for amusement games, rides & guest safety protocols', isSystem: true, loginRole: 'operator', enabledForLogin: true },
  { id: 'role-2', name: 'Senior Games & Ride Associate', department: 'operations', description: 'Senior associate handling high-capacity and complex rides', isSystem: true, loginRole: 'operator', enabledForLogin: true },
  { id: 'role-3', name: 'Junior Associate', department: 'operations', description: 'Assistant games & ride associate under supervision', isSystem: true, loginRole: 'operator', enabledForLogin: true },
  { id: 'role-4', name: 'Floor Supervisor', department: 'operations', description: 'Oversees ride floor operations, queues, and associate safety', isSystem: false, loginRole: 'operation-officer', enabledForLogin: true },
  { id: 'role-5', name: 'Operation Officer', department: 'management', description: 'Duty officer managing rosters, daily attendance, and park counts', isSystem: true, loginRole: 'operation-officer', enabledForLogin: true },
  { id: 'role-6', name: 'Ticket Sales', department: 'sales', description: 'Ticket sales associate supervising counters, ticket issuance and shift cash balance', isSystem: true, loginRole: 'ticket-sales', enabledForLogin: true },
  { id: 'role-7', name: 'Sales Executive', department: 'sales', description: 'Sales officer handling corporate, group, and ticket package deals', isSystem: true, loginRole: 'sales-officer', enabledForLogin: true },
  { id: 'role-8', name: 'Counter Attendant', department: 'sales', description: 'Counter staff issuing single entry tickets and wristbands', isSystem: true, loginRole: 'ticket-sales', enabledForLogin: true },
  { id: 'role-9', name: 'Sales Officer', department: 'management', description: 'Shift sales officer reviewing daily collection and packages', isSystem: true, loginRole: 'sales-officer', enabledForLogin: true },
  { id: 'role-10', name: 'Maintenance', department: 'maintenance', description: 'Maintenance technician for ride motors, sensors, and power systems', isSystem: true, loginRole: 'maintenance', enabledForLogin: true },
  { id: 'role-11', name: 'Mechanical Lead', department: 'maintenance', description: 'Lead mechanical engineer for mechanical parts, tracks, and hydraulics', isSystem: true, loginRole: 'maintenance', enabledForLogin: true },
  { id: 'role-12', name: 'Hydraulics Tech', department: 'maintenance', description: 'Hydraulic and pneumatic systems technician', isSystem: true, loginRole: 'maintenance', enabledForLogin: true },
  { id: 'role-13', name: 'Maintenance Engineer', department: 'management', description: 'Duty maintenance engineer dispatching technicians and solving tickets', isSystem: true, loginRole: 'maintenance', enabledForLogin: true },
  { id: 'role-14', name: 'Customer Experience Specialist', department: 'general', description: 'Gathers guest feedback across all rides and logs maintenance issues', isSystem: true, loginRole: 'cx', enabledForLogin: true },
  { id: 'role-15', name: 'Customer Experience (CX)', department: 'general', description: 'Customer Experience team monitoring guest sentiment and ride maintenance feedback', isSystem: true, loginRole: 'cx', enabledForLogin: true },
  { id: 'role-16', name: 'Safety Officer', department: 'management', description: 'Safety inspection, guest safety compliance, and emergency protocols', isSystem: false, loginRole: 'operation-officer', enabledForLogin: false },
  { id: 'role-17', name: 'System Administrator', department: 'management', description: 'Full system administration, entity configurations, and data management', isSystem: true, loginRole: 'admin', enabledForLogin: true }
];

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: 'Tanvir Bashundhara Group',
  appSubtitle: 'Shift Operations & Ticketing Management',
  appLogo: '',
  loginLeftLogo: '/tbg-logo.svg',
  loginLeftTitle: 'Tanvir Bashundhara Group',
  loginLeftSubtitle: 'Operations & Management Portal',
  loginRightLogo: '/bcdl-logo.svg',
  loginRightTitle: 'Bashundhara City Development Ltd',
  loginRightSubtitle: 'Bashundhara Group',
  orgName: 'Toggi Fun World',
  devByLabel: 'Developed By',
  devByName: 'Mufti Mahmud Mollah',
  devByTitle: 'AGM (Maintenance & SCD, FP, TFW)',
  currency: 'BDT',
  totalGuestsLabel: 'Total Guests Today',
  totalTicketSalesLabel: 'Total Sales Amount',
  loginHeading: 'Sign In',
  loginSubheading: 'Select your role and identity to begin shift operations',
  announcementText: '',
  adminPassword: 'admin79',
  operationOfficerPassword: 'ops79',
  salesOfficerPassword: 'sales79',
  maintenancePassword: 'maint',
  cxPassword: 'cx79',
  cutoffHour: 22,
  roles: DEFAULT_STAFF_ROLES
};

/**
 * Returns YYYY-MM-DD in Bangladesh Standard Time (Asia/Dhaka, UTC+6).
 * This guarantees consistent calendar dates across server, cloud container, and client devices.
 */
export const getDhakaDateString = (d: Date | string | number = new Date()): string => {
  const dateObj = d instanceof Date ? d : new Date(d);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
  } catch {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Returns YYYY-MM-DD in the operational timezone (Dhaka, UTC+6).
 */
export const getLocalDateString = (d: Date | string | number = new Date()): string => {
  return getDhakaDateString(d);
};

/**
 * Formats a timestamp into 12-hour time in Bangladesh Standard Time (e.g. "02:37 PM").
 */
export const formatDhakaTime = (d: Date | string | number = new Date()): string => {
  try {
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

/**
 * Formats a timestamp into full date and 12-hour time in Bangladesh Standard Time (e.g. "07 Sep 2026, 02:37 PM").
 */
export const formatDhakaDateTime = (d: Date | string | number = new Date()): string => {
  try {
    const dateObj = d instanceof Date ? d : new Date(d);
    const datePart = dateObj.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timePart = dateObj.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return new Date(d).toLocaleString();
  }
};

/**
 * Searches across collections to find the most recent operational date with entered records.
 */
export const findLatestRecordedDate = (
  dailyCounts?: Record<string, Record<string, number>>,
  ticketSalesData?: Record<string, Record<string, number>>,
  operatorAssignments?: Record<string, any>,
  packageSales?: Record<string, any>,
  attendance?: Record<string, any>,
  maintenanceTickets?: Record<string, any>
): string | null => {
  const dates = new Set<string>();
  
  if (dailyCounts && typeof dailyCounts === 'object') {
    Object.entries(dailyCounts).forEach(([d, counts]) => {
      if (counts && typeof counts === 'object' && Object.values(counts).some(v => Number(v) > 0)) {
        dates.add(d);
      }
    });
  }
  if (ticketSalesData && typeof ticketSalesData === 'object') {
    Object.entries(ticketSalesData).forEach(([d, counts]) => {
      if (counts && typeof counts === 'object' && Object.values(counts).some(v => Number(v) > 0)) {
        dates.add(d);
      }
    });
  }
  if (operatorAssignments && typeof operatorAssignments === 'object') {
    Object.entries(operatorAssignments).forEach(([d, assigns]) => {
      if (assigns && typeof assigns === 'object' && Object.keys(assigns).length > 0) {
        dates.add(d);
      }
    });
  }
  if (packageSales && typeof packageSales === 'object') {
    Object.entries(packageSales).forEach(([d, sales]) => {
      if (sales && typeof sales === 'object' && Object.keys(sales).length > 0) {
        dates.add(d);
      }
    });
  }
  if (attendance && typeof attendance === 'object') {
    Object.entries(attendance).forEach(([d, att]) => {
      if (att && typeof att === 'object' && Object.keys(att).length > 0) {
        dates.add(d);
      }
    });
  }
  if (maintenanceTickets && typeof maintenanceTickets === 'object') {
    Object.entries(maintenanceTickets).forEach(([d, tickets]) => {
      if (tickets && typeof tickets === 'object' && Object.keys(tickets).length > 0) {
        dates.add(d);
      }
    });
  }

  if (dates.size === 0) return null;
  return Array.from(dates).sort().reverse()[0];
};

/**
 * Finds the most recent date with operator assignments strictly before currentDate.
 * If none exists before currentDate, falls back to any previous date with assignments.
 */
export const findPreviousAssignmentsDate = (
  operatorAssignments?: Record<string, any>,
  currentDate?: string
): string | null => {
  if (!operatorAssignments || typeof operatorAssignments !== 'object') return null;

  const validDates = Object.entries(operatorAssignments)
    .filter(([d, assigns]) => {
      if (!assigns || typeof assigns !== 'object') return false;
      return Object.values(assigns).some((arr: any) => {
        if (Array.isArray(arr)) return arr.length > 0;
        return Boolean(arr);
      });
    })
    .map(([d]) => d)
    .sort(); // ascending

  if (validDates.length === 0) return null;

  if (currentDate) {
    const priorDates = validDates.filter(d => d < currentDate);
    if (priorDates.length > 0) {
      return priorDates[priorDates.length - 1]; // closest date strictly before currentDate
    }
    const otherDates = validDates.filter(d => d !== currentDate);
    if (otherDates.length > 0) {
      return otherDates[otherDates.length - 1];
    }
  }

  return validDates[validDates.length - 1];
};

/**
 * Finds the most recent date with ticket sales assignments strictly before currentDate.
 */
export const findPreviousTicketSalesAssignmentsDate = (
  ticketSalesAssignments?: Record<string, any>,
  currentDate?: string
): string | null => {
  if (!ticketSalesAssignments || typeof ticketSalesAssignments !== 'object') return null;

  const validDates = Object.entries(ticketSalesAssignments)
    .filter(([d, assigns]) => {
      if (!assigns || typeof assigns !== 'object') return false;
      return Object.values(assigns).some((arr: any) => {
        if (Array.isArray(arr)) return arr.length > 0;
        return Boolean(arr);
      });
    })
    .map(([d]) => d)
    .sort();

  if (validDates.length === 0) return null;

  if (currentDate) {
    const priorDates = validDates.filter(d => d < currentDate);
    if (priorDates.length > 0) {
      return priorDates[priorDates.length - 1];
    }
    const otherDates = validDates.filter(d => d !== currentDate);
    if (otherDates.length > 0) {
      return otherDates[otherDates.length - 1];
    }
  }

  return validDates[validDates.length - 1];
};



