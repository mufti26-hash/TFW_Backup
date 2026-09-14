import React, { useState, useRef, useEffect } from 'react';
import { 
  Ride, 
  Operator, 
  Counter, 
  PackageItem, 
  AppConfig,
  StaffRoleDefinition 
} from '../types';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Users, 
  Ticket, 
  Wrench, 
  Layers, 
  Shield, 
  Sparkles, 
  MapPin,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Code,
  Activity,
  Clock,
  Database,
  UserCheck,
  Share2,
  HeartHandshake,
  Search,
  Calendar,
  CalendarDays,
  Archive,
  AlertTriangle,
  RotateCcw,
  History,
  HardDrive
} from 'lucide-react';
import { BulkImportModal } from './BulkImportModal';
import { BulkEntityType, downloadExcelTemplate } from '../utils/excelImport';
import { ConfirmModal } from './ConfirmModal';
import { database } from '../firebaseConfig';

interface Props {
  onClose: () => void;
  // Rides
  rides: Ride[];
  onSaveRide: (ride: Ride) => void;
  onDeleteRide: (id: number) => void;
  // Counters
  counters: Counter[];
  onSaveCounter: (counter: Counter) => void;
  onDeleteCounter: (id: number) => void;
  // Operators
  operators: Operator[];
  onSaveOperator: (op: Operator) => void;
  onDeleteOperator: (id: number) => void;
  onClearAllOperators?: () => void;
  // Ticket Sales Personnel
  ticketSalesPersonnel: Operator[];
  onSaveTicketSalesPersonnel: (p: Operator) => void;
  onDeleteTicketSalesPersonnel: (id: number) => void;
  // Maintenance Personnel
  maintenancePersonnel: Operator[];
  onSaveMaintenancePersonnel: (p: Operator) => void;
  onDeleteMaintenancePersonnel: (id: number) => void;
  // Customer Experience (CX) Personnel
  cxPersonnel: Operator[];
  onSaveCxPersonnel: (p: Operator) => void;
  onDeleteCxPersonnel: (id: number) => void;
  // Packages
  packages: PackageItem[];
  onSavePackage: (pkg: PackageItem) => void;
  onDeletePackage: (id: string) => void;
  // Floors
  floors: string[];
  onSaveFloors: (floors: string[]) => void;
  // App Config
  appConfig: AppConfig;
  onSaveAppConfig: (cfg: Partial<AppConfig>) => void;
  // Bulk Import
  onBulkImport?: (data: {
    rides?: Ride[];
    counters?: Counter[];
    operators?: Operator[];
    salesPersonnel?: Operator[];
    maintenancePersonnel?: Operator[];
    cxPersonnel?: Operator[];
    newFloors?: string[];
    importMode: 'merge' | 'replace' | 'append';
  }) => void;
}

type TabType = 'rides' | 'counters' | 'operators' | 'sales-staff' | 'maintenance' | 'cx-staff' | 'packages' | 'floors' | 'logo' | 'system' | 'developer-roles' | 'database';

