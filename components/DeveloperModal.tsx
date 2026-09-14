import React, { useState, useMemo } from 'react';
import { AppConfig, StaffRoleDefinition, Operator, Ride, Counter } from '../types';
import { DEFAULT_STAFF_ROLES } from '../constants';
import { ConfirmModal } from './ConfirmModal';
import { 
  Code, 
  Shield, 
  Sparkles, 
  Layers, 
  Users, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Activity, 
  Database, 
  Check, 
  X, 
  Wrench, 
  Ticket, 
  UserCheck
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appConfig: AppConfig;
  operators: Operator[];
  ticketSalesPersonnel: Operator[];
  maintenancePersonnel: Operator[];
  rides: Ride[];
  counters: Counter[];
  connectionStatus: string;
  onSaveAppConfig: (config: AppConfig) => void;
  isAdmin: boolean;
}

export const DeveloperModal: React.FC<Props> = ({
  isOpen,
  onClose,
  appConfig,
  operators,
  ticketSalesPersonnel,
  maintenancePersonnel,
  rides,
  counters,
  connectionStatus,
  onSaveAppConfig,
  isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'edit-dev'>('roles');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  
  // Custom role add/edit state
  const [editingRole, setEditingRole] = useState<StaffRoleDefinition | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDept, setRoleDept] = useState<'operations' | 'sales' | 'maintenance' | 'management' | 'general'>('operations');
  const [roleDesc, setRoleDesc] = useState('');

  // Dev settings edit state
  const [devByLabel, setDevByLabel] = useState(appConfig.devByLabel || 'Developed By');
  const [devByName, setDevByName] = useState(appConfig.devByName || 'Mufti Mahmud Mollah');
  const [devByTitle, setDevByTitle] = useState(appConfig.devByTitle || 'AGM (Maintenance & SCD, FP, TFW)');
  const [orgName, setOrgName] = useState(appConfig.orgName || 'Toggi Fun World');
  const [savedFeedback, setSavedFeedback] = useState(false);

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

  // Sync state if appConfig changes
  React.useEffect(() => {
    setDevByLabel(appConfig.devByLabel || 'Developed By');
    setDevByName(appConfig.devByName || 'Mufti Mahmud Mollah');
    setDevByTitle(appConfig.devByTitle || 'AGM (Maintenance & SCD, FP, TFW)');
    setOrgName(appConfig.orgName || 'Toggi Fun World');
  }, [appConfig]);

  if (!isOpen) return null;

  const currentRoles: StaffRoleDefinition[] = useMemo(() => {
    if (appConfig.roles && appConfig.roles.length > 0) {
      return appConfig.roles;
    }
    return DEFAULT_STAFF_ROLES;
  }, [appConfig.roles]);

  // Calculate staff count per role
  const allStaff = [...operators, ...ticketSalesPersonnel, ...maintenancePersonnel];
  const roleStaffCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    allStaff.forEach(staff => {
      const r = staff.role || 'Unassigned';
      map[r] = (map[r] || 0) + 1;
    });
    return map;
  }, [allStaff]);

  const filteredRoles = useMemo(() => {
    if (selectedDeptFilter === 'all') return currentRoles;
    return currentRoles.filter(r => r.department === selectedDeptFilter);
  }, [currentRoles, selectedDeptFilter]);

  const handleOpenAddRole = () => {
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
  };

  const handleOpenEditRole = (r: StaffRoleDefinition) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDept(r.department);
    setRoleDesc(r.description || '');
  };

  const handleSaveRole = (e: React.FormEvent) => {
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
    const exists = currentRoles.some(r => r.id === newRole.id);
    if (exists) {
      updatedRoles = currentRoles.map(r => r.id === newRole.id ? newRole : r);
    } else {
      updatedRoles = [...currentRoles, newRole];
    }

    onSaveAppConfig({
      ...appConfig,
      roles: updatedRoles
    });

    setEditingRole(null);
  };

  const handleDeleteRole = (roleId: string) => {
    const roleToDelete = currentRoles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Staff Role',
      message: roleToDelete.isSystem 
        ? `"${roleToDelete.name}" is a default system role. Are you sure you want to delete it?`
        : `Delete role "${roleToDelete.name}"?`,
      confirmLabel: 'Delete Role',
      confirmVariant: 'danger',
      onConfirm: () => {
        const updatedRoles = currentRoles.filter(r => r.id !== roleId);
        onSaveAppConfig({
          ...appConfig,
          roles: updatedRoles
        });
      }
    });
  };

  const handleSaveDevConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAppConfig({
      ...appConfig,
      devByLabel,
      devByName,
      devByTitle,
      orgName
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const formattedTimestamp = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-3 sm:p-5 backdrop-blur-md animate-fade-in-up">
      <div className="bg-gray-850 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-700/80 flex justify-between items-center bg-gray-900/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-950/40 border border-purple-400/30">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Developer & System Roles Console
              </h2>
              <p className="text-xs text-gray-400">
                System architecture, developer profile, and staff role directory
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-gray-800 bg-gray-900/40 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Roles & Designations</span>
            <span className="text-[10px] bg-purple-900/60 px-1.5 py-0.5 rounded-full text-purple-200">
              {currentRoles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Developer Profile & Diagnostics</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('edit-dev')}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'edit-dev'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Developer Attribution</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-6 custom-scrollbar">
          
          {/* TAB: ROLES & DESIGNATIONS */}
          {activeTab === 'roles' && (
            <div className="space-y-5 animate-fade-in-up">
              
              {/* Top Banner & Add Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-800/80 p-4 rounded-xl border border-gray-700/80">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" /> System Staff Roles Matrix
                  </h3>
                  <p className="text-xs text-gray-400">
                    Roles registered here are automatically available in Games & Ride Associate, Sales Staff, and Technician rosters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddRole}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-950/40 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Role
                </button>
              </div>

              {/* Department Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { key: 'all', label: 'All Roles', count: currentRoles.length },
                  { key: 'operations', label: 'Operations', count: currentRoles.filter(r => r.department === 'operations').length },
                  { key: 'sales', label: 'Sales & Cashiers', count: currentRoles.filter(r => r.department === 'sales').length },
                  { key: 'maintenance', label: 'Maintenance & Tech', count: currentRoles.filter(r => r.department === 'maintenance').length },
                  { key: 'management', label: 'Management & Officers', count: currentRoles.filter(r => r.department === 'management').length }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setSelectedDeptFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedDeptFilter === f.key
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750 border border-gray-700/60'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedDeptFilter === f.key ? 'bg-purple-800' : 'bg-gray-900 text-gray-400'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Role Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredRoles.map(roleItem => {
                  const assignedCount = roleStaffCountMap[roleItem.name] || 0;
                  const deptBadgeColor = 
                    roleItem.department === 'operations' ? 'bg-blue-950/80 text-blue-300 border-blue-800/80' :
                    roleItem.department === 'sales' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' :
                    roleItem.department === 'maintenance' ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' :
                    'bg-purple-950/80 text-purple-300 border-purple-800/80';

                  return (
                    <div 
                      key={roleItem.id} 
                      className="bg-gray-800 rounded-xl p-4 border border-gray-700/80 flex flex-col justify-between shadow-md hover:border-gray-600 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{roleItem.name}</h4>
                            {roleItem.isSystem && (
                              <span className="text-[10px] bg-gray-900 text-gray-400 px-1.5 py-0.5 rounded border border-gray-750">
                                System
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${deptBadgeColor}`}>
                            {roleItem.department}
                          </span>
                        </div>

                        {roleItem.description && (
                          <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                            {roleItem.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-gray-700/50 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>Active Staff: <strong className="text-white">{assignedCount}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRole(roleItem)}
                            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(roleItem.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/40 p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
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

              {filteredRoles.length === 0 && (
                <div className="text-center py-10 bg-gray-800/40 rounded-xl border border-gray-700/60 text-gray-400 text-sm">
                  No roles found for this department. Click "Add New Role" to register one.
                </div>
              )}

            </div>
          )}

          {/* TAB: DEVELOPER PROFILE & SYSTEM DIAGNOSTICS */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Developer Profile Card */}
              <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <Code className="w-32 h-32 text-indigo-400" />
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-indigo-950/50 border border-indigo-400/30 flex-shrink-0">
                    MMM
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-0.5">
                      {appConfig.devByLabel || 'Lead System Developer & Architect'}
                    </span>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {appConfig.devByName || 'Mufti Mahmud Mollah'}
                    </h3>
                    <p className="text-sm text-gray-300 font-medium mt-0.5">
                      {appConfig.devByTitle || 'AGM (Maintenance & SCD, FP, TFW)'}
                    </p>
                    <p className="text-xs text-purple-400 font-semibold mt-1">
                      {appConfig.orgName || 'Toggi Fun World'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time System Diagnostics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80 shadow-md">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
                    <Activity className="w-4 h-4" /> Live Sync Engine
                  </div>
                  <p className="text-lg font-bold text-white flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {connectionStatus === 'connected' ? 'Live Synced (0ms Lag)' : 'Offline (Auto-Replay)'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">SSE Multi-Device Broadcast</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80 shadow-md">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase mb-1">
                    <Database className="w-4 h-4" /> Server State
                  </div>
                  <p className="text-lg font-bold text-white">
                    Persistent JSON Storage
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Total Registered Roles: <strong className="text-purple-300">{currentRoles.length}</strong>
                  </p>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/80 shadow-md">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase mb-1">
                    <Clock className="w-4 h-4" /> Last Updated
                  </div>
                  <p className="text-sm font-bold text-white truncate" title={formattedTimestamp}>
                    {formattedTimestamp}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">Always persistent on server & client</p>
                </div>

              </div>

              {/* Entity Inventory Summary */}
              <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-700/80">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                  Park Operations Inventory & Roster Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-750 text-center">
                    <p className="text-xs text-gray-400">Rides</p>
                    <p className="text-xl font-bold text-blue-400">{rides.length}</p>
                  </div>
                  <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-750 text-center">
                    <p className="text-xs text-gray-400">Counters</p>
                    <p className="text-xl font-bold text-teal-400">{counters.length}</p>
                  </div>
                  <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-750 text-center">
                    <p className="text-xs text-gray-400">Games & Ride Associates</p>
                    <p className="text-xl font-bold text-indigo-400">{operators.length}</p>
                  </div>
                  <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-750 text-center">
                    <p className="text-xs text-gray-400">Sales Staff</p>
                    <p className="text-xl font-bold text-emerald-400">{ticketSalesPersonnel.length}</p>
                  </div>
                  <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-750 text-center">
                    <p className="text-xs text-gray-400">Technicians</p>
                    <p className="text-xl font-bold text-amber-400">{maintenancePersonnel.length}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: EDIT DEVELOPER ATTRIBUTION (ADMIN ONLY) */}
          {activeTab === 'edit-dev' && isAdmin && (
            <form onSubmit={handleSaveDevConfig} className="space-y-5 animate-fade-in-up">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" /> Modify Developer & Credit Attributions
                </h3>
                <p className="text-xs text-gray-400">
                  Updates saved here will automatically sync across all clients, footers, headers, and reports in real-time.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Attribution Label</label>
                    <input 
                      type="text"
                      value={devByLabel}
                      onChange={e => setDevByLabel(e.target.value)}
                      placeholder="Developed By"
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Developer / Author Name</label>
                    <input 
                      type="text"
                      value={devByName}
                      onChange={e => setDevByName(e.target.value)}
                      placeholder="Mufti Mahmud Mollah"
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Designation / Department</label>
                    <input 
                      type="text"
                      value={devByTitle}
                      onChange={e => setDevByTitle(e.target.value)}
                      placeholder="AGM (Maintenance & SCD, FP, TFW)"
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Theme Park / Company Name</label>
                    <input 
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder="Toggi Fun World"
                      className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {savedFeedback && (
                  <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in-up">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Developer credits saved and synced across all devices!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Developer Attribution Changes
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-300">{appConfig.appName || 'Tanvir Bashundhara Group'}</span>
            <span>•</span>
            <span className="text-gray-500">Version 4.0 Live</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

      {/* --- ADD / EDIT ROLE SUB-MODAL --- */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4">
          <form onSubmit={handleSaveRole} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md space-y-4 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center border-b border-gray-700/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                {currentRoles.some(r => r.id === editingRole.id) ? 'Edit Staff Role' : 'Register New Staff Role'}
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingRole(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Role / Designation Title *</label>
              <input 
                type="text" 
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                placeholder="e.g. Senior Games & Ride Associate, Floor Supervisor, Ticket Sales"
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-600 outline-none focus:border-purple-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Department / Branch</label>
              <select 
                value={roleDept}
                onChange={e => setRoleDept(e.target.value as any)}
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-600 outline-none focus:border-purple-500"
              >
                <option value="operations">Operations (Rides & Floors)</option>
                <option value="sales">Sales (Ticket Counters & Cashiers)</option>
                <option value="maintenance">Maintenance (Technicians & Engineers)</option>
                <option value="management">Management & Duty Officers</option>
                <option value="general">General Park Staff</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Role Description / Scope (Optional)</label>
              <textarea 
                value={roleDesc}
                onChange={e => setRoleDesc(e.target.value)}
                placeholder="Brief summary of duties and responsibilities..."
                rows={3}
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setEditingRole(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-purple-950/40"
              >
                Save Role
              </button>
            </div>
          </form>
        </div>
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
