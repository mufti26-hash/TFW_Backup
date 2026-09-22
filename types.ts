export interface Ride {
  id: number;
  name: string;
  floor: string;
  imageUrl?: string;
  capacity?: number;
  status?: 'active' | 'maintenance' | 'closed';
  minHeight?: string;
  notes?: string;
}

export interface RideWithCount extends Ride {
  count: number;
  packageCount?: number;
  ticketCount?: number;
}

export interface Operator {
  id: number;
  name: string;
  phone?: string;
  role?: string;
  active?: boolean;
  notes?: string;
}

export interface Counter {
  id: number;
  name: string;
  type?: string;
  location?: string;
  active?: boolean;
  price?: number;
  ticketPrice?: number;
  counterNumber?: string | number;
}

export interface CounterWithSales extends Counter {
  sales: number;
}

export interface PackageItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  active?: boolean;
}

export interface StaffRoleDefinition {
  id: string;
  name: string;
  department: 'operations' | 'sales' | 'maintenance' | 'management' | 'general';
  description?: string;
  isSystem?: boolean;
  loginRole?: string;
  enabledForLogin?: boolean;
  badge?: string;
  color?: string;
}

export interface AppConfig {
  appName: string;
  appSubtitle?: string;
  appLogo: string | null;
  loginLeftLogo?: string | null;
  loginLeftTitle?: string;
  loginLeftSubtitle?: string;
  loginRightLogo?: string | null;
  loginRightTitle?: string;
  loginRightSubtitle?: string;
  orgName?: string;
  devByLabel?: string;
  devByName?: string;
  devByTitle?: string;
  currency?: string;
  totalGuestsLabel?: string;
  totalTicketSalesLabel?: string;
  loginHeading?: string;
  loginSubheading?: string;
  announcementText?: string;
  managementPassword?: string;
  adminPassword?: string;
  operationOfficerPassword?: string;
  salesOfficerPassword?: string;
  maintenancePassword?: string;
  cxPassword?: string;
  cutoffHour?: number;
  themeColor?: string;
  activeOperationalDate?: string;
  activeView?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
  cycleIntervalMonths?: number;
  lastBackupDate?: string;
  lastCycleResetDate?: string;
  roles?: StaffRoleDefinition[];
  hiddenLoginRoles?: string[];
  leadershipProfiles?: Array<{
    id: string;
    name: string;
    designation: string;
    organization: string;
    avatarUrl: string;
    roleBadge?: string;
  }>;
  managementNotes?: Record<string, ManagementSummaryNotes>;
}

export interface AttendanceRecord {
  date: string;
  operatorId: number;
  attendedBriefing: boolean;
  briefingTime: string | null;
}

export interface ManagementNoteItem {
  id: string;
  text: string;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  addedAt?: string;
  addedBy?: string;
}

export interface ManagementSummaryNotes {
  sprRequired?: string;
  noteApproval?: string;
  others?: string;
  sprList?: (string | ManagementNoteItem)[];
  noteApprovalList?: (string | ManagementNoteItem)[];
  othersList?: (string | ManagementNoteItem)[];
  operationsNotes?: string;
  operationsNotesList?: (string | ManagementNoteItem)[];
  salesNotes?: string;
  salesNotesList?: (string | ManagementNoteItem)[];
  operationalSummary?: {
    startDate?: string;
    endDate?: string;
    totalGuestsInRange?: number;
    packageEntriesInRange?: number;
    ticketEntriesInRange?: number;
    selectedGameId?: string;
    savedAt?: string;
    savedBy?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface AttendanceData {
  [date: string]: {
    [operatorId: number]: Omit<AttendanceRecord, 'date' | 'operatorId'>;
  };
}

export interface HistoryRecord {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface PackageSalesRecord {
  date: string;
  personnelId: number;
  total?: number;
  otherSales?: Array<{ 
    category: string; 
    amount: number; 
    baseAmount?: number;
    discount?: string;
    description?: string; 
    customName?: string;
    count?: number;
    unitPrice?: number;
  }>;
  packages?: Record<string, number>;
}

export interface PackageSalesData {
  [date: string]: {
    [personnelId: number]: Omit<PackageSalesRecord, 'date' | 'personnelId'>;
  };
}

export interface MaintenanceTicket {
  id: string;
  date: string;
  rideId: number;
  rideName: string;
  problem: string;
  status: 'reported' | 'in-progress' | 'solved';
  reportedById: number;
  reportedByName: string;
  reportedByRole?: string;
  source?: 'operator' | 'cx' | 'counter' | string;
  feedbackCategory?: string;
  priority?: 'normal' | 'high' | 'urgent';
  guestDetails?: string;
  reportedAt: string;
  targetDepartment?: 'both' | 'operation-officer' | 'sales-officer' | 'all' | string;
  solvedByRole?: string;
  assignedToId?: number;
  assignedToName?: string;
  assignedToPhone?: string;
  helperIds?: number[];
  helperNames?: string[];
  inProgressAt?: string;
  solvedAt?: string;
  resolutionNotes?: string;
  solutionImageUrl?: string;
  photoUrl?: string;
  whatsappGroup?: string;
  whatsappChatId?: string;
  whatsappMessageId?: string;
  updatedAt?: string;
  isExplicitReopen?: boolean;
}