export const AdminManager: React.FC<Props> = ({
  onClose,
  rides,
  onSaveRide,
  onDeleteRide,
  counters,
  onSaveCounter,
  onDeleteCounter,
  operators,
  onSaveOperator,
  onDeleteOperator,
  onClearAllOperators,
  ticketSalesPersonnel,
  onSaveTicketSalesPersonnel,
  onDeleteTicketSalesPersonnel,
  maintenancePersonnel,
  onSaveMaintenancePersonnel,
  onDeleteMaintenancePersonnel,
  cxPersonnel,
  onSaveCxPersonnel,
  onDeleteCxPersonnel,
  packages,
  onSavePackage,
  onDeletePackage,
  floors,
  onSaveFloors,
  appConfig,
  onSaveAppConfig,
  onBulkImport
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('rides');
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportEntity, setBulkImportEntity] = useState<BulkEntityType>('all');

  // Modal Editing States
  const [editingRide, setEditingRide] = useState<Partial<Ride> | null>(null);
  const [editingCounter, setEditingCounter] = useState<Partial<Counter> | null>(null);
  const [editingOperator, setEditingOperator] = useState<Partial<Operator> | null>(null);
  const [editingSalesStaff, setEditingSalesStaff] = useState<Partial<Operator> | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<Partial<Operator> | null>(null);
  const [editingCxStaff, setEditingCxStaff] = useState<Partial<Operator> | null>(null);
  const [cxSearchTerm, setCxSearchTerm] = useState('');
  const [editingPackage, setEditingPackage] = useState<Partial<PackageItem> | null>(null);
  const [newFloorInput, setNewFloorInput] = useState('');

  // Developer & Roles local state
  const [editingRole, setEditingRole] = useState<StaffRoleDefinition | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDept, setRoleDept] = useState<'operations' | 'sales' | 'maintenance' | 'management' | 'general'>('operations');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // System & Text Fields local state
  const [appName, setAppName] = useState(appConfig.appName === 'TFW Operations Manager' ? 'Tanvir Bashundhara Group' : (appConfig.appName || 'Tanvir Bashundhara Group'));
  const [appSubtitle, setAppSubtitle] = useState(appConfig.appSubtitle || 'Shift Operations & Ticketing Management');
  const [orgName, setOrgName] = useState(appConfig.orgName || 'Toggi Fun World');
  const [appLogo, setAppLogo] = useState(appConfig.appLogo || '');
  const [loginLeftLogo, setLoginLeftLogo] = useState(appConfig.loginLeftLogo || '/tbg-logo.svg');
  const [loginLeftTitle, setLoginLeftTitle] = useState((!appConfig.loginLeftTitle || appConfig.loginLeftTitle === 'TOGGI FUN WORLD') ? 'Tanvir Bashundhara Group' : appConfig.loginLeftTitle);
  const [loginLeftSubtitle, setLoginLeftSubtitle] = useState(appConfig.loginLeftSubtitle || 'Operations & Management Portal');
  const [loginRightLogo, setLoginRightLogo] = useState(appConfig.loginRightLogo || '/bcdl-logo.svg');
  const [loginRightTitle, setLoginRightTitle] = useState((!appConfig.loginRightTitle || appConfig.loginRightTitle === 'BASHUNDHARA GROUP') ? 'Bashundhara City Development Ltd' : appConfig.loginRightTitle);
  const [loginRightSubtitle, setLoginRightSubtitle] = useState(appConfig.loginRightSubtitle || 'Bashundhara Group');
  const [loginHeading, setLoginHeading] = useState(appConfig.loginHeading || 'Sign In');
  const [loginSubheading, setLoginSubheading] = useState(appConfig.loginSubheading || 'Select your profile to begin your shift');
  const [devByLabel, setDevByLabel] = useState(appConfig.devByLabel || 'Developed By');
  const [devByName, setDevByName] = useState(appConfig.devByName || 'Mufti Mahmud Mollah');
  const [devByTitle, setDevByTitle] = useState(appConfig.devByTitle || 'AGM (Maintenance & SCD, FP, TFW)');
  const [totalGuestsLabel, setTotalGuestsLabel] = useState(appConfig.totalGuestsLabel || 'Total Guests Today');
  const [totalTicketSalesLabel, setTotalTicketSalesLabel] = useState(appConfig.totalTicketSalesLabel || 'Total Ticket Sales Today');
  const [announcementText, setAnnouncementText] = useState(appConfig.announcementText || '');
  const [adminPassword, setAdminPassword] = useState(appConfig.adminPassword || 'admin79');
  const [operationOfficerPassword, setOperationOfficerPassword] = useState(appConfig.operationOfficerPassword || 'ops79');
  const [salesOfficerPassword, setSalesOfficerPassword] = useState(appConfig.salesOfficerPassword || 'sales79');
  const [maintenancePassword, setMaintenancePassword] = useState(appConfig.maintenancePassword || 'maint');
  const [cxPassword, setCxPassword] = useState(appConfig.cxPassword || 'cx79');
  const [cutoffHour, setCutoffHour] = useState(appConfig.cutoffHour !== undefined ? appConfig.cutoffHour : 22);
  const [currency, setCurrency] = useState(appConfig.currency || 'BDT');
  const [showPassword, setShowPassword] = useState(false);
  const [logoSavedFeedback, setLogoSavedFeedback] = useState(false);
  const [systemSavedFeedback, setSystemSavedFeedback] = useState(false);
  const [rideImageMode, setRideImageMode] = useState<'upload' | 'url'>('upload');
  const [rideImageProcessing, setRideImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const leftLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const rightLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const rideFileInputRef = useRef<HTMLInputElement | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize local form fields when incoming appConfig loads from cloud
  useEffect(() => {
    if (appConfig) {
      if (appConfig.appName !== undefined) setAppName(appConfig.appName);
      if (appConfig.appSubtitle !== undefined) setAppSubtitle(appConfig.appSubtitle);
      if (appConfig.orgName !== undefined) setOrgName(appConfig.orgName);
      if (appConfig.appLogo !== undefined) setAppLogo(appConfig.appLogo || '');
      if (appConfig.loginLeftLogo !== undefined) setLoginLeftLogo(appConfig.loginLeftLogo || '/tbg-logo.svg');
      if (appConfig.loginLeftTitle !== undefined) setLoginLeftTitle(appConfig.loginLeftTitle || 'Tanvir Bashundhara Group');
      if (appConfig.loginLeftSubtitle !== undefined) setLoginLeftSubtitle(appConfig.loginLeftSubtitle || 'Operations & Management Portal');
      if (appConfig.loginRightLogo !== undefined) setLoginRightLogo(appConfig.loginRightLogo || '/bcdl-logo.svg');
      if (appConfig.loginRightTitle !== undefined) setLoginRightTitle(appConfig.loginRightTitle || 'Bashundhara City Development Ltd');
      if (appConfig.loginRightSubtitle !== undefined) setLoginRightSubtitle(appConfig.loginRightSubtitle || 'Bashundhara Group');
      if (appConfig.loginHeading !== undefined) setLoginHeading(appConfig.loginHeading);
      if (appConfig.loginSubheading !== undefined) setLoginSubheading(appConfig.loginSubheading);
      if (appConfig.devByLabel !== undefined) setDevByLabel(appConfig.devByLabel);
      if (appConfig.devByName !== undefined) setDevByName(appConfig.devByName);
      if (appConfig.devByTitle !== undefined) setDevByTitle(appConfig.devByTitle);
      if (appConfig.totalGuestsLabel !== undefined) setTotalGuestsLabel(appConfig.totalGuestsLabel);
      if (appConfig.totalTicketSalesLabel !== undefined) setTotalTicketSalesLabel(appConfig.totalTicketSalesLabel);
      if (appConfig.announcementText !== undefined) setAnnouncementText(appConfig.announcementText || '');
      if (appConfig.adminPassword !== undefined) setAdminPassword(appConfig.adminPassword);
      if (appConfig.operationOfficerPassword !== undefined) setOperationOfficerPassword(appConfig.operationOfficerPassword);
      if (appConfig.salesOfficerPassword !== undefined) setSalesOfficerPassword(appConfig.salesOfficerPassword);
      if (appConfig.maintenancePassword !== undefined) setMaintenancePassword(appConfig.maintenancePassword);
      if (appConfig.cxPassword !== undefined) setCxPassword(appConfig.cxPassword);
      if (appConfig.cutoffHour !== undefined) setCutoffHour(appConfig.cutoffHour);
      if (appConfig.currency !== undefined) setCurrency(appConfig.currency);
    }
  }, [appConfig]);

  // Cloud & Database Management state
  const [cloudSyncLoading, setCloudSyncLoading] = useState(false);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [resetDayInput, setResetDayInput] = useState(new Date().toISOString().split('T')[0]);
  const [resetDayLoading, setResetDayLoading] = useState(false);
  const [resetDayFeedback, setResetDayFeedback] = useState<string | null>(null);

  // 3-Month Interval Cycle & Retention state
  const [cycleStats, setCycleStats] = useState(() => database.getCycleStats(appConfig.cycleStartDate, appConfig.cycleIntervalMonths || 3));
  const [quarterlyResetLoading, setQuarterlyResetLoading] = useState(false);
  const [quarterlyResetFeedback, setQuarterlyResetFeedback] = useState<string | null>(null);
  const [nextCycleStartDate, setNextCycleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [olderThanCutoff, setOlderThanCutoff] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [olderThanLoading, setOlderThanLoading] = useState(false);
  const [olderThanFeedback, setOlderThanFeedback] = useState<string | null>(null);
  const [customCycleStart, setCustomCycleStart] = useState(appConfig.cycleStartDate || '');

  // Refresh stats helper
  const refreshCycleStats = () => {
    setCycleStats(database.getCycleStats(appConfig.cycleStartDate, appConfig.cycleIntervalMonths || 3));
  };

  useEffect(() => {
    refreshCycleStats();
  }, [appConfig.cycleStartDate, appConfig.cycleIntervalMonths, appConfig.lastBackupDate, appConfig.lastCycleResetDate]);

  // Master sync & publish to all connected devices anywhere
  const handleMasterPublish = async () => {
    setCloudSyncLoading(true);
    setCloudSyncFeedback(null);
    try {
      // 1. Commit any current system & branding fields
      onSaveAppConfig({
        appName: appName.trim() || 'Tanvir Bashundhara Group',
        appSubtitle: appSubtitle.trim() || '',
        orgName: orgName.trim() || '',
        appLogo: appLogo.trim() || null,
        loginLeftLogo: loginLeftLogo.trim() || '/tbg-logo.svg',
        loginLeftTitle: loginLeftTitle.trim() || 'Tanvir Bashundhara Group',
        loginLeftSubtitle: loginLeftSubtitle.trim() || 'Operations & Management Portal',
        loginRightLogo: loginRightLogo.trim() || '/bcdl-logo.svg',
        loginRightTitle: loginRightTitle.trim() || 'Bashundhara City Development Ltd',
        loginRightSubtitle: loginRightSubtitle.trim() || 'Bashundhara Group',
        loginHeading: loginHeading.trim() || 'Sign In',
        loginSubheading: loginSubheading.trim() || '',
        devByLabel: devByLabel.trim() || 'Developed By',
        devByName: devByName.trim() || '',
        devByTitle: devByTitle.trim() || '',
        totalGuestsLabel: totalGuestsLabel.trim() || 'Total Guests Today',
        totalTicketSalesLabel: totalTicketSalesLabel.trim() || 'Total Ticket Sales Today',
        announcementText: announcementText.trim() || '',
        adminPassword,
        operationOfficerPassword,
        salesOfficerPassword,
        maintenancePassword,
        cxPassword,
        cutoffHour: Number(cutoffHour),
        currency: currency.trim() || 'BDT',
        cycleStartDate: appConfig.cycleStartDate,
        cycleEndDate: appConfig.cycleEndDate,
        cycleIntervalMonths: appConfig.cycleIntervalMonths || 3,
        lastBackupDate: appConfig.lastBackupDate,
        lastCycleResetDate: appConfig.lastCycleResetDate
      });

      // 2. Direct cloud broadcast across all devices
      const res = await database.forceCloudSync();
      setCloudSyncFeedback(res.message || 'All changes published & synced to all devices everywhere!');
    } catch (e) {
      setCloudSyncFeedback('Local changes saved & queued for cloud sync.');
    } finally {
      setCloudSyncLoading(false);
      setTimeout(() => setCloudSyncFeedback(null), 6000);
    }
  };

  const handleCloudSync = async () => {
    setCloudSyncLoading(true);
    setCloudSyncFeedback(null);
    try {
      const res = await database.forceCloudSync();
      setCloudSyncFeedback(res.message || 'Successfully saved and synced full database to Firebase Firestore Cloud storage!');
    } catch (e) {
      setCloudSyncFeedback('Local changes saved & queued for cloud sync.');
    } finally {
      setCloudSyncLoading(false);
      setTimeout(() => setCloudSyncFeedback(null), 6000);
    }
  };

  // 1-Click Export Database Helper
  const downloadDatabaseBlob = (data: any, defaultFilename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportDatabase = async (customFilename?: string) => {
    setExportLoading(true);
    try {
      let dbToExport: any = database.getFullDatabase();
      if (!dbToExport || Object.keys(dbToExport).length === 0) {
        try {
          const res = await fetch('/api/db/export');
          if (res.ok) dbToExport = await res.json();
        } catch (e) {}
      }
      const filename = customFilename || `TFW_Park_Database_${new Date().toISOString().split('T')[0]}.json`;
      downloadDatabaseBlob(dbToExport, filename);
      onSaveAppConfig({ lastBackupDate: new Date().toISOString() });
      refreshCycleStats();
      return true;
    } catch (e) {
      console.error('Export error:', e);
      return false;
    } finally {
      setExportLoading(false);
    }
  };

  // 3-Month Interval Cycle Reset (Archive & Start Next 3-Month Interval)
  const handleQuarterlyBackupAndReset = async () => {
    setQuarterlyResetLoading(true);
    setQuarterlyResetFeedback(null);
    try {
      // Step 1: Download full 3-month dataset snapshot backup first
      const stats = database.getCycleStats(appConfig.cycleStartDate, 3);
      const backupFilename = `TFW_Quarterly_3Months_Backup_${stats.cycleStartDate}_to_${stats.cycleEndDate}.json`;
      await handleExportDatabase(backupFilename);

      // Step 2: Perform reset & advance cycle
      const res = await database.resetQuarterlyCycle(nextCycleStartDate);
      if (res.success) {
        onSaveAppConfig({
          cycleStartDate: nextCycleStartDate,
          lastBackupDate: new Date().toISOString(),
          lastCycleResetDate: new Date().toISOString(),
          cycleIntervalMonths: 3
        });
        refreshCycleStats();
        setQuarterlyResetFeedback(`Quarterly backup saved! The past 3-month operational day data was safely archived and the next 3-month interval (${nextCycleStartDate} onward) has started.`);
      } else {
        setQuarterlyResetFeedback('Failed to reset cycle.');
      }
    } catch (e) {
      setQuarterlyResetFeedback('Error completing quarterly reset.');
    } finally {
      setQuarterlyResetLoading(false);
      setTimeout(() => setQuarterlyResetFeedback(null), 8000);
    }
  };

  // Clean data older than 3 months (90 days)
  const handleCleanOlderThanCutoff = async () => {
    if (!olderThanCutoff) return;
    setOlderThanLoading(true);
    setOlderThanFeedback(null);
    try {
      // Download safety backup first
      const backupFilename = `TFW_Safety_Backup_Before_Cleanup_${new Date().toISOString().split('T')[0]}.json`;
      await handleExportDatabase(backupFilename);

      const res = await database.cleanDataOlderThan(olderThanCutoff);
      if (res.success) {
        setOlderThanFeedback(`Clean-up complete! Removed ${res.deletedDatesCount} operational dates older than ${olderThanCutoff}. Most recent 3 months of data remain active.`);
        refreshCycleStats();
      } else {
        setOlderThanFeedback('Failed to clean older data.');
      }
    } catch (e) {
      setOlderThanFeedback('Error cleaning data older than cutoff.');
    } finally {
      setOlderThanLoading(false);
      setTimeout(() => setOlderThanFeedback(null), 8000);
    }
  };

  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    setRestoreFeedback(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const res = await database.importDatabase(parsed);
        if (res.success) {
          setRestoreFeedback('Database successfully restored from JSON backup & broadcasted everywhere!');
          refreshCycleStats();
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setRestoreFeedback('Failed to restore: Invalid backup structure.');
        }
      } catch (err) {
        setRestoreFeedback('Error reading backup file. Please select a valid JSON backup file.');
      } finally {
        setRestoreLoading(false);
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetDayData = async () => {
    if (!resetDayInput) return;
    setResetDayLoading(true);
    setResetDayFeedback(null);
    try {
      const res = await database.resetDay(resetDayInput);
      if (res.success) {
        setResetDayFeedback(`All shift operations, counters, and attendance for ${resetDayInput} have been cleared.`);
        refreshCycleStats();
      } else {
        setResetDayFeedback('Failed to reset selected day.');
      }
    } catch (e) {
      setResetDayFeedback('Error resetting day data.');
    } finally {
      setResetDayLoading(false);
      setTimeout(() => setResetDayFeedback(null), 6000);
    }
  };

  // Non-blocking in-app confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Sync state if external appConfig changes
  useEffect(() => {
    if (appConfig) {
      setAppName(appConfig.appName === 'TFW Operations Manager' ? 'Tanvir Bashundhara Group' : (appConfig.appName || 'Tanvir Bashundhara Group'));
      setAppSubtitle(appConfig.appSubtitle || 'Shift Operations & Ticketing Management');
      setOrgName(appConfig.orgName || 'Toggi Fun World');
      setAppLogo(appConfig.appLogo || '');
      setLoginLeftLogo(appConfig.loginLeftLogo || '/tbg-logo.svg');
      setLoginLeftTitle((!appConfig.loginLeftTitle || appConfig.loginLeftTitle === 'TOGGI FUN WORLD') ? 'Tanvir Bashundhara Group' : appConfig.loginLeftTitle);
      setLoginLeftSubtitle(appConfig.loginLeftSubtitle || 'Operations & Management Portal');
      setLoginRightLogo(appConfig.loginRightLogo || '/bcdl-logo.svg');
      setLoginRightTitle((!appConfig.loginRightTitle || appConfig.loginRightTitle === 'BASHUNDHARA GROUP') ? 'Bashundhara City Development Ltd' : appConfig.loginRightTitle);
      setLoginRightSubtitle(appConfig.loginRightSubtitle || 'Bashundhara Group');
      setLoginHeading(appConfig.loginHeading || 'Sign In');
      setLoginSubheading(appConfig.loginSubheading || 'Select your profile to begin your shift');
      setDevByLabel(appConfig.devByLabel || 'Developed By');
      setDevByName(appConfig.devByName || 'Mufti Mahmud Mollah');
      setDevByTitle(appConfig.devByTitle || 'AGM (Maintenance & SCD, FP, TFW)');
      setTotalGuestsLabel(appConfig.totalGuestsLabel || 'Total Guests Today');
      setTotalTicketSalesLabel(appConfig.totalTicketSalesLabel || 'Total Ticket Sales Today');
      setAnnouncementText(appConfig.announcementText || '');
      setAdminPassword(appConfig.adminPassword || 'admin');
      setOperationOfficerPassword(appConfig.operationOfficerPassword || 'ops');
      setSalesOfficerPassword(appConfig.salesOfficerPassword || 'sales');
      setMaintenancePassword(appConfig.maintenancePassword || 'maint');
      setCutoffHour(appConfig.cutoffHour !== undefined ? appConfig.cutoffHour : 22);
      setCurrency(appConfig.currency || 'BDT');
    }
  }, [appConfig]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png', 0.92);
          setAppLogo(compressed);
        } else {
          setAppLogo(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleLeftLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setLoginLeftLogo(canvas.toDataURL('image/png', 0.92));
        } else {
          setLoginLeftLogo(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRightLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setLoginRightLogo(canvas.toDataURL('image/png', 0.92));
        } else {
          setLoginRightLogo(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRideImageFile = (file: File) => {
    if (!file.type.startsWith('image/') || !editingRide) return;
    setRideImageProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setEditingRide(prev => prev ? { ...prev, imageUrl: compressed } : null);
        } else {
          setEditingRide(prev => prev ? { ...prev, imageUrl: dataUrl } : null);
        }
        setRideImageProcessing(false);
      };
      img.onerror = () => {
        setEditingRide(prev => prev ? { ...prev, imageUrl: dataUrl } : null);
        setRideImageProcessing(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoDirectly = () => {
    const finalLogo = appLogo.trim() || null;
    const finalLeftLogo = loginLeftLogo.trim() || null;
    const finalRightLogo = loginRightLogo.trim() || null;
    onSaveAppConfig({ 
      appLogo: finalLogo,
      loginLeftLogo: finalLeftLogo || '/tbg-logo.svg',
      loginLeftTitle: loginLeftTitle.trim() || 'Tanvir Bashundhara Group',
      loginLeftSubtitle: loginLeftSubtitle.trim() || 'Operations & Management Portal',
      loginRightLogo: finalRightLogo || '/bcdl-logo.svg',
      loginRightTitle: loginRightTitle.trim() || 'Bashundhara City Development Ltd',
      loginRightSubtitle: loginRightSubtitle.trim() || 'Bashundhara Group',
    });
    database.forceCloudSync();
    setLogoSavedFeedback(true);
    setTimeout(() => setLogoSavedFeedback(false), 3000);
  };

  const handleSaveSystemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAppConfig({
      appName: appName.trim() || 'Tanvir Bashundhara Group',
      appSubtitle: appSubtitle.trim() || '',
      orgName: orgName.trim() || '',
      appLogo: appLogo.trim() || null,
      loginLeftLogo: loginLeftLogo.trim() || '/tbg-logo.svg',
      loginLeftTitle: loginLeftTitle.trim() || 'Tanvir Bashundhara Group',
      loginLeftSubtitle: loginLeftSubtitle.trim() || 'Operations & Management Portal',
      loginRightLogo: loginRightLogo.trim() || '/bcdl-logo.svg',
      loginRightTitle: loginRightTitle.trim() || 'Bashundhara City Development Ltd',
      loginRightSubtitle: loginRightSubtitle.trim() || 'Bashundhara Group',
      loginHeading: loginHeading.trim() || 'Sign In',
      loginSubheading: loginSubheading.trim() || '',
      devByLabel: devByLabel.trim() || 'Developed By',
      devByName: devByName.trim() || '',
      devByTitle: devByTitle.trim() || '',
      totalGuestsLabel: totalGuestsLabel.trim() || 'Total Guests Today',
      totalTicketSalesLabel: totalTicketSalesLabel.trim() || 'Total Ticket Sales Today',
      announcementText: announcementText.trim() || '',
      adminPassword,
      operationOfficerPassword,
      salesOfficerPassword,
      maintenancePassword,
      cxPassword,
      cutoffHour: Number(cutoffHour),
      currency: currency.trim() || 'BDT'
    });
    database.forceCloudSync();
    setSystemSavedFeedback(true);
    setTimeout(() => setSystemSavedFeedback(false), 4000);
  };

  const currentStaffRoles = appConfig.roles || [];
  const allStaffMembers = [...operators, ...ticketSalesPersonnel, ...maintenancePersonnel, ...cxPersonnel];

  const handleSaveStaffRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    const newRole: StaffRoleDefinition = {
      id: editingRole?.id || `role-${Date.now()}`,
      name: roleName.trim(),
      department: roleDept,
      description: roleDesc.trim(),
      isSystem: editingRole?.isSystem || false
    };

    let updatedRoles: StaffRoleDefinition[];
    const exists = currentStaffRoles.some(r => r.id === newRole.id);
    if (exists) {
      updatedRoles = currentStaffRoles.map(r => r.id === newRole.id ? newRole : r);
    } else {
      updatedRoles = [...currentStaffRoles, newRole];
    }

    onSaveAppConfig({ roles: updatedRoles });
    database.forceCloudSync();
    setEditingRole(null);
  };

  const handleToggleLoginRole = (roleKey: string) => {
    const currentHidden = appConfig.hiddenLoginRoles || [];
    let updatedHidden: string[];
    if (currentHidden.includes(roleKey)) {
      updatedHidden = currentHidden.filter(k => k !== roleKey);
    } else {
      updatedHidden = [...currentHidden, roleKey];
    }
    onSaveAppConfig({ hiddenLoginRoles: updatedHidden });
    database.forceCloudSync();
  };

  const handleDeleteStaffRole = (roleId: string) => {
    const roleToDelete = currentStaffRoles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Staff Role',
      message: roleToDelete.isSystem
        ? `"${roleToDelete.name}" is a default system role. Deleting this will remove it from the system and login screens across all devices. Proceed?`
        : `Delete role "${roleToDelete.name}" across all devices?`,
      confirmLabel: 'Delete Role',
      confirmVariant: 'danger',
      onConfirm: () => {
        const updatedRoles = currentStaffRoles.filter(r => r.id !== roleId);
        const currentHidden = appConfig.hiddenLoginRoles || [];
        let updatedHidden = [...currentHidden];
        
        // If deleting Games & Ride Associate or any specific login role, ensure it's hidden from the login screen immediately
        if (
          roleId === 'role-1' || 
          roleToDelete.loginRole === 'operator' || 
          roleToDelete.name.toLowerCase().includes('games') || 
          roleToDelete.name.toLowerCase().includes('operator') ||
          roleToDelete.name.toLowerCase().includes('ride associate')
        ) {
          if (!updatedHidden.includes('operator')) {
            updatedHidden.push('operator');
          }
        }
        if (roleToDelete.loginRole && !updatedHidden.includes(roleToDelete.loginRole)) {
          updatedHidden.push(roleToDelete.loginRole);
        }

        onSaveAppConfig({ 
          roles: updatedRoles,
          hiddenLoginRoles: updatedHidden
        });
        database.forceCloudSync();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-md animate-fade-in-up">
      <div className="bg-gray-850 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-700/80 flex flex-wrap justify-between items-center bg-gray-900/90 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Administrator Entity & Field Console
              </h2>
              <p className="text-xs text-gray-400">Modify names, roles, pricing, floors, and park attributes</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleMasterPublish}
              disabled={cloudSyncLoading}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer border border-indigo-400/40 disabled:opacity-50 active:scale-95"
              title="Click to force save and sync all changes across all devices immediately"
            >
              <RefreshCw className={`w-4 h-4 ${cloudSyncLoading ? 'animate-spin' : ''}`} />
              {cloudSyncLoading ? 'Publishing Everywhere...' : '⚡ Update Everywhere'}
            </button>
            <button 
              type="button"
              onClick={() => {
                setBulkImportEntity('all');
                setShowBulkImportModal(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Bulk Excel Import
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Global Broadcast Status Banner */}
        {cloudSyncFeedback && (
          <div className="bg-gradient-to-r from-indigo-900/90 to-blue-900/90 text-indigo-100 px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-indigo-700/60 animate-fade-in shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{cloudSyncFeedback}</span>
            </div>
            <button
              onClick={() => setCloudSyncFeedback(null)}
              className="text-indigo-300 hover:text-white text-xs font-bold ml-3 px-1.5 py-0.5 rounded bg-indigo-950/60"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-900/50 px-4 overflow-x-auto gap-1 scrollbar-hide py-2 flex-shrink-0">
          <TabButton label="Rides & Attractions" count={rides.length} active={activeTab === 'rides'} onClick={() => setActiveTab('rides')} icon={<Layers className="w-4 h-4" />} />
          <TabButton label="Counters" count={counters.length} active={activeTab === 'counters'} onClick={() => setActiveTab('counters')} icon={<Ticket className="w-4 h-4" />} />
          <TabButton label="Games & Ride Associates" count={operators.length} active={activeTab === 'operators'} onClick={() => setActiveTab('operators')} icon={<Users className="w-4 h-4" />} />
          <TabButton label="Sales Staff" count={ticketSalesPersonnel.length} active={activeTab === 'sales-staff'} onClick={() => setActiveTab('sales-staff')} icon={<span className="font-bold text-xs leading-none tracking-tight">TK.</span>} />
          <TabButton label="Technicians" count={maintenancePersonnel.length} active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} icon={<Wrench className="w-4 h-4" />} />
          <TabButton label="Customer Experience (CX)" count={cxPersonnel.length} active={activeTab === 'cx-staff'} onClick={() => setActiveTab('cx-staff')} icon={<HeartHandshake className="w-4 h-4 text-rose-400" />} />
          <TabButton label="Packages & Pricing" count={packages.length} active={activeTab === 'packages'} onClick={() => setActiveTab('packages')} icon={<Sparkles className="w-4 h-4" />} />
          <TabButton label="Floors & Zones" count={floors.length} active={activeTab === 'floors'} onClick={() => setActiveTab('floors')} icon={<MapPin className="w-4 h-4" />} />
          <TabButton label="Logo & Branding" active={activeTab === 'logo'} onClick={() => setActiveTab('logo')} icon={<ImageIcon className="w-4 h-4" />} />
          <TabButton label="Text & System Settings" active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Sliders className="w-4 h-4" />} />
          <TabButton label="Developer & Roles" count={currentStaffRoles.length} active={activeTab === 'developer-roles'} onClick={() => setActiveTab('developer-roles')} icon={<Code className="w-4 h-4" />} />
          <TabButton label="Cloud Database & Backup" active={activeTab === 'database'} onClick={() => setActiveTab('database')} icon={<Database className="w-4 h-4 text-cyan-400" />} />
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-grow bg-gray-900/30 custom-scrollbar">
          
          {/* --- TAB: RIDES --- */}
          {activeTab === 'rides' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white">Theme Park Rides & Attractions</h3>
                  <p className="text-xs text-gray-400">Configure ride titles, assigned floors, guest capacity, and status</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => downloadExcelTemplate('rides')}
                    className="bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    title="Download Excel template (.xlsx) for bulk ride import"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setBulkImportEntity('rides');
                      setShowBulkImportModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                  </button>
                  <button 
                    onClick={() => setEditingRide({ id: Date.now(), name: '', floor: floors[0] || 'L1', capacity: undefined, status: 'active', minHeight: '' })}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Ride
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rides.map(ride => (
                  <div key={ride.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all flex flex-col justify-between group shadow-lg">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg bg-blue-900/40 border border-blue-700/50 flex items-center justify-center text-blue-300 font-bold text-xs">
                            #{ride.id}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base leading-snug">{ride.name}</h4>
                            <span className="text-xs text-blue-400 font-medium">{ride.floor}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          ride.status === 'maintenance' 
                            ? 'bg-amber-900/40 text-amber-300 border-amber-800' 
                            : ride.status === 'closed'
                            ? 'bg-red-900/40 text-red-300 border-red-800'
                            : 'bg-emerald-900/40 text-emerald-300 border-emerald-800'
                        }`}>
                          {ride.status || 'active'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3 p-2 bg-gray-900/60 rounded-lg text-xs border border-gray-750">
                        <div>
                          <span className="text-gray-500 block">Capacity</span>
                          <span className="font-semibold text-gray-200">{ride.capacity ? `${ride.capacity} guests` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Min Height</span>
                          <span className="font-semibold text-gray-200">{ride.minHeight || '—'}</span>
                        </div>
                      </div>

                      {ride.imageUrl && (
                        <div className="h-20 w-full rounded-lg overflow-hidden mb-3 border border-gray-700">
                          <img src={ride.imageUrl} alt={ride.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                      <button 
                        onClick={() => setEditingRide({ ...ride })}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Fields
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Ride',
                            message: `Delete ride "${ride.name}"? This action cannot be undone.`,
                            confirmLabel: 'Delete Ride',
                            confirmVariant: 'danger',
                            onConfirm: () => onDeleteRide(ride.id)
                          });
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: COUNTERS --- */}
          {activeTab === 'counters' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white">Ticket Counters & POS Terminals</h3>
                  <p className="text-xs text-gray-400">Configure ticket booths, counter types (VIP, Online, General), and locations</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => downloadExcelTemplate('counters')}
                    className="bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    title="Download Excel template (.xlsx) for bulk counter import"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setBulkImportEntity('counters');
                      setShowBulkImportModal(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-950/40 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                  </button>
                  <button 
                    onClick={() => setEditingCounter({ id: Date.now(), name: '', type: 'General', location: 'L1 Lobby', active: true })}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Counter
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {counters.map(counter => (
                  <div key={counter.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-bold text-white text-base">{counter.name}</h4>
                          <span className="text-xs text-teal-400 font-semibold uppercase">{counter.type || 'General'}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          counter.active !== false ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' : 'bg-gray-700 text-gray-400 border-gray-600'
                        }`}>
                          {counter.active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" /> {counter.location || 'Park Entrance'}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                      <button 
                        onClick={() => setEditingCounter({ ...counter })}
                        className="text-teal-400 hover:text-teal-300 hover:bg-teal-900/30 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Fields
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Counter',
                            message: `Delete counter "${counter.name}"? This action cannot be undone.`,
                            confirmLabel: 'Delete Counter',
                            confirmVariant: 'danger',
                            onConfirm: () => onDeleteCounter(counter.id)
                          });
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: OPERATORS --- */}
          {activeTab === 'operators' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white">Games & Ride Associates Roster</h3>
                  <p className="text-xs text-gray-400">Manage names, contact phone numbers, roles, and active roster status</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => downloadExcelTemplate('operators')}
                    className="bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    title="Download Excel template (.xlsx) for bulk games & ride associates"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setBulkImportEntity('operators');
                      setShowBulkImportModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                  </button>
                  <button 
                    onClick={() => setEditingOperator({ id: Date.now(), name: '', phone: '', role: 'Games & Ride Associate', active: true })}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Associate
                  </button>
                  {operators.length > 0 && onClearAllOperators && (
                    <button 
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Delete All Games & Ride Associates',
                          message: `Are you sure you want to permanently delete all ${operators.length} Games & Ride Associates from the roster? You will be able to add or bulk import new ones.`,
                          confirmLabel: 'Delete All',
                          confirmVariant: 'danger',
                          onConfirm: () => onClearAllOperators()
                        });
                      }}
                      className="bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Clear all associates from roster"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" /> Clear All ({operators.length})
                    </button>
                  )}
                </div>
              </div>

              {operators.length === 0 ? (
                <div className="py-12 text-center bg-gray-800/40 rounded-2xl border border-dashed border-gray-700/80 p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 flex items-center justify-center mx-auto text-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">No Games & Ride Associates in Roster</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    All previous associates have been cleared. You can now add your new associates individually or upload them via Bulk Import.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      onClick={() => setEditingOperator({ id: Date.now(), name: '', phone: '', role: 'Games & Ride Associate', active: true })}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Associate
                    </button>
                    <button
                      onClick={() => {
                        setBulkImportEntity('operators');
                        setShowBulkImportModal(true);
                      }}
                      className="bg-gray-750 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Bulk Import (Excel/CSV)
                    </button>
                    <button
                      onClick={() => downloadExcelTemplate('operators')}
                      className="bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download Template
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {operators.map(op => (
                    <div key={op.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between shadow-lg">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 flex items-center justify-center font-bold text-sm">
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{op.name}</h4>
                            <span className="text-xs text-indigo-400">{op.role || 'Associate'}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          op.active !== false ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' : 'bg-gray-700 text-gray-400 border-gray-600'
                        }`}>
                          {op.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {op.phone && (
                        <p className="text-xs text-gray-400 mb-2">📞 {op.phone}</p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                        <button 
                          onClick={() => setEditingOperator({ ...op })}
                          className="text-indigo-400 hover:text-indigo-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Associate',
                              message: `Delete associate "${op.name}"?`,
                              confirmLabel: 'Delete',
                              confirmVariant: 'danger',
                              onConfirm: () => onDeleteOperator(op.id)
                            });
                          }}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- TAB: SALES STAFF --- */}
          {activeTab === 'sales-staff' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white">Ticket Sales Personnel</h3>
                  <p className="text-xs text-gray-400">Manage cashier and sales officer profiles</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => downloadExcelTemplate('sales')}
                    className="bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    title="Download Excel template (.xlsx) for bulk sales staff"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setBulkImportEntity('sales');
                      setShowBulkImportModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                  </button>
                  <button 
                    onClick={() => setEditingSalesStaff({ id: Date.now(), name: '', phone: '', role: 'Sales Executive', active: true })}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Sales Staff
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ticketSalesPersonnel.map(p => (
                  <div key={p.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between shadow-lg">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 flex items-center justify-center font-bold text-sm">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{p.name}</h4>
                          <span className="text-xs text-emerald-400">{p.role || 'Cashier'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        p.active !== false ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' : 'bg-gray-700 text-gray-400 border-gray-600'
                      }`}>
                        {p.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {p.phone && <p className="text-xs text-gray-400 mb-2">📞 {p.phone}</p>}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                      <button onClick={() => setEditingSalesStaff({ ...p })} className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Sales Personnel',
                            message: `Delete sales personnel "${p.name}"?`,
                            confirmLabel: 'Delete',
                            confirmVariant: 'danger',
                            onConfirm: () => onDeleteTicketSalesPersonnel(p.id)
                          });
                        }} 
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: MAINTENANCE TECHS --- */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white">Maintenance Engineers & Technicians</h3>
                  <p className="text-xs text-gray-400">Manage electrical, mechanical, and safety repair team members</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => downloadExcelTemplate('technicians')}
                    className="bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    title="Download Excel template (.xlsx) for bulk technicians"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setBulkImportEntity('technicians');
                      setShowBulkImportModal(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                  </button>
                  <button 
                    onClick={() => setEditingMaintenance({ id: Date.now(), name: '', phone: '', role: 'Technician', active: true })}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Technician
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {maintenancePersonnel.map(m => (
                  <div key={m.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between shadow-lg">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-900/50 text-amber-300 border border-amber-700/50 flex items-center justify-center font-bold text-sm">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{m.name}</h4>
                          <span className="text-xs text-amber-400">{m.role || 'Technician'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        m.active !== false ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' : 'bg-gray-700 text-gray-400 border-gray-600'
                      }`}>
                        {m.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {m.phone && <p className="text-xs text-gray-400 mb-2">📞 {m.phone}</p>}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                      <button onClick={() => setEditingMaintenance({ ...m })} className="text-amber-400 hover:text-amber-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Technician',
                            message: `Delete technician "${m.name}"?`,
                            confirmLabel: 'Delete',
                            confirmVariant: 'danger',
                            onConfirm: () => onDeleteMaintenancePersonnel(m.id)
                          });
                        }} 
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: CUSTOMER EXPERIENCE (CX) --- */}
          {activeTab === 'cx-staff' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-rose-400" />
                    Customer Experience (CX) Team
                  </h3>
                  <p className="text-xs text-gray-400">Manage CX specialists, guest relations officers, and quality assurance personnel</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => downloadExcelTemplate('cx')}
                    className="bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all cursor-pointer"
                    title="Download Excel template (.xlsx) for bulk CX team"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setBulkImportEntity('cx');
                      setShowBulkImportModal(true);
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                  </button>
                  <button 
                    onClick={() => setEditingCxStaff({ id: Date.now(), name: '', phone: '', role: 'Customer Experience Specialist', active: true })}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add CX Staff
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-gray-800/60 p-3 rounded-xl border border-gray-700">
                <Search className="w-4 h-4 text-gray-400 ml-1" />
                <input
                  type="text"
                  placeholder="Search CX staff by name, role, or phone..."
                  value={cxSearchTerm}
                  onChange={(e) => setCxSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-white text-xs placeholder-gray-500 focus:outline-none flex-1"
                />
                {cxSearchTerm && (
                  <button onClick={() => setCxSearchTerm('')} className="text-gray-400 hover:text-white text-xs">Clear</button>
                )}
                <span className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-lg">
                  {cxPersonnel.length} {cxPersonnel.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cxPersonnel
                  .filter(c => {
                    if (!cxSearchTerm.trim()) return true;
                    const term = cxSearchTerm.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(term) ||
                      (c.role && c.role.toLowerCase().includes(term)) ||
                      (c.phone && c.phone.toLowerCase().includes(term))
                    );
                  })
                  .map(c => (
                  <div key={c.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between shadow-lg hover:border-rose-500/40 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-rose-900/50 text-rose-300 border border-rose-700/50 flex items-center justify-center font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{c.name}</h4>
                          <span className="text-xs text-rose-400">{c.role || 'Customer Experience Specialist'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        c.active !== false ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' : 'bg-gray-700 text-gray-400 border-gray-600'
                      }`}>
                        {c.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {c.phone && <p className="text-xs text-gray-400 mb-2">📞 {c.phone}</p>}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                      <button onClick={() => setEditingCxStaff({ ...c })} className="text-rose-400 hover:text-rose-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete CX Staff',
                            message: `Delete Customer Experience staff "${c.name}"?`,
                            confirmLabel: 'Delete',
                            confirmVariant: 'danger',
                            onConfirm: () => onDeleteCxPersonnel(c.id)
                          });
                        }} 
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: PACKAGES & PRICING --- */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white">Ticket Packages & Pricing</h3>
                  <p className="text-xs text-gray-400">Create, rename, re-price ticket bundles. Changes instantly apply to Daily Sales calculations.</p>
                </div>
                <button 
                  onClick={() => setEditingPackage({ id: `pkg-${Date.now()}`, name: '', price: 500, category: 'Standard', description: '', active: true })}
                  className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add Package
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-white text-lg">{pkg.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-900/40 text-pink-300 border border-pink-800 font-semibold">
                          {pkg.category || 'General'}
                        </span>
                      </div>
                      
                      <div className="my-3">
                        <span className="text-2xl font-bold text-green-400">{currency} {pkg.price.toLocaleString()}</span>
                      </div>

                      {pkg.description && (
                        <p className="text-xs text-gray-400 mb-3">{pkg.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                      <button onClick={() => setEditingPackage({ ...pkg })} className="text-pink-400 hover:text-pink-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Edit Package & Price
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Package',
                            message: `Delete package "${pkg.name}"?`,
                            confirmLabel: 'Delete',
                            confirmVariant: 'danger',
                            onConfirm: () => onDeletePackage(pkg.id)
                          });
                        }} 
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: FLOORS & ZONES --- */}
          {activeTab === 'floors' && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Floors & Park Zones</h3>
                  <p className="text-xs text-gray-400">Add or remove park floors and themed zones used across ride categorization</p>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New Floor / Zone Name (e.g. L4 SkyDeck)" 
                    value={newFloorInput}
                    onChange={(e) => setNewFloorInput(e.target.value)}
                    className="flex-grow bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-blue-500 outline-none"
                  />
                  <button 
                    onClick={() => {
                      if (newFloorInput.trim() && !floors.includes(newFloorInput.trim())) {
                        onSaveFloors([...floors, newFloorInput.trim()]);
                        setNewFloorInput('');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl font-semibold text-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  {floors.map((floor, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-900/60 p-3 rounded-lg border border-gray-750">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-200 font-medium text-sm">{floor}</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (floors.length <= 1) {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Cannot Remove Floor',
                              message: 'At least one floor must remain in the park configuration.',
                              confirmLabel: 'Understood',
                              confirmVariant: 'primary',
                              onConfirm: () => {}
                            });
                            return;
                          }
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Remove Floor / Zone',
                            message: `Remove floor "${floor}"?`,
                            confirmLabel: 'Remove Floor',
                            confirmVariant: 'danger',
                            onConfirm: () => onSaveFloors(floors.filter((_, i) => i !== idx))
                          });
                        }}
                        className="text-red-400 hover:text-red-300 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: LOGO & BRANDING --- */}
          {activeTab === 'logo' && (
            <div className="space-y-6 max-w-4xl animate-fade-in-up">
              
              {/* Card 1: Main Global Park / Application Logo */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-700/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-400" />
                      1. Main Park & App Logo (Global Brand)
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Displays across the top navbar, center of the login screen card, receipts, and exported PDF reports.
                    </p>
                  </div>
                  {logoSavedFeedback && (
                    <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs px-3 py-1.5 rounded-xl animate-fade-in-up">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Logos Saved!</span>
                    </div>
                  )}
                </div>

                {/* Upload & URL Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Box */}
                  <div className="bg-gray-900/90 rounded-xl p-5 border border-dashed border-gray-600 hover:border-blue-500 transition-colors flex flex-col items-center justify-center text-center space-y-3">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoFileUpload} 
                      accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                      className="hidden" 
                    />
                    <div className="h-12 w-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Upload Main Logo File</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, WebP from your device</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                    </button>
                  </div>

                  {/* URL Input Box */}
                  <div className="bg-gray-900/90 rounded-xl p-5 border border-gray-700 flex flex-col justify-between space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                        Or Provide Image URL
                      </label>
                      <input 
                        type="url" 
                        value={appLogo}
                        onChange={(e) => setAppLogo(e.target.value)}
                        placeholder="https://example.com/main-logo.png"
                        className="w-full bg-gray-800 text-white rounded-xl p-2.5 text-xs border border-gray-700 outline-none focus:border-blue-500"
                      />
                      <p className="text-[11px] text-gray-500 mt-1.5">
                        Direct public image link (CDN, Imgur, or cloud storage)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {appLogo && (
                        <button
                          type="button"
                          onClick={() => setAppLogo('')}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Main Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Login Portal - Left Corner Logo Option */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-700/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      2. Login Portal — Left Corner Logo & Badge
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Top-left brand emblem and title displayed on the login portal screen.
                    </p>
                  </div>
                  {loginLeftLogo && (
                    <span className="text-xs text-purple-300 bg-purple-950/80 border border-purple-800 px-2.5 py-1 rounded-lg">
                      Custom Left Logo Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Box */}
                  <div className="bg-gray-900/90 rounded-xl p-5 border border-dashed border-gray-600 hover:border-purple-500 transition-colors flex flex-col items-center justify-center text-center space-y-3">
                    <input 
                      type="file" 
                      ref={leftLogoFileInputRef} 
                      onChange={handleLeftLogoFileUpload} 
                      accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                      className="hidden" 
                    />
                    <div className="h-12 w-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Upload Left Corner Logo</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, WebP format</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => leftLogoFileInputRef.current?.click()}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                    </button>
                  </div>

                  {/* URL & Text Settings Box */}
                  <div className="bg-gray-900/90 rounded-xl p-5 border border-gray-700 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1">
                          Left Logo Image URL
                        </label>
                        <input 
                          type="url" 
                          value={loginLeftLogo}
                          onChange={(e) => setLoginLeftLogo(e.target.value)}
                          placeholder="https://example.com/tfw-corner-logo.png"
                          className="w-full bg-gray-800 text-white rounded-xl p-2.5 text-xs border border-gray-700 outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                            Badge Title
                          </label>
                          <input 
                            type="text" 
                            value={loginLeftTitle}
                            onChange={(e) => setLoginLeftTitle(e.target.value)}
                            placeholder="Tanvir Bashundhara Group"
                            className="w-full bg-gray-800 text-white rounded-xl p-2 text-xs border border-gray-700 outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                            Badge Subtitle
                          </label>
                          <input 
                            type="text" 
                            value={loginLeftSubtitle}
                            onChange={(e) => setLoginLeftSubtitle(e.target.value)}
                            placeholder="Operations & Management Portal"
                            className="w-full bg-gray-800 text-white rounded-xl p-2 text-xs border border-gray-700 outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {loginLeftLogo && (
                        <button
                          type="button"
                          onClick={() => setLoginLeftLogo('')}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Left Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Login Portal - Right Corner Logo Option */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-700/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      3. Login Portal — Right Corner Logo & Badge
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Top-right corporate parent, partner, or sponsor logo and tagline displayed on the login portal.
                    </p>
                  </div>
                  {loginRightLogo && (
                    <span className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-lg">
                      Custom Right Logo Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Box */}
                  <div className="bg-gray-900/90 rounded-xl p-5 border border-dashed border-gray-600 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center space-y-3">
                    <input 
                      type="file" 
                      ref={rightLogoFileInputRef} 
                      onChange={handleRightLogoFileUpload} 
                      accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                      className="hidden" 
                    />
                    <div className="h-12 w-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Upload Right Corner Logo</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, WebP format</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => rightLogoFileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                    </button>
                  </div>

                  {/* URL & Text Settings Box */}
                  <div className="bg-gray-900/90 rounded-xl p-5 border border-gray-700 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1">
                          Right Logo Image URL
                        </label>
                        <input 
                          type="url" 
                          value={loginRightLogo}
                          onChange={(e) => setLoginRightLogo(e.target.value)}
                          placeholder="https://example.com/bashundhara-logo.png"
                          className="w-full bg-gray-800 text-white rounded-xl p-2.5 text-xs border border-gray-700 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                            Badge Title
                          </label>
                          <input 
                            type="text" 
                            value={loginRightTitle}
                            onChange={(e) => setLoginRightTitle(e.target.value)}
                            placeholder="Bashundhara City Development Ltd"
                            className="w-full bg-gray-800 text-white rounded-xl p-2 text-xs border border-gray-700 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                            Badge Subtitle
                          </label>
                          <input 
                            type="text" 
                            value={loginRightSubtitle}
                            onChange={(e) => setLoginRightSubtitle(e.target.value)}
                            placeholder="Bashundhara Group"
                            className="w-full bg-gray-800 text-white rounded-xl p-2 text-xs border border-gray-700 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {loginRightLogo && (
                        <button
                          type="button"
                          onClick={() => setLoginRightLogo('')}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Right Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Realistic Combined Live Visual Preview Display */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Live Realistic Preview — Login Portal Screen Layout
                </h4>
                <p className="text-xs text-gray-400">
                  Simulated top bar and center card in the login portal with Left Corner Logo, Center Brand Logo, and Right Corner Logo:
                </p>
                
                {/* Simulated Login Screen Canvas */}
                <div className="bg-gray-950 rounded-2xl p-6 border border-gray-750 relative overflow-hidden space-y-8">
                  {/* Top Bar Preview */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
                    {/* Left Corner Badge Preview */}
                    <div className="bg-gray-850/90 border border-purple-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-lg">
                      {loginLeftLogo || appLogo ? (
                        <img 
                          src={loginLeftLogo || appLogo} 
                          alt="Left Logo" 
                          className="h-8 sm:h-9 w-auto min-w-[36px] max-w-[65px] object-contain rounded-lg p-0.5 bg-white border border-gray-400 shadow-sm" 
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gradient-to-tr from-amber-600 via-yellow-600 to-amber-700 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow">
                          {loginLeftTitle.split(' ').map(w => w[0]).filter(Boolean).slice(0, 3).join('') || 'TBG'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white tracking-wider uppercase leading-none flex items-center gap-1.5">
                          <span>{loginLeftTitle || 'Tanvir Bashundhara Group'}</span>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </span>
                        <span className="text-[9px] text-purple-300 font-semibold leading-none mt-0.5">
                          {loginLeftSubtitle || 'Operations & Management Portal'}
                        </span>
                      </div>
                    </div>

                    {/* Right Corner Badge Preview */}
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-850/90 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-lg text-right">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white tracking-wider uppercase leading-none">
                            {loginRightTitle || 'Bashundhara City Development Ltd'}
                          </span>
                          <span className="text-[9px] text-emerald-300 font-semibold leading-none mt-0.5">
                            {loginRightSubtitle || 'Bashundhara Group'}
                          </span>
                        </div>
                        {loginRightLogo ? (
                          <img 
                            src={loginRightLogo} 
                            alt="Right Logo" 
                            className="h-8 sm:h-9 w-auto min-w-[36px] max-w-[70px] object-contain rounded-lg p-0.5 bg-white border border-gray-400 shadow-sm" 
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow">
                            {loginRightTitle.split(' ').map(w => w[0]).filter(Boolean).slice(0, 4).join('') || 'BCDL'}
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-850/90 text-blue-300 px-3 py-2 rounded-xl border border-blue-500/30 flex items-center gap-1.5 text-xs font-bold">
                        <Share2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Web Link</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Login Card Mini Mockup */}
                  <div className="max-w-xs mx-auto bg-gray-850 p-5 rounded-2xl border border-gray-700 text-center shadow-xl">
                    {appLogo ? (
                      <img src={appLogo} alt="Logo" className="h-12 mx-auto mb-2.5 object-contain rounded-xl p-1 bg-gray-900 border border-gray-700" />
                    ) : (
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl mx-auto mb-2.5 flex items-center justify-center text-lg font-extrabold text-white shadow-md border border-blue-400/30">
                        TFW
                      </div>
                    )}
                    <h4 className="text-sm font-bold text-white leading-tight">{appName || 'Tanvir Bashundhara Group'}</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Sign In • Select your profile to begin shift</p>
                  </div>
                </div>
              </div>

              {/* Save All Logos Button */}
              <div className="pt-2 space-y-3">
                {logoSavedFeedback && (
                  <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in-up">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>All 3 logo options saved permanently to database and updated in real-time!</span>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyLogoDirectly}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Apply All Logos Permanently</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: SYSTEM & TEXT SETTINGS --- */}
          {activeTab === 'system' && (
            <form onSubmit={handleSaveSystemConfig} className="space-y-6 max-w-3xl animate-fade-in-up">
              
              {/* Header & App Identity Section */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">App Identity & Header Branding</h3>
                    <p className="text-xs text-gray-400">Configure application titles, tagline, and organization name</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Application / Park Title
                    </label>
                    <input 
                      type="text" 
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="e.g. Tanvir Bashundhara Group"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Organization / Theme Park Name
                    </label>
                    <input 
                      type="text" 
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="e.g. Toggi Fun World"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Subtitle / Shift Tagline
                  </label>
                  <input 
                    type="text" 
                    value={appSubtitle}
                    onChange={(e) => setAppSubtitle(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                    placeholder="e.g. Shift Operations & Ticketing Management"
                  />
                </div>
              </div>

              {/* Login Screen Text Customization */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Login Screen Text Customization</h3>
                    <p className="text-xs text-gray-400">Customize the headings and instructions displayed to staff on sign in</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Login Heading
                    </label>
                    <input 
                      type="text" 
                      value={loginHeading}
                      onChange={(e) => setLoginHeading(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="e.g. Sign In"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Login Instructions / Subtitle
                    </label>
                    <input 
                      type="text" 
                      value={loginSubheading}
                      onChange={(e) => setLoginSubheading(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="e.g. Select your profile to begin shift"
                    />
                  </div>
                </div>
              </div>

              {/* Summary Counter & Banner Titles */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Summary Metrics Banner Titles</h3>
                    <p className="text-xs text-gray-400">Labels shown in the floating count footers and summary bars</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Rides Guest Counter Title
                    </label>
                    <input 
                      type="text" 
                      value={totalGuestsLabel}
                      onChange={(e) => setTotalGuestsLabel(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="e.g. Total Guests Today"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Ticket Sales Counter Title
                    </label>
                    <input 
                      type="text" 
                      value={totalTicketSalesLabel}
                      onChange={(e) => setTotalTicketSalesLabel(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="e.g. Total Ticket Sales Today"
                    />
                  </div>
                </div>
              </div>

              {/* Footer & Developer Credits */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Footer & Developer Attribution Text</h3>
                    <p className="text-xs text-gray-400">Customize the credits and author designation displayed at the bottom of the page</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Attribution Label
                    </label>
                    <input 
                      type="text" 
                      value={devByLabel}
                      onChange={(e) => setDevByLabel(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="Developed By"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Developer / Lead Name
                    </label>
                    <input 
                      type="text" 
                      value={devByName}
                      onChange={(e) => setDevByName(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="Mufti Mahmud Mollah"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Designation / Department
                    </label>
                    <input 
                      type="text" 
                      value={devByTitle}
                      onChange={(e) => setDevByTitle(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="AGM (Maintenance & SCD, FP, TFW)"
                    />
                  </div>
                </div>
              </div>

              {/* Operational Broadcast Announcement */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Broadcast Announcement / Marquee Notice</h3>
                    <p className="text-xs text-gray-400">Optional announcement banner broadcasted live to all staff on shift</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Announcement Banner Text (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                    placeholder="e.g. Park operating on extended holiday hours today. Safety inspection at 16:00."
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Leave empty to hide broadcast banner.</p>
                </div>
              </div>

              {/* Financial & Security Settings */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
                  <Shield className="w-5 h-5 text-red-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Financial & Role Security Passwords</h3>
                    <p className="text-xs text-gray-400">Currency symbols, shift cutoff rules, and login authentication passwords for officer & administrator roles</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Currency Symbol
                    </label>
                    <input 
                      type="text" 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                      placeholder="BDT, $, €, £"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                      Shift Cutoff Hour (24h)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="23"
                      value={cutoffHour}
                      onChange={(e) => setCutoffHour(Number(e.target.value))}
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700/60">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mb-3">
                    Portal Login Passwords
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block mb-1.5">
                        Admin Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-purple-500/40 outline-none focus:border-purple-400"
                          placeholder="Admin Password (admin79)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-1.5">
                        Operation Officer Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={operationOfficerPassword}
                          onChange={(e) => setOperationOfficerPassword(e.target.value)}
                          className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-indigo-500/40 outline-none focus:border-indigo-400"
                          placeholder="Operation Officer Password (ops79)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block mb-1.5">
                        Sales Executive Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={salesOfficerPassword}
                          onChange={(e) => setSalesOfficerPassword(e.target.value)}
                          className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-emerald-500/40 outline-none focus:border-emerald-400"
                          placeholder="Sales Executive Password (sales79)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider block mb-1.5">
                        Maintenance Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={maintenancePassword}
                          onChange={(e) => setMaintenancePassword(e.target.value)}
                          className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-amber-500/40 outline-none focus:border-amber-400"
                          placeholder="Maintenance Password (maint)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-rose-300 uppercase tracking-wider block mb-1.5">
                        Customer Experience (CX) Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={cxPassword}
                          onChange={(e) => setCxPassword(e.target.value)}
                          className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-rose-500/40 outline-none focus:border-rose-400"
                          placeholder="CX Password (cx79)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Preview */}
              <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700/80 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block">
                  Live Custom Text Preview
                </span>
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-750 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-white">{appName || 'Tanvir Bashundhara Group'}</h4>
                      <p className="text-xs text-gray-400">{appSubtitle || 'Shift Operations & Ticketing Management'}</p>
                    </div>
                    {orgName && (
                      <span className="text-xs bg-purple-950/80 text-purple-300 border border-purple-800/80 px-2.5 py-1 rounded-lg">
                        {orgName}
                      </span>
                    )}
                  </div>
                  {announcementText && (
                    <div className="bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                      <span>{announcementText}</span>
                    </div>
                  )}
                  <div className="text-center pt-1 border-t border-gray-800/60">
                    <p className="text-[10px] text-gray-500">{devByLabel || 'Developed By'}</p>
                    <p className="text-xs font-semibold text-gray-300">{devByName || 'Mufti Mahmud Mollah'}</p>
                    <p className="text-[10px] text-gray-500">{devByTitle || 'AGM (Maintenance & SCD, FP, TFW)'}</p>
                  </div>
                </div>
              </div>

              {/* Submit Button & Feedback */}
              <div className="pt-2 space-y-3">
                {systemSavedFeedback && (
                  <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in-up">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>All system texts and settings saved and synced across the application in real-time!</span>
                  </div>
                )}
                <button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-xl shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-5 h-5" /> Save All System & Text Field Customizations
                </button>
              </div>

            </form>
          )}

          {/* --- TAB: DEVELOPER & ROLES MATRIX --- */}
          {activeTab === 'developer-roles' && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Top Banner & Add Role */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/80 p-5 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Code className="w-5 h-5 text-indigo-400" />
                    System Roles & Developer Directory
                  </h3>
                  <p className="text-xs text-gray-400">
                    Manage all operational, sales, and technical designations. Any role added here is preserved and auto-suggested when creating staff profiles.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingRole({
                      id: `role-${Date.now()}`,
                      name: '',
                      department: 'operations',
                      description: '',
                      isSystem: false
                    });
                    setRoleName('');
                    setRoleDept('operations');
                    setRoleDesc('');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add New Role / Designation
                </button>
              </div>

              {/* Developer Attribution Card */}
              <div className="bg-gradient-to-r from-gray-800 via-indigo-950/30 to-purple-950/30 p-5 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md border border-indigo-400/40 flex-shrink-0">
                    MMM
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                      {devByLabel || 'Lead Developer & Architect'}
                    </span>
                    <h4 className="text-lg font-bold text-white leading-snug">
                      {devByName || 'Mufti Mahmud Mollah'}
                    </h4>
                    <p className="text-xs text-gray-300">
                      {devByTitle || 'AGM (Maintenance & SCD, FP, TFW)'}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900/80 px-4 py-2.5 rounded-xl border border-gray-750 text-right">
                  <span className="text-[10px] text-gray-500 block">Organization</span>
                  <span className="text-xs font-bold text-purple-300">{orgName || 'Toggi Fun World'}</span>
                </div>
              </div>

              {/* Login Roles & Screen Visibility Matrix */}
              <div className="bg-gray-800/90 rounded-2xl p-5 border border-indigo-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-700">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      Login Screen Portals & Real-Time Role Visibility
                    </h4>
                    <p className="text-xs text-gray-400">
                      Enable or disable role portals on the login screen. Any changes update immediately across all connected devices.
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-700/80 px-2.5 py-1 rounded-full font-bold">
                    Multi-Device Live Sync
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: 'operator', name: 'Games & Ride Associate', desc: 'Roster & Ride Counts', dept: 'Operations', color: 'blue' },
                    { key: 'operation-officer', name: 'Operation Officer', desc: 'Operations & Roster Control', dept: 'Management', color: 'indigo' },
                    { key: 'ticket-sales', name: 'Ticket Sales', desc: 'Counter & Package Sales', dept: 'Sales', color: 'teal' },
                    { key: 'sales-officer', name: 'Sales Executive', desc: 'Sales Audits & Reports', dept: 'Sales', color: 'emerald' },
                    { key: 'maintenance', name: 'Maintenance', desc: 'Repairs & Technical Logs', dept: 'Technical', color: 'amber' },
                    { key: 'cx', name: 'Customer Experience (CX)', desc: 'Feedback & Ride Issues', dept: 'Customer Care', color: 'rose' },
                    { key: 'admin', name: 'Administrator', desc: 'Full System Master Control', dept: 'Administration', color: 'purple' },
                  ].map(portal => {
                    const isHidden = (appConfig.hiddenLoginRoles || []).includes(portal.key);
                    const isAssociatedRolePresent = currentStaffRoles.some(r => 
                      r.loginRole === portal.key || 
                      (portal.key === 'operator' && (r.id === 'role-1' || r.name.toLowerCase().includes('games') || r.name.toLowerCase().includes('operator') || r.name.toLowerCase().includes('ride associate')))
                    );
                    const isEffectivelyDisabled = isHidden || (portal.key === 'operator' && !isAssociatedRolePresent);

                    return (
                      <div 
                        key={portal.key}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          !isEffectivelyDisabled
                            ? 'bg-gray-900/90 border-gray-700 text-white'
                            : 'bg-gray-900/40 border-gray-800 text-gray-500 opacity-75'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold truncate">{portal.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 border border-gray-700">
                              {portal.dept}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{portal.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleLoginRole(portal.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                            !isEffectivelyDisabled
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/40'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {!isEffectivelyDisabled ? 'Visible' : 'Hidden'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { key: 'all', label: 'All Registered Roles', count: currentStaffRoles.length },
                  { key: 'operations', label: 'Operations & Rides', count: currentStaffRoles.filter(r => r.department === 'operations').length },
                  { key: 'sales', label: 'Sales & Counters', count: currentStaffRoles.filter(r => r.department === 'sales').length },
                  { key: 'maintenance', label: 'Maintenance & Repairs', count: currentStaffRoles.filter(r => r.department === 'maintenance').length },
                  { key: 'management', label: 'Management & Officers', count: currentStaffRoles.filter(r => r.department === 'management').length }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setRoleFilter(f.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                      roleFilter === f.key
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750 border border-gray-750'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${roleFilter === f.key ? 'bg-indigo-800 text-white' : 'bg-gray-900 text-gray-400'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Role Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(roleFilter === 'all' ? currentStaffRoles : currentStaffRoles.filter(r => r.department === roleFilter)).map(roleItem => {
                  const assignedCount = allStaffMembers.filter(s => s.role === roleItem.name).length;
                  const deptBadge = 
                    roleItem.department === 'operations' ? 'bg-blue-950/80 text-blue-300 border-blue-800' :
                    roleItem.department === 'sales' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' :
                    roleItem.department === 'maintenance' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                    'bg-purple-950/80 text-purple-300 border-purple-800';

                  return (
                    <div 
                      key={roleItem.id}
                      className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between shadow-md hover:border-gray-600 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{roleItem.name}</h4>
                            {roleItem.isSystem && (
                              <span className="text-[10px] bg-gray-900 text-gray-400 px-1.5 py-0.5 rounded border border-gray-750">
                                Default
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${deptBadge}`}>
                            {roleItem.department}
                          </span>
                        </div>

                        {roleItem.description && (
                          <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                            {roleItem.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-gray-700/60 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Staff: <strong className="text-white">{assignedCount}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRole(roleItem);
                              setRoleName(roleItem.name);
                              setRoleDept(roleItem.department);
                              setRoleDesc(roleItem.description || '');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaffRole(roleItem.id)}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Datalist for fast auto-complete across the application */}
              <datalist id="registered-staff-roles">
                {currentStaffRoles.map(r => (
                  <option key={r.id} value={r.name}>{r.department.toUpperCase()}</option>
                ))}
              </datalist>

            </div>
          )}

          {/* --- TAB: CLOUD DATABASE & PERSISTENCE --- */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Cloud Persistence Banner */}
              <div className="bg-gradient-to-r from-gray-800 via-cyan-950/30 to-blue-950/30 p-6 rounded-2xl border border-cyan-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">Permanent Firebase Firestore Cloud Persistence</h3>
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          CLOUD ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Your system state, rides, staff, attendance, and shift sales are securely stored in Google Firebase Firestore and synchronized in real-time across all devices.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloudSync}
                    disabled={cloudSyncLoading}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className={`w-4 h-4 ${cloudSyncLoading ? 'animate-spin' : ''}`} />
                    {cloudSyncLoading ? 'Syncing to Cloud...' : 'Manual Cloud Sync'}
                  </button>
                </div>

                {cloudSyncFeedback && (
                  <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-fade-in-up">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{cloudSyncFeedback}</span>
                  </div>
                )}
              </div>

              {/* 3-Month Operational Interval & Cycle Retention Hub */}
              <div className="bg-gradient-to-br from-gray-800 via-indigo-950/40 to-gray-850 p-6 rounded-2xl border border-indigo-500/40 space-y-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700/80 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 flex-shrink-0">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-white">3-Month Operational Interval & Data Retention</h4>
                        <span className="bg-indigo-900/80 text-indigo-300 border border-indigo-700/80 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          3-MONTH / 90-DAY CYCLE
                        </span>
                        {cycleStats.isDue ? (
                          <span className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            INTERVAL DUE FOR BACKUP
                          </span>
                        ) : (
                          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ACTIVE INTERVAL
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        Operational shift data is collected and retained for 3-month intervals. Take your quarterly backup at interval completion, reset elapsed operational records, and immediately begin data collection for the next 3-month interval.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const stats = database.getCycleStats(appConfig.cycleStartDate, 3);
                        handleExportDatabase(`TFW_Quarterly_Backup_3Months_${stats.cycleStartDate}_to_${stats.cycleEndDate}.json`);
                      }}
                      disabled={exportLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {exportLoading ? 'Exporting...' : 'Quick Cycle Backup'}
                    </button>
                  </div>
                </div>

                {/* Progress bar for 3-month cycle */}
                <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Current Cycle Timeline: <strong className="text-white">{cycleStats.cycleStartDate}</strong> to <strong className="text-white">{cycleStats.cycleEndDate}</strong>
                    </span>
                    <span className="text-indigo-300 font-bold">
                      {Math.min(100, Math.round((cycleStats.daysElapsed / cycleStats.totalCycleDays) * 100))}% Elapsed ({cycleStats.daysElapsed} / {cycleStats.totalCycleDays} Days)
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700/60">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        cycleStats.isDue ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (cycleStats.daysElapsed / cycleStats.totalCycleDays) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 pt-0.5">
                    <span>Cycle Started: {cycleStats.cycleStartDate}</span>
                    <span className={cycleStats.isDue ? 'text-amber-400 font-semibold' : 'text-cyan-400 font-semibold'}>
                      {cycleStats.daysRemaining > 0 ? `${cycleStats.daysRemaining} days remaining in this 3-month window` : '3-Month interval elapsed (Backup & Reset recommended)'}
                    </span>
                    <span>Cycle Ends: {cycleStats.cycleEndDate}</span>
                  </div>
                </div>

                {/* Cycle Data Volume Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/70">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Operating Days</span>
                    <span className="text-xl font-extrabold text-indigo-400 mt-1 block">{cycleStats.operatingDaysCount} Days</span>
                    <span className="text-[10px] text-gray-500">{cycleStats.oldestDate} to {cycleStats.newestDate}</span>
                  </div>

                  <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/70">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Ride Counts Stored</span>
                    <span className="text-xl font-extrabold text-blue-400 mt-1 block">{cycleStats.totalCounts.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500">Across all park attractions</span>
                  </div>

                  <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/70">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Counter Sales</span>
                    <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{currency} {cycleStats.totalSales.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500">Shift sales records</span>
                  </div>

                  <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/70">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Last Backup Taken</span>
                    <span className="text-xs font-bold text-purple-300 mt-1.5 block truncate">
                      {cycleStats.lastBackupDate ? new Date(cycleStats.lastBackupDate).toLocaleDateString() : 'Pending Backup'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {cycleStats.lastBackupDate ? new Date(cycleStats.lastBackupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Take backup before reset'}
                    </span>
                  </div>
                </div>

                {/* Adjust Cycle Anchor Date (Optional Settings) */}
                <div className="bg-gray-900/40 p-3.5 rounded-xl border border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="text-gray-300">
                    <span className="font-semibold text-white">Adjust Cycle Start Anchor Date:</span>
                    <p className="text-[11px] text-gray-400">Set the baseline anchor date for your 3-month calculation if starting a customized financial or operational quarter.</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input 
                      type="date"
                      value={customCycleStart || cycleStats.cycleStartDate}
                      onChange={(e) => setCustomCycleStart(e.target.value)}
                      className="bg-gray-900 text-white rounded-lg px-2.5 py-1.5 text-xs border border-gray-700 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCycleStart) {
                          const startDateObj = new Date(customCycleStart);
                          const endDateObj = new Date(startDateObj);
                          endDateObj.setMonth(endDateObj.getMonth() + 3);
                          const newCycleEndDate = endDateObj.toISOString().split('T')[0];
                          onSaveAppConfig({
                            cycleStartDate: customCycleStart,
                            cycleEndDate: newCycleEndDate,
                            cycleIntervalMonths: 3
                          });
                          refreshCycleStats();
                        }
                      }}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg font-bold border border-gray-600 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Update Anchor
                    </button>
                  </div>
                </div>

              </div>

              {/* Data Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Rides & Attractions</span>
                  <span className="text-2xl font-extrabold text-blue-400 mt-1 block">{rides.length}</span>
                  <span className="text-[11px] text-gray-500">Master entity catalog</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Staff & Associates</span>
                  <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">{operators.length + ticketSalesPersonnel.length + maintenancePersonnel.length + cxPersonnel.length}</span>
                  <span className="text-[11px] text-gray-500">Permanent staff roster</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Sales Counters</span>
                  <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{counters.length}</span>
                  <span className="text-[11px] text-gray-500">POS Stations</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Ticket Packages</span>
                  <span className="text-2xl font-extrabold text-purple-400 mt-1 block">{packages.length}</span>
                  <span className="text-[11px] text-gray-500">Available offerings</span>
                </div>
              </div>

              {/* SECTION: 3-Month Interval Cycle Reset & Archive (Primary Reset Workflow) */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-indigo-700/50 space-y-4 shadow-lg">
                <div className="flex items-start gap-3 border-b border-gray-700 pb-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Quarterly 3-Month Cycle Reset & Archive (Start Next 3-Month Interval)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Executes a 1-click end-of-interval archive: Automatically generates and downloads a full JSON backup of the completed 3-month operational records (counts, sales, and attendance), purges the past operational logs, and cleanly initializes your new 3-month data collection interval. Master park rosters, staff, rides, counters, and admin logins are 100% preserved.
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-800/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-indigo-300 block mb-1">
                      Start Date for Next 3-Month Data Collection Cycle
                    </label>
                    <input 
                      type="date"
                      value={nextCycleStartDate}
                      onChange={(e) => setNextCycleStartDate(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-2.5 text-xs border border-indigo-700/60 outline-none focus:border-indigo-400"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Past operational days before this date will be archived in the downloaded backup. The next 3-month interval will run from <strong className="text-white">{nextCycleStartDate}</strong>.
                    </span>
                  </div>

                  <div className="md:self-end">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Complete 3-Month Cycle & Start Next Interval',
                          message: `This will:\n1. Download a complete JSON backup archive of the past 3-month dataset.\n2. Archive operational day logs (counts, sales, attendance) prior to ${nextCycleStartDate}.\n3. Initialize the next 3-month interval (${nextCycleStartDate} onward).\n\nPark setup, staff, rides, and counters will be completely preserved. Proceed?`,
                          confirmLabel: 'Backup & Start Next Cycle',
                          confirmVariant: 'primary',
                          onConfirm: handleQuarterlyBackupAndReset
                        });
                      }}
                      disabled={quarterlyResetLoading || !nextCycleStartDate}
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      {quarterlyResetLoading ? 'Archiving & Initializing...' : 'Download 3-Month Backup & Start Next Cycle'}
                    </button>
                  </div>
                </div>

                {quarterlyResetFeedback && (
                  <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-fade-in-up">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{quarterlyResetFeedback}</span>
                  </div>
                )}
              </div>

              {/* SECTION: Rolling 3-Month Clean-Up (Purge Data Older than 90 Days) */}
              <div className="bg-gray-800 p-5 rounded-2xl border border-amber-900/40 space-y-4">
                <div className="flex items-start gap-3 border-b border-gray-700 pb-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Rolling Clean-Up: Purge Records Older Than 3 Months</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Automatically purges historic shift counts and sales older than 90 days, keeping exactly the latest 3-month window in active storage. A safety backup JSON file is downloaded automatically before cleaning.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">
                      Cutoff Date (Operational records strictly before this date will be purged)
                    </label>
                    <input 
                      type="date"
                      value={olderThanCutoff}
                      onChange={(e) => setOlderThanCutoff(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-2.5 text-xs border border-gray-700 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:self-end">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Purge Records Older than 3 Months',
                          message: `Are you sure you want to clean all operational counts, sales, and attendance dated before ${olderThanCutoff}? A safety JSON backup will be downloaded to your computer before purging.`,
                          confirmLabel: 'Backup & Clean Older Records',
                          confirmVariant: 'warning',
                          onConfirm: handleCleanOlderThanCutoff
                        });
                      }}
                      disabled={olderThanLoading || !olderThanCutoff}
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/40 whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" />
                      {olderThanLoading ? 'Cleaning...' : `Backup & Clean Data Older Than ${olderThanCutoff}`}
                    </button>
                  </div>
                </div>

                {olderThanFeedback && (
                  <div className="bg-amber-950/80 border border-amber-700 text-amber-300 p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-fade-in-up">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{olderThanFeedback}</span>
                  </div>
                )}
              </div>

              {/* SECTION: Single Day Reset Section */}
              <div className="bg-gray-800 p-5 rounded-2xl border border-red-900/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-700 pb-3">
                  <RotateCcw className="w-5 h-5 text-red-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Specific Operational Day Reset / Clean-Up</h4>
                    <p className="text-xs text-gray-400">Reset attendance, counter sales, and ride counts for a specific test date or individual operational day without affecting overall system configuration.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">Select Single Date to Reset</label>
                    <input 
                      type="date"
                      value={resetDayInput}
                      onChange={(e) => setResetDayInput(e.target.value)}
                      className="w-full bg-gray-900 text-white rounded-xl p-2.5 text-xs border border-gray-700 outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="sm:self-end">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Reset Single Operational Day Data',
                          message: `Are you sure you want to completely clear ride counts, counter sales, and attendance for ${resetDayInput}? This action cannot be undone.`,
                          confirmLabel: 'Yes, Reset Day',
                          confirmVariant: 'danger',
                          onConfirm: handleResetDayData
                        });
                      }}
                      disabled={resetDayLoading || !resetDayInput}
                      className="w-full sm:w-auto bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                      {resetDayLoading ? 'Resetting...' : `Reset Data for ${resetDayInput}`}
                    </button>
                  </div>
                </div>

                {resetDayFeedback && (
                  <div className="bg-gray-900 border border-gray-700 text-xs p-2.5 rounded-lg text-amber-300">
                    {resetDayFeedback}
                  </div>
                )}
              </div>

              {/* SECTION: Offline Full Database Export & Restore */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Download Backup */}
                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Download className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">Full Database JSON Export</h4>
                    </div>
                    <p className="text-xs text-gray-400">
                      Download a complete portable snapshot of your entire database (configurations, staff, ride counts, sales history, and maintenance tickets).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportDatabase()}
                    disabled={exportLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {exportLoading ? 'Exporting JSON...' : 'Export Full Database (.json)'}
                  </button>
                </div>

                {/* Restore Backup */}
                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Upload className="w-5 h-5 text-purple-400" />
                      <h4 className="text-sm font-bold text-white">Restore Database from JSON Backup</h4>
                    </div>
                    <p className="text-xs text-gray-400">
                      Upload and restore a previously downloaded JSON backup file. This will update the local database and synchronize with Firestore cloud.
                    </p>
                  </div>

                  <div>
                    <input 
                      type="file" 
                      ref={restoreFileInputRef}
                      onChange={handleRestoreDatabase}
                      accept=".json,application/json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => restoreFileInputRef.current?.click()}
                      disabled={restoreLoading}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-950/40 transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      {restoreLoading ? 'Restoring Database...' : 'Upload & Restore Backup (.json)'}
                    </button>
                  </div>

                  {restoreFeedback && (
                    <div className="bg-gray-900 border border-gray-700 text-xs p-2.5 rounded-lg text-gray-300">
                      {restoreFeedback}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* --- EDIT RIDE MODAL --- */}
      {editingRide && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white">{editingRide.id && rides.some(r => r.id === editingRide.id) ? 'Edit Ride Details' : 'Add New Ride'}</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ride Name</label>
              <input 
                type="text" 
                value={editingRide.name || ''} 
                onChange={e => setEditingRide({ ...editingRide, name: e.target.value })}
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none focus:border-blue-500"
                placeholder="e.g. Roller Coaster"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Floor / Zone</label>
                <select 
                  value={editingRide.floor || floors[0]} 
                  onChange={e => setEditingRide({ ...editingRide, floor: e.target.value })}
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                >
                  {floors.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Capacity (Guests)</label>
                <input 
                  type="number" 
                  value={editingRide.capacity !== undefined && editingRide.capacity !== null ? editingRide.capacity : ''} 
                  onChange={e => setEditingRide({ ...editingRide, capacity: e.target.value === '' ? undefined : Number(e.target.value) })}
                  placeholder="Optional capacity"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Operating Status</label>
                <select 
                  value={editingRide.status || 'active'} 
                  onChange={e => setEditingRide({ ...editingRide, status: e.target.value as any })}
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Min Height Requirement</label>
                <input 
                  type="text" 
                  value={editingRide.minHeight || ''} 
                  onChange={e => setEditingRide({ ...editingRide, minHeight: e.target.value })}
                  placeholder="e.g. 120 cm"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            {/* Ride Image Section */}
            <div className="space-y-2 bg-gray-900/40 p-3 rounded-xl border border-gray-700/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Ride Picture
                </label>
                {editingRide.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingRide({ ...editingRide, imageUrl: '' })}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Photo
                  </button>
                )}
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between bg-gray-900 p-1 rounded-lg border border-gray-700">
                <button
                  type="button"
                  onClick={() => setRideImageMode('upload')}
                  className={`flex-1 py-1 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rideImageMode === 'upload' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload from Device
                </button>
                <button
                  type="button"
                  onClick={() => setRideImageMode('url')}
                  className={`flex-1 py-1 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rideImageMode === 'url' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" /> Link / URL
                </button>
              </div>

              {rideImageMode === 'upload' ? (
                <div>
                  <input 
                    ref={rideFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleRideImageFile(f);
                    }}
                    className="hidden"
                  />
                  <div
                    onClick={() => rideFileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-3.5 text-center cursor-pointer bg-gray-900/60 hover:bg-gray-900 transition-all flex flex-col items-center justify-center"
                  >
                    <Upload className="w-5 h-5 text-blue-400 mb-1" />
                    <p className="text-xs font-medium text-white">Click to browse or drop picture</p>
                    <p className="text-[10px] text-gray-400">PNG, JPG, JPEG, WEBP</p>
                  </div>
                </div>
              ) : (
                <input 
                  type="text" 
                  value={editingRide.imageUrl || ''} 
                  onChange={e => setEditingRide({ ...editingRide, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none text-xs"
                />
              )}

              {/* Mini Preview */}
              {editingRide.imageUrl && (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-700 bg-gray-900 mt-2">
                  <img 
                    src={editingRide.imageUrl} 
                    alt="Ride preview" 
                    className="w-full h-full object-cover"
                  />
                  {rideImageProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setEditingRide(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (editingRide.name?.trim()) {
                    onSaveRide(editingRide as Ride);
                    setEditingRide(null);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold"
              >
                Save Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT COUNTER MODAL --- */}
      {editingCounter && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white">{editingCounter.id && counters.some(c => c.id === editingCounter.id) ? 'Edit Counter' : 'Add New Counter'}</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Counter Name</label>
              <input 
                type="text" 
                value={editingCounter.name || ''} 
                onChange={e => setEditingCounter({ ...editingCounter, name: e.target.value })}
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                placeholder="e.g. Main Entrance Counter"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <select 
                  value={editingCounter.type || 'General'} 
                  onChange={e => setEditingCounter({ ...editingCounter, type: e.target.value })}
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                >
                  <option value="General">General</option>
                  <option value="VIP">VIP</option>
                  <option value="Online">Online Pickup</option>
                  <option value="Express">Express</option>
                  <option value="Cash">Cash Only</option>
                  <option value="Card">Card Only</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Location</label>
                <input 
                  type="text" 
                  value={editingCounter.location || ''} 
                  onChange={e => setEditingCounter({ ...editingCounter, location: e.target.value })}
                  placeholder="e.g. L1 Gate"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="counterActive"
                checked={editingCounter.active !== false} 
                onChange={e => setEditingCounter({ ...editingCounter, active: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 bg-gray-900 border-gray-600"
              />
              <label htmlFor="counterActive" className="text-sm text-gray-300">Counter is Active</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingCounter(null)} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Cancel</button>
              <button 
                onClick={() => {
                  if (editingCounter.name?.trim()) {
                    onSaveCounter(editingCounter as Counter);
                    setEditingCounter(null);
                  }
                }}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl font-bold"
              >
                Save Counter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT OPERATOR MODAL --- */}
      {editingOperator && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white">Games & Ride Associate Profile</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Full Name</label>
              <input 
                type="text" 
                value={editingOperator.name || ''} 
                onChange={e => setEditingOperator({ ...editingOperator, name: e.target.value })}
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Designation / Role</label>
                <input 
                  type="text" 
                  list="registered-staff-roles"
                  value={editingOperator.role || ''} 
                  onChange={e => setEditingOperator({ ...editingOperator, role: e.target.value })}
                  placeholder="e.g. Senior Games & Ride Associate"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editingOperator.phone || ''} 
                  onChange={e => setEditingOperator({ ...editingOperator, phone: e.target.value })}
                  placeholder="017..."
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="opActive"
                checked={editingOperator.active !== false} 
                onChange={e => setEditingOperator({ ...editingOperator, active: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-gray-900 border-gray-600"
              />
              <label htmlFor="opActive" className="text-sm text-gray-300">Active Employee</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingOperator(null)} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Cancel</button>
              <button 
                onClick={() => {
                  if (editingOperator.name?.trim()) {
                    onSaveOperator(editingOperator as Operator);
                    setEditingOperator(null);
                  }
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold"
              >
                Save Associate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT SALES STAFF MODAL --- */}
      {editingSalesStaff && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white">Sales Personnel Profile</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Full Name</label>
              <input 
                type="text" 
                value={editingSalesStaff.name || ''} 
                onChange={e => setEditingSalesStaff({ ...editingSalesStaff, name: e.target.value })}
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Designation</label>
                <input 
                  type="text" 
                  list="registered-staff-roles"
                  value={editingSalesStaff.role || ''} 
                  onChange={e => setEditingSalesStaff({ ...editingSalesStaff, role: e.target.value })}
                  placeholder="e.g. Ticket Sales"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editingSalesStaff.phone || ''} 
                  onChange={e => setEditingSalesStaff({ ...editingSalesStaff, phone: e.target.value })}
                  placeholder="018..."
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingSalesStaff(null)} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Cancel</button>
              <button 
                onClick={() => {
                  if (editingSalesStaff.name?.trim()) {
                    onSaveTicketSalesPersonnel(editingSalesStaff as Operator);
                    setEditingSalesStaff(null);
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold"
              >
                Save Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MAINTENANCE MODAL --- */}
      {editingMaintenance && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white">Technician Profile</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Full Name</label>
              <input 
                type="text" 
                value={editingMaintenance.name || ''} 
                onChange={e => setEditingMaintenance({ ...editingMaintenance, name: e.target.value })}
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Specialty / Role</label>
                <input 
                  type="text" 
                  list="registered-staff-roles"
                  value={editingMaintenance.role || ''} 
                  onChange={e => setEditingMaintenance({ ...editingMaintenance, role: e.target.value })}
                  placeholder="e.g. Electrical / Mechanical"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editingMaintenance.phone || ''} 
                  onChange={e => setEditingMaintenance({ ...editingMaintenance, phone: e.target.value })}
                  placeholder="019..."
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingMaintenance(null)} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Cancel</button>
              <button 
                onClick={() => {
                  if (editingMaintenance.name?.trim()) {
                    onSaveMaintenancePersonnel(editingMaintenance as Operator);
                    setEditingMaintenance(null);
                  }
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl font-bold"
              >
                Save Technician
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT CX STAFF MODAL --- */}
      {editingCxStaff && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-white">Customer Experience (CX) Profile</h3>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Full Name</label>
              <input 
                type="text" 
                value={editingCxStaff.name || ''} 
                onChange={e => setEditingCxStaff({ ...editingCxStaff, name: e.target.value })}
                placeholder="e.g. Aysha Rahman"
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Designation / Role</label>
                <input 
                  type="text" 
                  list="registered-staff-roles"
                  value={editingCxStaff.role || ''} 
                  onChange={e => setEditingCxStaff({ ...editingCxStaff, role: e.target.value })}
                  placeholder="e.g. CX Lead / Specialist"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editingCxStaff.phone || ''} 
                  onChange={e => setEditingCxStaff({ ...editingCxStaff, phone: e.target.value })}
                  placeholder="017..."
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="cxActive"
                checked={editingCxStaff.active !== false} 
                onChange={e => setEditingCxStaff({ ...editingCxStaff, active: e.target.checked })}
                className="w-4 h-4 rounded text-rose-600 bg-gray-900 border-gray-600"
              />
              <label htmlFor="cxActive" className="text-sm text-gray-300">Active Employee</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingCxStaff(null)} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Cancel</button>
              <button 
                onClick={() => {
                  if (editingCxStaff.name?.trim()) {
                    onSaveCxPersonnel(editingCxStaff as Operator);
                    setEditingCxStaff(null);
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Save CX Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PACKAGE MODAL --- */}
      {editingPackage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white">Ticket Package & Pricing</h3>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">Package Name</label>
              <input 
                type="text" 
                value={editingPackage.name || ''} 
                onChange={e => setEditingPackage({ ...editingPackage, name: e.target.value })}
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                placeholder="e.g. VIP All-Access Pass"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Price ({currency})</label>
                <input 
                  type="number" 
                  value={editingPackage.price !== undefined ? editingPackage.price : 500} 
                  onChange={e => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })}
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category</label>
                <input 
                  type="text" 
                  value={editingPackage.category || ''} 
                  onChange={e => setEditingPackage({ ...editingPackage, category: e.target.value })}
                  placeholder="e.g. Standard, VIP, Group"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Description (Optional)</label>
              <input 
                type="text" 
                value={editingPackage.description || ''} 
                onChange={e => setEditingPackage({ ...editingPackage, description: e.target.value })}
                placeholder="Details about rides included..."
                className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingPackage(null)} className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl">Cancel</button>
              <button 
                onClick={() => {
                  if (editingPackage.name?.trim()) {
                    onSavePackage(editingPackage as PackageItem);
                    setEditingPackage(null);
                  }
                }}
                className="flex-1 bg-pink-600 hover:bg-pink-500 text-white py-2.5 rounded-xl font-bold"
              >
                Save Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT ROLE MODAL --- */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" />
              {currentStaffRoles.some(r => r.id === editingRole.id) ? 'Edit Designation / Role' : 'Create New Role'}
            </h3>
            
            <form onSubmit={handleSaveStaffRole} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Role Title / Designation</label>
                <input 
                  type="text" 
                  required
                  value={roleName} 
                  onChange={e => setRoleName(e.target.value)}
                  placeholder="e.g. Senior Ride Attendant"
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none focus:border-indigo-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Department</label>
                <select
                  value={roleDept}
                  onChange={e => setRoleDept(e.target.value as any)}
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none text-sm"
                >
                  <option value="operations">Operations & Rides</option>
                  <option value="sales">Sales & Ticketing</option>
                  <option value="maintenance">Maintenance & Engineering</option>
                  <option value="management">Management & Officers</option>
                  <option value="general">General Staff</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Description / Responsibility (Optional)</label>
                <textarea 
                  value={roleDesc}
                  onChange={e => setRoleDesc(e.target.value)}
                  placeholder="Briefly describe key duties or qualifications..."
                  rows={3}
                  className="w-full bg-gray-900 text-white rounded-lg p-2.5 border border-gray-600 outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingRole(null)} 
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-950/40 cursor-pointer"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel/CSV Import Modal */}
      {showBulkImportModal && (
        <BulkImportModal
          isOpen={showBulkImportModal}
          initialEntity={bulkImportEntity}
          existingRides={rides}
          existingCounters={counters}
          existingOperators={operators}
          existingSalesPersonnel={ticketSalesPersonnel}
          existingMaintenancePersonnel={maintenancePersonnel}
          existingCxPersonnel={cxPersonnel}
          existingFloors={floors}
          onClose={() => setShowBulkImportModal(false)}
          onImport={(data) => {
            if (onBulkImport) {
              onBulkImport(data);
            }
            setShowBulkImportModal(false);
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={() => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          confirmDialog.onConfirm();
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

const TabButton = ({ 
  label, 
  active, 
  onClick, 
  icon, 
  count 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  count?: number; 
}) => (
  <button 
    onClick={onClick}
    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' 
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
    }`}
  >
    {icon}
    <span>{label}</span>
    {count !== undefined && (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-400'}`}>
        {count}
      </span>
    )}
  </button>
);
