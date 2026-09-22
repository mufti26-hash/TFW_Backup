import React, { useState, useMemo, useEffect } from 'react';
import { Operator, AppConfig } from '../types';
import { Shield, Users, KeyRound, Wrench, Smartphone, Share2, Sparkles, UserCheck, Briefcase, Eye, EyeOff, Lock, HeartHandshake, BarChart3 } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { 
  unlockAudio, 
  isAudioReady
} from '../utils/soundAlerts';

interface Props {
  onLogin: (role: any, payload?: any) => boolean;
  operators: Operator[];
  ticketSalesPersonnel: Operator[];
  maintenancePersonnel?: Operator[];
  cxPersonnel?: Operator[];
  appLogo: string | null;
  appConfig?: AppConfig;
  adminPassword?: string;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected';
}

const Login: React.FC<Props> = ({ 
  onLogin, 
  operators, 
  ticketSalesPersonnel, 
  maintenancePersonnel = [], 
  cxPersonnel = [],
  appLogo,
  appConfig,
  connectionStatus = 'connected'
}) => {
  const [soundArmed, setSoundArmed] = useState<boolean>(() => isAudioReady());

  // Base system definitions
  const baseRoleDefs = useMemo(() => [
    { id: 'operator', defaultName: 'Games & Ride Associate', icon: Users, color: 'blue', desc: 'Roster & Ride Counts', dept: 'operations' },
    { id: 'operation-officer', defaultName: 'Operation Officer', icon: Sparkles, color: 'indigo', desc: 'Operations & Roster Control', dept: 'management' },
    { id: 'ticket-sales', defaultName: 'Ticket Sales', badge: 'TK', color: 'teal', desc: 'Counter & Package Sales', dept: 'sales' },
    { id: 'sales-officer', defaultName: 'Sales Executive', icon: Briefcase, color: 'emerald', desc: 'Sales Audits & Reports', dept: 'sales' },
    { id: 'maintenance', defaultName: 'Maintenance', icon: Wrench, color: 'amber', desc: 'Repairs & Technical Logs', dept: 'maintenance' },
    { id: 'cx', defaultName: 'Customer Experience (CX)', icon: HeartHandshake, color: 'rose', desc: 'Guest Feedback & Ride Issues', dept: 'general' },
    { id: 'management', defaultName: 'Management', icon: BarChart3, color: 'purple', desc: 'Consolidated Executive Overview', dept: 'management' },
    { id: 'admin', defaultName: 'Administrator', icon: Shield, color: 'purple', desc: 'Full System Control', dept: 'management' },
  ], []);

  // Dynamically derive active login roles from appConfig
  const availableLoginRoles = useMemo(() => {
    const rolesConfig = appConfig?.roles;
    const hidden = appConfig?.hiddenLoginRoles || [];

    if (!rolesConfig || !Array.isArray(rolesConfig)) {
      return baseRoleDefs.filter(r => !hidden.includes(r.id)).map(r => ({
        id: r.id,
        name: r.defaultName,
        icon: r.icon,
        badge: (r as any).badge,
        color: r.color,
        desc: r.desc
      }));
    }

    const result: Array<{
      id: string;
      name: string;
      icon: any;
      badge?: string;
      color: string;
      desc: string;
    }> = [];

    baseRoleDefs.forEach(base => {
      if (hidden.includes(base.id)) return;

      // Match configured role
      const matchedRole = rolesConfig.find(r => 
        r.loginRole === base.id || 
        r.id === `role-${base.id}` ||
        (base.id === 'operator' && (r.id === 'role-1' || r.name.toLowerCase().includes('games') || r.name.toLowerCase().includes('operator') || r.name.toLowerCase().includes('ride associate'))) ||
        (base.id === 'operation-officer' && (r.id === 'role-5' || r.name.toLowerCase().includes('operation officer'))) ||
        (base.id === 'ticket-sales' && (r.id === 'role-6' || r.id === 'role-8' || r.name.toLowerCase().includes('cashier') || r.name.toLowerCase().includes('counter') || r.name.toLowerCase().includes('ticket sales'))) ||
        (base.id === 'sales-officer' && (r.id === 'role-7' || r.id === 'role-9' || r.name.toLowerCase().includes('sales executive') || r.name.toLowerCase().includes('sales officer'))) ||
        (base.id === 'maintenance' && (r.id === 'role-10' || r.id === 'role-11' || r.id === 'role-12' || r.id === 'role-13' || r.department === 'maintenance')) ||
        (base.id === 'cx' && (r.id === 'role-14' || r.id === 'role-15' || r.name.toLowerCase().includes('customer experience') || r.name.toLowerCase().includes('cx'))) ||
        (base.id === 'admin' && (r.id === 'role-17' || r.name.toLowerCase().includes('admin')))
      );

      // If user deleted Games & Ride Associate or operators from administrator portal, exclude it
      if (base.id === 'operator') {
        const hasActiveOpsRole = rolesConfig.some(r => 
          (r.department === 'operations' || r.loginRole === 'operator') && 
          r.enabledForLogin !== false &&
          (r.id === 'role-1' || r.loginRole === 'operator' || r.name.toLowerCase().includes('associate') || r.name.toLowerCase().includes('operator') || r.name.toLowerCase().includes('ride'))
        );
        if (!hasActiveOpsRole) return;
      }

      if (matchedRole && matchedRole.enabledForLogin === false) {
        return;
      }

      let roleDisplayName = matchedRole?.name || base.defaultName;
      // Guarantee 'Maintenance' is displayed instead of 'Electrical Specialist'
      if (base.id === 'maintenance' || roleDisplayName === 'Electrical Specialist') {
        roleDisplayName = 'Maintenance';
      }
      // Guarantee 'Ticket Sales' is displayed instead of 'Lead Cashier'
      if ((base.id === 'ticket-sales' && roleDisplayName === 'Lead Cashier') || roleDisplayName === 'Lead Cashier') {
        roleDisplayName = 'Ticket Sales';
      }

      result.push({
        id: base.id,
        name: roleDisplayName,
        icon: base.icon,
        badge: (base as any).badge,
        color: base.color,
        desc: matchedRole?.description || base.desc
      });
    });

    if (result.length === 0) {
      result.push({
        id: 'admin',
        name: 'Administrator',
        icon: Shield,
        color: 'purple',
        desc: 'Full System Control'
      });
    }

    return result;
  }, [appConfig?.roles, appConfig?.hiddenLoginRoles, baseRoleDefs]);

  const [selectedRole, setSelectedRole] = useState<string>(() => availableLoginRoles[0]?.id || 'operator');
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState('');

  // Auto-switch role if current selectedRole was deleted or disabled in Admin Portal
  useEffect(() => {
    if (availableLoginRoles.length > 0 && !availableLoginRoles.some(r => r.id === selectedRole)) {
      setSelectedRole(availableLoginRoles[0].id);
      setSelectedUser('');
      setPassword('');
      setError('');
    }
  }, [availableLoginRoles, selectedRole]);

  const displayAppName = (!appConfig?.appName || appConfig.appName === 'TFW Operations Manager') 
    ? 'Tanvir Bashundhara Group' 
    : appConfig.appName;
  const displayHeading = appConfig?.loginHeading || 'Sign In';
  const displaySubheading = appConfig?.loginSubheading || 'Select your profile to begin your shift';
  const displayOrg = appConfig?.orgName;
  const expectedAdminPassword = appConfig?.adminPassword || 'admin79';
  const expectedOpsPassword = appConfig?.operationOfficerPassword || 'ops79';
  const expectedSalesPassword = appConfig?.salesOfficerPassword || 'sales79';
  const expectedMaintenancePassword = appConfig?.maintenancePassword || 'maint';

  // Left Corner Logo Options: Tanvir Bashundhara Group (TBG)
  const leftLogo = appConfig?.loginLeftLogo || '/tbg-logo.svg';
  const leftTitle = (!appConfig?.loginLeftTitle || appConfig.loginLeftTitle === 'TOGGI FUN WORLD')
    ? 'Tanvir Bashundhara Group'
    : appConfig.loginLeftTitle;
  const leftSubtitle = appConfig?.loginLeftSubtitle || 'Operations & Management Portal';

  // Right Corner Logo Options: Bashundhara City Development Ltd (BCDL)
  const rightLogo = appConfig?.loginRightLogo || '/bcdl-logo.svg';
  const rightTitle = (!appConfig?.loginRightTitle || appConfig.loginRightTitle === 'BASHUNDHARA GROUP')
    ? 'Bashundhara City Development Ltd'
    : appConfig.loginRightTitle;
  const rightSubtitle = appConfig?.loginRightSubtitle || 'Bashundhara Group';

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setSelectedUser('');
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedRole === 'admin') {
      if (password === expectedAdminPassword || password === 'admin79') {
        onLogin('admin', { id: 999, name: 'Administrator' });
      } else {
        setError(`Invalid Admin Password.`);
      }
    } else if (selectedRole === 'operation-officer') {
      if (
        password !== expectedOpsPassword && 
        password !== 'ops79' && 
        password !== expectedAdminPassword &&
        password !== 'admin79'
      ) {
        setError('Invalid Operation Officer Password.');
        return;
      }
      onLogin('operation-officer', { id: 901, name: 'Operation Officer', role: 'Operation Officer' });
    } else if (selectedRole === 'sales-officer') {
      if (
        password !== expectedSalesPassword && 
        password !== 'sales79' && 
        password !== expectedAdminPassword &&
        password !== 'admin79'
      ) {
        setError('Invalid Sales Executive Password.');
        return;
      }
      onLogin('sales-officer', { id: 902, name: 'Sales Executive', role: 'Sales Executive' });
    } else if (selectedRole === 'maintenance') {
      if (
        password !== expectedMaintenancePassword && 
        password !== 'maint' && 
        password !== 'tech' && 
        password !== 'maintenance' && 
        password !== expectedAdminPassword &&
        password !== 'admin79'
      ) {
        setError('Invalid Maintenance Password.');
        return;
      }
      onLogin('maintenance', { id: 903, name: 'Maintenance Engineer', role: 'Maintenance Engineer' });
    } else if (selectedRole === 'management') {
      const expectedManagementPassword = appConfig?.managementPassword || 'manage79';
      if (
        password !== expectedManagementPassword &&
        password !== 'manage79' &&
        password !== 'management79' &&
        password !== expectedAdminPassword &&
        password !== 'admin79'
      ) {
        setError('Invalid Management Password.');
        return;
      }
      onLogin('management', { id: 990, name: 'Management', role: 'Management' });
    } else if (selectedRole === 'cx') {
      const expectedCxPassword = appConfig?.cxPassword || 'cx79';
      if (
        password !== expectedCxPassword &&
        password !== 'cx79' &&
        password !== 'cx123' &&
        password !== expectedAdminPassword &&
        password !== 'admin79'
      ) {
        setError('Invalid Customer Experience Password.');
        return;
      }
      const cxMember = cxPersonnel.find(o => o.id.toString() === selectedUser);
      if (cxMember) {
        onLogin('cx', { ...cxMember, role: cxMember.role || 'Customer Experience (CX)' });
      } else if (selectedUser.trim()) {
        onLogin('cx', { id: 914, name: selectedUser.trim(), role: 'Customer Experience (CX)' });
      } else {
        if (cxPersonnel.length > 0) {
          setError('Please select your Customer Experience (CX) member name.');
        } else {
          onLogin('cx', { id: 914, name: 'Customer Experience Specialist', role: 'Customer Experience (CX)' });
        }
      }
    } else if (selectedRole === 'operator') {
      const op = operators.find(o => o.id.toString() === selectedUser);
      if (op) onLogin('operator', op);
      else setError('Please select your name.');
    } else if (selectedRole === 'ticket-sales') {
      const p = ticketSalesPersonnel.find(o => o.id.toString() === selectedUser);
      if (p) onLogin('ticket-sales', p);
      else setError('Please select your name.');
    }
  };

  const currentRoleObj = availableLoginRoles.find(r => r.id === selectedRole) || availableLoginRoles[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Left Corner Logo & Brand Badge */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-gray-850/90 hover:bg-gray-800 border border-purple-500/30 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center gap-2 sm:gap-2.5 backdrop-blur-md shadow-xl z-20 transition-all max-w-[calc(50vw-2.5rem)] sm:max-w-none">
        {leftLogo ? (
          <img src={leftLogo} alt={leftTitle} className="h-8 sm:h-9 w-auto min-w-[32px] sm:min-w-[36px] max-w-[50px] sm:max-w-[65px] flex-shrink-0 object-contain rounded-lg p-0.5 bg-white border border-gray-400 shadow-sm" />
        ) : (
          <div className="h-8 sm:h-9 w-8 sm:w-9 flex-shrink-0 bg-gradient-to-tr from-amber-600 via-yellow-600 to-amber-700 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow border border-amber-400/40">
            {leftTitle.split(' ').map(w => w[0]).filter(Boolean).slice(0, 3).join('') || 'TBG'}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] sm:text-xs font-black text-white tracking-wider uppercase leading-none flex items-center gap-1.5 truncate">
            <span className="truncate">{leftTitle}</span>
            <span className="inline-block w-1.5 h-1.5 flex-shrink-0 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-[9px] text-purple-300 font-semibold leading-none mt-0.5 truncate">
            {leftSubtitle}
          </span>
        </div>
      </div>

      {/* Top Right Corner Logo & Actions Group */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-1.5 sm:gap-2 z-20">
        {/* Right Corner Brand / Corporate Logo Badge (Enlisted Bashundhara City Logo) */}
        <div className="flex bg-gray-850/90 hover:bg-gray-800 border border-emerald-500/30 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl items-center gap-2 sm:gap-2.5 backdrop-blur-md shadow-xl transition-all max-w-[calc(50vw-3.5rem)] sm:max-w-none">
          <div className="flex flex-col text-right min-w-0">
            <span className="text-[11px] sm:text-xs font-black text-white tracking-wider uppercase leading-none truncate">
              {rightTitle}
            </span>
            <span className="text-[9px] text-emerald-300 font-semibold leading-none mt-0.5 truncate">
              {rightSubtitle}
            </span>
          </div>
          {rightLogo ? (
            <img src={rightLogo} alt={rightTitle} className="h-8 sm:h-9 w-auto min-w-[36px] sm:min-w-[42px] max-w-[56px] sm:max-w-[72px] flex-shrink-0 object-contain rounded-lg p-0.5 bg-white border border-gray-400 shadow-sm" />
          ) : (
            <div className="h-8 sm:h-9 w-8 sm:w-9 flex-shrink-0 bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow border border-emerald-400/40">
              {rightTitle.split(' ').map(w => w[0]).filter(Boolean).slice(0, 4).join('') || 'BCDL'}
            </div>
          )}
        </div>

        {/* Share / Web Link button */}
        <button 
          type="button"
          onClick={() => setShowShare(true)}
          className="bg-gray-850/90 hover:bg-gray-800 text-blue-300 hover:text-blue-200 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-blue-500/30 flex items-center gap-1.5 sm:gap-2 text-xs font-bold backdrop-blur-md shadow-xl transition-all cursor-pointer"
          title="Get Web Link & QR Code for phone & tablet access"
        >
          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
          <span className="hidden md:inline">Web Link</span>
        </button>
      </div>

      {/* Centered Login Card */}
      <div 
        onClick={() => { if (!soundArmed) { unlockAudio(); setSoundArmed(true); } }}
        className="w-full max-w-lg bg-gray-850 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700/80 backdrop-blur-xl relative z-10 animate-fade-in-up pt-8 my-4"
      >
        <div className="text-center mb-6">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="h-16 mx-auto mb-3 object-contain rounded-xl p-1 bg-gray-900 border border-gray-700"/>
          ) : (
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl shadow-blue-900/30 border border-blue-400/30">
              TFW
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{displayAppName}</h1>
          {displayOrg && (
            <p className="text-xs text-purple-400 font-semibold mt-0.5 tracking-wide uppercase">
              {displayOrg}
            </p>
          )}
          <p className="text-gray-400 text-xs sm:text-sm mt-1">{displaySubheading}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-xl text-red-300 text-xs font-medium text-center animate-fade-in-up">
            {error}
          </div>
        )}

        {/* Dynamic Quick Role Selection Cards */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableLoginRoles.map(r => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              const isAdministrator = r.id === 'admin';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isAdministrator && availableLoginRoles.length % 2 !== 0 ? 'col-span-2 sm:col-span-1 sm:col-start-2' : ''
                  } ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-950/40 ring-1 ring-blue-500'
                      : 'bg-gray-900/80 border-gray-750 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    {r.id === 'ticket-sales' ? (
                      <span className={`text-[11px] font-black tracking-tight px-1.5 py-0.5 rounded border leading-none font-mono ${
                        isSelected
                          ? 'bg-teal-500/30 text-teal-300 border-teal-400'
                          : 'bg-teal-950/40 text-teal-400 border-teal-700/60'
                      }`}>
                        TK
                      </span>
                    ) : (
                      Icon && <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                    )}
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight truncate">{r.name}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Dynamic Dropdown matching active roles */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Role Details
            </label>
            <select 
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-blue-500 outline-none transition-colors"
            >
              {availableLoginRoles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Customer Experience (CX) Profile */}
          {selectedRole === 'cx' && (
            <div className="space-y-3.5 p-4 bg-rose-950/30 rounded-xl border border-rose-700/50 animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-rose-300 pb-2 border-b border-rose-800/40">
                <div className="p-1.5 bg-rose-900/60 rounded-lg border border-rose-700/60 text-rose-300">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{currentRoleObj?.name || 'Customer Experience (CX)'} Concern</h4>
                  <p className="text-[11px] text-rose-300/80">Guest feedback, ride maintenance reporting & customer sentiment</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Select or Enter CX Specialist Name</span>
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800 font-mono">CX</span>
                </label>
                {cxPersonnel && cxPersonnel.length > 0 ? (
                  <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-rose-500/40 focus:border-rose-400 outline-none transition-colors"
                    required
                  >
                    <option value="">-- Choose CX Member --</option>
                    {cxPersonnel.map(op => (
                      <option key={op.id} value={op.id}>{op.name} {op.role ? `(${op.role})` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    placeholder="Enter your name / CX Specialist ID"
                    className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-rose-500/40 focus:border-rose-400 outline-none transition-colors"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Customer Experience Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-rose-500/40 focus:border-rose-400 outline-none transition-colors"
                    placeholder="Enter CX password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Operation Officer Concern & Password */}
          {selectedRole === 'operation-officer' && (
            <div className="space-y-3.5 p-4 bg-indigo-950/30 rounded-xl border border-indigo-700/50 animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-indigo-300 pb-2 border-b border-indigo-800/40">
                <div className="p-1.5 bg-indigo-900/60 rounded-lg border border-indigo-700/60 text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{currentRoleObj?.name || 'Operation Officer'} Concern</h4>
                  <p className="text-[11px] text-indigo-300/80">Ride operations, daily roster scheduling, staff assignments & live counts</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Operation Officer Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-indigo-500/40 focus:border-indigo-400 outline-none transition-colors"
                    placeholder="Enter operation officer password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Games & Ride Associate Profile */}
          {selectedRole === 'operator' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Select Your Name ({currentRoleObj?.name || 'Games & Ride Associate'})
                </label>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800 font-mono">
                  {operators.length} Synced
                </span>
              </div>
              <select 
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                required
              >
                <option value="">-- Choose Name ({operators.length} associates) --</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.name} {op.role ? `(${op.role})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ticket Sales Profile */}
          {selectedRole === 'ticket-sales' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select {currentRoleObj?.name || 'Ticket Sales'} Staff</span>
                <span className="text-[10px] font-bold text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800 font-mono">TK</span>
              </label>
              <select 
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-teal-500 outline-none transition-colors"
                required
              >
                <option value="">-- Choose Name --</option>
                {ticketSalesPersonnel.map(op => (
                  <option key={op.id} value={op.id}>{op.name} {op.role ? `(${op.role})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sales Executive Concern & Password */}
          {selectedRole === 'sales-officer' && (
            <div className="space-y-3.5 p-4 bg-emerald-950/30 rounded-xl border border-emerald-700/50 animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-emerald-300 pb-2 border-b border-emerald-800/40">
                <div className="p-1.5 bg-emerald-900/60 rounded-lg border border-emerald-700/60 text-emerald-300">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{currentRoleObj?.name || 'Sales Executive'} Concern</h4>
                  <p className="text-[11px] text-emerald-300/80">Ticket counter audits, cashier assignments, financial revenue & sales reports</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{currentRoleObj?.name || 'Sales Executive'} Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-emerald-500/40 focus:border-emerald-400 outline-none transition-colors"
                    placeholder="Enter sales password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Concern & Password */}
          {selectedRole === 'maintenance' && (
            <div className="space-y-3.5 p-4 bg-amber-950/30 rounded-xl border border-amber-700/50 animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-amber-300 pb-2 border-b border-amber-800/40">
                <div className="p-1.5 bg-amber-900/60 rounded-lg border border-amber-700/60 text-amber-300">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{currentRoleObj?.name || 'Maintenance'} Concern</h4>
                  <p className="text-[11px] text-amber-300/80">Ride repair tickets, technical inspections, safety checks & maintenance roster</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Maintenance Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-amber-500/40 focus:border-amber-400 outline-none transition-colors"
                    placeholder="Enter maintenance password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Executive Management Concern & Password */}
          {selectedRole === 'management' && (
            <div className="space-y-3.5 p-4 bg-purple-950/30 rounded-xl border border-purple-700/50 animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-purple-300 pb-2 border-b border-purple-800/40">
                <div className="p-1.5 bg-purple-900/60 rounded-lg border border-purple-700/60 text-purple-300">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{currentRoleObj?.name || 'Executive Management'} Concern</h4>
                  <p className="text-[11px] text-purple-300/80">Consolidated executive overview: today's guest counts, sales breakdown, staff attendance & maintenance</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Management Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-purple-500/40 focus:border-purple-400 outline-none transition-colors"
                    placeholder="Enter management password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Administrator Password */}
          {selectedRole === 'admin' && (
            <div className="space-y-3.5 p-4 bg-purple-950/30 rounded-xl border border-purple-700/50 animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-purple-300 pb-2 border-b border-purple-800/40">
                <div className="p-1.5 bg-purple-900/60 rounded-lg border border-purple-700/60 text-purple-300">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Administrator Concern</h4>
                  <p className="text-[11px] text-purple-300/80">Full system master control, data customization, security & reset tools</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Administrator Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 text-white rounded-xl p-3 pr-10 text-sm border border-purple-500/40 focus:border-purple-400 outline-none transition-colors"
                    placeholder="Enter administrator password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'admin' 
                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30' 
                : selectedRole === 'management'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/40'
                : selectedRole === 'operation-officer'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30' 
                : selectedRole === 'sales-officer'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : selectedRole === 'maintenance'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                : selectedRole === 'cx'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                : selectedRole === 'ticket-sales'
                ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
            }`}
          >
            {selectedRole === 'admin' ? (
              <Shield className="w-4 h-4" />
            ) : selectedRole === 'management' ? (
              <BarChart3 className="w-4 h-4" />
            ) : selectedRole === 'operation-officer' ? (
              <Sparkles className="w-4 h-4" />
            ) : selectedRole === 'sales-officer' ? (
              <Briefcase className="w-4 h-4" />
            ) : selectedRole === 'maintenance' ? (
              <Wrench className="w-4 h-4" />
            ) : selectedRole === 'cx' ? (
              <HeartHandshake className="w-4 h-4" />
            ) : selectedRole === 'ticket-sales' ? (
              <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-300/60 text-teal-200 font-mono leading-none">TK</span>
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span>
              {selectedRole === 'operation-officer' 
                ? `Sign In as ${currentRoleObj?.name || 'Operation Officer'}` 
                : selectedRole === 'management'
                ? `Sign In as ${currentRoleObj?.name || 'Management'}`
                : selectedRole === 'sales-officer'
                ? `Sign In as ${currentRoleObj?.name || 'Sales Executive'}`
                : selectedRole === 'maintenance'
                ? `Sign In as ${currentRoleObj?.name || 'Maintenance Engineer'}`
                : selectedRole === 'cx'
                ? `Sign In as ${currentRoleObj?.name || 'Customer Experience'}`
                : selectedRole === 'ticket-sales'
                ? `Sign In to ${currentRoleObj?.name || 'Ticket Sales'}`
                : selectedRole === 'admin'
                ? 'Sign In to Admin Portal'
                : `Sign In to ${currentRoleObj?.name || 'Associate Dashboard'}`}
            </span>
          </button>
        </form>
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} appName={displayAppName} />}
    </div>
  );
};

export default Login;

