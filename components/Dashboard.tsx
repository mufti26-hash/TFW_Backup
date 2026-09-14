import React, { useState, useMemo } from 'react';
import { RideWithCount, Operator, AttendanceRecord, HistoryRecord, Ride } from '../types';
import { 
  Trophy, 
  Activity, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Award, 
  Sparkles, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  Flame,
  UserCheck,
  UserX,
  Layers,
  Search
} from 'lucide-react';

interface Props {
  ridesWithCounts: RideWithCount[];
  operators: Operator[];
  attendance: AttendanceRecord[];
  historyLog: HistoryRecord[];
  onNavigate: (view: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  dailyAssignments?: Record<string, Record<string, number[]>>;
  dailyCounts?: Record<string, Record<string, number>>;
  rides?: Ride[];
}

interface OperatorPerformance {
  operator: Operator;
  totalGuests: number;
  assignedRidesCount: number;
  assignedRides: Array<{ id: number; name: string; count: number }>;
  isPresent: boolean;
  checkInTime?: string | null;
}

export const Dashboard: React.FC<Props> = ({ 
  ridesWithCounts, 
  operators, 
  attendance, 
  historyLog, 
  onNavigate, 
  selectedDate, 
  onDateChange,
  dailyAssignments = {},
  dailyCounts = {},
  rides = []
}) => {
  const [leaderboardScope, setLeaderboardScope] = useState<'selected' | 'allTime'>('selected');
  const [activityFilter, setActivityFilter] = useState<'all' | 'counts' | 'assignments' | 'auth'>('all');
  const [activitySearch, setActivitySearch] = useState('');

  // 1. Overview Metrics for Selected Date
  const totalGuests = useMemo(() => {
    return ridesWithCounts.reduce((acc, r) => acc + (r.count || 0), 0);
  }, [ridesWithCounts]);

  const activeOperators = useMemo(() => {
    return attendance.filter(a => a.date === selectedDate).length;
  }, [attendance, selectedDate]);

  const activeRidesCount = useMemo(() => {
    return ridesWithCounts.filter(r => (r.count || 0) > 0).length;
  }, [ridesWithCounts]);

  // 2. Compute Operator Performance & Rank Top 5
  const operatorPerformances = useMemo<OperatorPerformance[]>(() => {
    if (!operators || operators.length === 0) return [];

    const effectiveRides = rides.length > 0 ? rides : ridesWithCounts;

    if (leaderboardScope === 'selected') {
      // Selected Date Performance
      const dayAssignments = dailyAssignments[selectedDate] || {};
      const dayCounts = dailyCounts[selectedDate] || {};

      return operators.map(op => {
        const assignedRidesList: Array<{ id: number; name: string; count: number }> = [];
        let opTotalGuests = 0;

        Object.entries(dayAssignments).forEach(([rideIdStr, opIds]) => {
          const rId = Number(rideIdStr);
          if (Array.isArray(opIds) && opIds.includes(op.id)) {
            const rideObj = effectiveRides.find(r => r.id === rId);
            const rideName = rideObj ? rideObj.name : `Ride #${rId}`;
            const countVal = dayCounts[rId] !== undefined ? dayCounts[rId] : (dayCounts[rideIdStr] || 0);
            
            assignedRidesList.push({
              id: rId,
              name: rideName,
              count: countVal
            });
            opTotalGuests += countVal;
          }
        });

        // Attendance status
        const attRecord = attendance.find(a => a.operatorId === op.id && a.date === selectedDate);

        return {
          operator: op,
          totalGuests: opTotalGuests,
          assignedRidesCount: assignedRidesList.length,
          assignedRides: assignedRidesList.sort((a, b) => b.count - a.count),
          isPresent: Boolean(attRecord),
          checkInTime: attRecord?.briefingTime || null
        };
      }).sort((a, b) => {
        // Sort descending by total guests, then by assigned rides, then name
        if (b.totalGuests !== a.totalGuests) {
          return b.totalGuests - a.totalGuests;
        }
        if (b.assignedRidesCount !== a.assignedRidesCount) {
          return b.assignedRidesCount - a.assignedRidesCount;
        }
        return a.operator.name.localeCompare(b.operator.name);
      });
    } else {
      // All-Time Performance across all historical dates
      const allDates = Array.from(new Set([
        ...Object.keys(dailyAssignments || {}),
        ...Object.keys(dailyCounts || {})
      ]));

      return operators.map(op => {
        let opTotalGuests = 0;
        const ridesMap: Record<number, { name: string; count: number }> = {};
        let totalAssignedSlots = 0;

        allDates.forEach(date => {
          const dayAssignments = dailyAssignments[date] || {};
          const dayCounts = dailyCounts[date] || {};

          Object.entries(dayAssignments).forEach(([rideIdStr, opIds]) => {
            const rId = Number(rideIdStr);
            if (Array.isArray(opIds) && opIds.includes(op.id)) {
              totalAssignedSlots++;
              const rideObj = effectiveRides.find(r => r.id === rId);
              const rideName = rideObj ? rideObj.name : `Ride #${rId}`;
              const countVal = dayCounts[rId] !== undefined ? dayCounts[rId] : (dayCounts[rideIdStr] || 0);

              if (!ridesMap[rId]) {
                ridesMap[rId] = { name: rideName, count: 0 };
              }
              ridesMap[rId].count += countVal;
              opTotalGuests += countVal;
            }
          });
        });

        const assignedRidesList = Object.entries(ridesMap).map(([idStr, data]) => ({
          id: Number(idStr),
          name: data.name,
          count: data.count
        })).sort((a, b) => b.count - a.count);

        const isPresentToday = attendance.some(a => a.operatorId === op.id && a.date === selectedDate);

        return {
          operator: op,
          totalGuests: opTotalGuests,
          assignedRidesCount: assignedRidesList.length,
          assignedRides: assignedRidesList,
          isPresent: isPresentToday
        };
      }).sort((a, b) => {
        if (b.totalGuests !== a.totalGuests) {
          return b.totalGuests - a.totalGuests;
        }
        if (b.assignedRidesCount !== a.assignedRidesCount) {
          return b.assignedRidesCount - a.assignedRidesCount;
        }
        return a.operator.name.localeCompare(b.operator.name);
      });
    }
  }, [operators, rides, ridesWithCounts, leaderboardScope, dailyAssignments, dailyCounts, selectedDate, attendance]);

  const top5Operators = useMemo(() => {
    return operatorPerformances.slice(0, 5);
  }, [operatorPerformances]);

  const maxOperatorGuests = useMemo(() => {
    if (top5Operators.length === 0) return 1;
    return Math.max(1, top5Operators[0].totalGuests);
  }, [top5Operators]);

  const top5CombinedGuests = useMemo(() => {
    return top5Operators.reduce((sum, item) => sum + item.totalGuests, 0);
  }, [top5Operators]);

  // 3. Filtered Recent Activity Logs
  const filteredLogs = useMemo(() => {
    return historyLog.filter(log => {
      // Category filter
      if (activityFilter === 'counts') {
        const isCount = log.action.includes('COUNT') || log.action.includes('ROSTER') || log.details.toLowerCase().includes('guest') || log.details.toLowerCase().includes('count');
        if (!isCount) return false;
      } else if (activityFilter === 'assignments') {
        const isAssign = log.action.includes('ASSIGN') || log.details.toLowerCase().includes('assign');
        if (!isAssign) return false;
      } else if (activityFilter === 'auth') {
        const isAuth = log.action.includes('LOGIN') || log.action.includes('LOGOUT') || log.action.includes('CLOCK') || log.action.includes('CHECK');
        if (!isAuth) return false;
      }

      // Search text filter
      if (activitySearch.trim()) {
        const q = activitySearch.toLowerCase();
        const matchesUser = log.user.toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        return matchesUser || matchesAction || matchesDetails;
      }

      return true;
    });
  }, [historyLog, activityFilter, activitySearch]);

  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24 && date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('COUNT') || act.includes('GUEST')) {
      return { label: 'Guest Count', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' };
    }
    if (act.includes('ASSIGN')) {
      return { label: 'Assignment', bg: 'bg-blue-950/80 text-blue-300 border-blue-800/80' };
    }
    if (act.includes('LOGIN') || act.includes('AUTH')) {
      return { label: 'Login', bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80' };
    }
    if (act.includes('CLOCK') || act.includes('CHECK_IN') || act.includes('ATTENDANCE')) {
      return { label: 'Attendance', bg: 'bg-purple-950/80 text-purple-300 border-purple-800/80' };
    }
    if (act.includes('MAINTENANCE') || act.includes('PROBLEM') || act.includes('ISSUE')) {
      return { label: 'Maintenance', bg: 'bg-amber-950/80 text-amber-300 border-amber-800/80' };
    }
    if (act.includes('DELETE') || act.includes('RESET') || act.includes('CLEAR')) {
      return { label: 'System', bg: 'bg-red-950/80 text-red-300 border-red-800/80' };
    }
    return { label: action.replace(/_/g, ' '), bg: 'bg-gray-800 text-gray-300 border-gray-700' };
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Header & Overview Metric Cards */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-lg gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Operation Officer Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Real-time operational activity and top operator performance ranking</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700 px-3.5 py-2 rounded-xl shadow-inner">
          <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-gray-400 font-medium">Selected Date:</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)} 
            className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer hover:text-blue-300 focus:text-blue-400 transition-colors" 
          />
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guests */}
        <div className="bg-gradient-to-br from-blue-900/50 via-gray-800 to-gray-850 rounded-2xl p-5 border border-blue-800/40 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Total Guests</p>
              <h3 className="text-3xl font-extrabold text-white mt-1.5 font-mono">{totalGuests.toLocaleString()}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shadow-inner">
              👥
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
            <span>{activeRidesCount} rides active</span>
            <button onClick={() => onNavigate('reports')} className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5">
              Reports <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Operators */}
        <div className="bg-gradient-to-br from-purple-900/50 via-gray-800 to-gray-850 rounded-2xl p-5 border border-purple-800/40 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300">Active Operators</p>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <h3 className="text-3xl font-extrabold text-white font-mono">{activeOperators}</h3>
                <span className="text-sm font-semibold text-gray-400 font-mono">/ {operators.length}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
            <span>
              {operators.length > 0 ? `${Math.round((activeOperators / operators.length) * 100)}% attendance` : 'No staff'}
            </span>
            <button onClick={() => onNavigate('roster')} className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-0.5">
              Roster <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Performer Spotlight */}
        <div className="bg-gradient-to-br from-amber-900/40 via-gray-800 to-gray-850 rounded-2xl p-5 border border-amber-800/40 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="truncate pr-2">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Top Performer
              </p>
              <h3 className="text-xl font-bold text-white mt-1.5 truncate">
                {top5Operators[0] ? top5Operators[0].operator.name : 'None yet'}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 text-xl shadow-inner">
              🏆
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono text-amber-400 font-semibold">
              {top5Operators[0] ? `${top5Operators[0].totalGuests.toLocaleString()} Guests` : '0 Guests'}
            </span>
            <span className="text-[11px] text-gray-500 uppercase font-semibold">
              {leaderboardScope === 'selected' ? 'Today' : 'All-Time'}
            </span>
          </div>
        </div>

        {/* Quick Operations Matrix Link */}
        <div className="bg-gradient-to-br from-emerald-900/40 via-gray-800 to-gray-850 rounded-2xl p-5 border border-emerald-800/40 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Operations Control</p>
              <h3 className="text-xl font-bold text-white mt-1.5">Shift System</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center gap-3 text-xs">
            <button onClick={() => onNavigate('assignments')} className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              Assignments <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-gray-600">•</span>
            <button onClick={() => onNavigate('counter')} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
              Ride Grid <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Left (Recent Activity) vs Right (Top 5 Operator Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT SIDE: RECENT ACTIVITY ================= */}
        <div className="lg:col-span-6 bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700 shadow-xl flex flex-col h-full min-h-[580px]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-900/40 border border-blue-700/60 flex items-center justify-center text-blue-400 shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Recent Activity
                  <span className="text-xs font-normal px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">
                    {filteredLogs.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-400">Live operational & audit stream</p>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('history')} 
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/60 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All Logs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:flex-grow">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search user, action, ride..." 
                value={activitySearch} 
                onChange={(e) => setActivitySearch(e.target.value)} 
                className="w-full bg-gray-900/90 text-gray-200 text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-500"
              />
              {activitySearch && (
                <button 
                  onClick={() => setActivitySearch('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button 
                onClick={() => setActivityFilter('all')}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activityFilter === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setActivityFilter('counts')}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activityFilter === 'counts' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                Counts
              </button>
              <button 
                onClick={() => setActivityFilter('assignments')}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activityFilter === 'assignments' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                Roster
              </button>
              <button 
                onClick={() => setActivityFilter('auth')}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activityFilter === 'auth' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                Staff
              </button>
            </div>
          </div>

          {/* Activity Stream Feed */}
          <div className="mt-4 flex-grow overflow-y-auto max-h-[460px] custom-scrollbar pr-1 space-y-2.5">
            {filteredLogs.slice(0, 15).map((log, idx) => {
              const badge = getActionBadge(log.action);
              return (
                <div 
                  key={log.id || idx} 
                  className="bg-gray-900/60 hover:bg-gray-900/90 rounded-xl p-3 border border-gray-750 hover:border-gray-650 transition-all flex items-start gap-3 group"
                >
                  {/* Left user initial or icon */}
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0 mt-0.5 group-hover:border-blue-500/40 group-hover:text-blue-300 transition-colors">
                    {log.user ? log.user.charAt(0).toUpperCase() : 'U'}
                  </div>

                  {/* Body */}
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                          {log.user}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {formatLogTime(log.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed break-words">
                      {log.details}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gray-750 flex items-center justify-center text-gray-500 mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="text-gray-400 font-medium text-sm">No recent activity found</p>
                <p className="text-gray-500 text-xs mt-1">Actions performed across the park will stream here in real-time.</p>
              </div>
            )}
          </div>

          {/* Bottom Hint */}
          <div className="mt-4 pt-3 border-t border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
            <span>Showing latest {Math.min(15, filteredLogs.length)} events</span>
            <span className="text-gray-400">Auto-synced</span>
          </div>
        </div>

        {/* ================= RIGHT SIDE: TOP 5 OPERATOR PERFORMANCE ================= */}
        <div className="lg:col-span-6 bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700 shadow-xl flex flex-col h-full min-h-[580px]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-900/40 border border-amber-700/60 flex items-center justify-center text-amber-400 shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Top 5 Operator Performance
                </h2>
                <p className="text-xs text-gray-400">Ranked by total guests handled on assigned rides</p>
              </div>
            </div>

            {/* Scope Switcher: Selected Date vs All-Time */}
            <div className="flex items-center bg-gray-900/90 p-1 rounded-xl border border-gray-700 self-start sm:self-auto">
              <button 
                onClick={() => setLeaderboardScope('selected')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  leaderboardScope === 'selected' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Selected Date
              </button>
              <button 
                onClick={() => setLeaderboardScope('allTime')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  leaderboardScope === 'allTime' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All-Time
              </button>
            </div>
          </div>

          {/* Top 5 Leaderboard Cards */}
          <div className="mt-4 flex-grow space-y-3 overflow-y-auto max-h-[460px] custom-scrollbar pr-1">
            {top5Operators.map((item, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;
              const percentOfMax = maxOperatorGuests > 0 ? Math.round((item.totalGuests / maxOperatorGuests) * 100) : 0;

              return (
                <div 
                  key={item.operator.id}
                  className={`rounded-2xl p-4 border transition-all relative overflow-hidden ${
                    isFirst 
                      ? 'bg-gradient-to-br from-amber-950/40 via-gray-800 to-gray-850 border-amber-500/50 shadow-md shadow-amber-950/20' 
                      : isSecond 
                      ? 'bg-gradient-to-br from-slate-900/60 via-gray-800 to-gray-850 border-slate-400/40 shadow-sm'
                      : isThird 
                      ? 'bg-gradient-to-br from-orange-950/30 via-gray-800 to-gray-850 border-amber-700/40 shadow-sm'
                      : 'bg-gray-900/60 hover:bg-gray-900/80 border-gray-750'
                  }`}
                >
                  {/* Top Row: Rank, Operator Info, Total Guests */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-inner ${
                        isFirst 
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-gray-950 ring-2 ring-amber-400/40' 
                          : isSecond 
                          ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-gray-950 ring-1 ring-slate-300/40'
                          : isThird 
                          ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-1 ring-amber-600/40'
                          : 'bg-gray-800 text-gray-300 border border-gray-700'
                      }`}>
                        {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${rank}`}
                      </div>

                      {/* Operator Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base truncate">
                            {item.operator.name}
                          </h4>
                          {/* Present Badge */}
                          {item.isPresent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                              Off Duty
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.assignedRidesCount > 0 
                            ? `${item.assignedRidesCount} Assigned Ride${item.assignedRidesCount !== 1 ? 's' : ''}` 
                            : 'No active assignments'}
                        </p>
                      </div>
                    </div>

                    {/* Total Guests Badge */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className={`text-2xl font-mono font-extrabold ${
                          isFirst ? 'text-amber-400' : isSecond ? 'text-slate-200' : isThird ? 'text-amber-300' : 'text-blue-400'
                        }`}>
                          {item.totalGuests.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        Total Guests
                      </span>
                    </div>
                  </div>

                  {/* Relative Visual Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 rounded-full bg-gray-950 overflow-hidden p-0.5 border border-gray-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFirst 
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300 shadow-sm shadow-amber-400/50' 
                            : isSecond 
                            ? 'bg-gradient-to-r from-slate-400 to-slate-200' 
                            : isThird 
                            ? 'bg-gradient-to-r from-amber-600 to-amber-400' 
                            : 'bg-gradient-to-r from-blue-600 to-blue-400'
                        }`}
                        style={{ width: `${Math.max(4, percentOfMax)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Assigned Rides Chips / Breakdown */}
                  {item.assignedRides.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-750/60 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase text-gray-400 font-bold mr-1">Rides:</span>
                      {item.assignedRides.slice(0, 4).map((ride) => (
                        <span 
                          key={ride.id} 
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-gray-800/90 text-gray-300 border border-gray-700 flex items-center gap-1 font-medium"
                        >
                          <span>{ride.name}</span>
                          <span className="text-blue-400 font-mono font-bold">({ride.count})</span>
                        </span>
                      ))}
                      {item.assignedRides.length > 4 && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          +{item.assignedRides.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {top5Operators.length === 0 && (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gray-750 flex items-center justify-center text-gray-500 mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-gray-400 font-medium text-sm">No operators registered yet</p>
                <p className="text-gray-500 text-xs mt-1">Add operators in Admin Manager to start tracking performance.</p>
              </div>
            )}
          </div>

          {/* Bottom Summary Bar */}
          <div className="mt-4 pt-3 border-t border-gray-700/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="text-gray-400 flex items-center gap-1.5">
              <span>Top 5 Combined:</span>
              <strong className="text-emerald-400 font-mono text-sm">{top5CombinedGuests.toLocaleString()} Guests</strong>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onNavigate('assignments')} 
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <span>Assignments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-gray-600">•</span>
              <button 
                onClick={() => onNavigate('expertise')} 
                className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                <span>Expertise Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
