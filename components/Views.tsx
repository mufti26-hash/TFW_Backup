import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Link as LinkIcon, 
  CheckCircle2, 
  RefreshCw,
  Wrench,
  Clock,
  AlertTriangle,
  Users,
  Check,
  UserCheck,
  Camera,
  HeartHandshake,
  Search,
  MessageSquare,
  Send,
  Sparkles,
  Plus,
  X,
  Filter,
  ShieldAlert,
  MessageCircle,
  Layers,
  ChevronRight,
  ThumbsUp,
  Tag,
  Package,
  TrendingUp,
  Receipt,
  Ticket,
  ShoppingBag,
  Calendar,
  BarChart3,
  MapPin,
  Percent,
  Edit2,
  Save,
  Database,
  Banknote,
  Coins,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Radio,
  QrCode,
  Smartphone,
  Download,
  CalendarRange
} from 'lucide-react';
import { database } from '../firebaseConfig';
import { ShareModal } from './ShareModal';
import { 
  Ride, 
  Operator, 
  Counter, 
  CounterWithSales, 
  AttendanceRecord, 
  MaintenanceTicket, 
  PackageItem, 
  PackageSalesRecord, 
  PackageSalesData 
} from '../types';
import { DEFAULT_PACKAGES } from '../constants';

// --- Shared Components ---
export const ModalWrapper = ({ title, onClose, children }: { title: string; onClose: () => void; children?: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in-up">
    <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

export const ConfigErrorScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white flex-col p-8 text-center">
    <div className="bg-red-900/20 p-6 rounded-full mb-6">
      <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h1 className="text-3xl font-bold text-red-500 mb-4">Database Connection Notice</h1>
    <p className="text-gray-400 max-w-md mx-auto">Re-connecting to the persistent database server...</p>
  </div>
);

export const KioskModeWrapper = () => (
  <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-center text-xs py-1 px-4 font-bold uppercase tracking-widest sticky top-0 z-50 shadow-md">
    Staff Station Mode Active
  </div>
);

export const Reports = ({ 
  dailyCounts, 
  dailyPackageCounts = {}, 
  dailyTicketCounts = {}, 
  rides,
  selectedDate
}: { 
  dailyCounts: Record<string, Record<string, number>>; 
  dailyPackageCounts?: Record<string, Record<string, number>>; 
  dailyTicketCounts?: Record<string, Record<string, number>>; 
  rides: Ride[];
  selectedDate?: string;
}) => {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const activeDate = selectedDate || todayStr;
  const [startDate, setStartDate] = useState(activeDate);
  const [endDate, setEndDate] = useState(activeDate);
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const userHasCustomRange = useRef(false);

  // Sync with selectedDate initially, but preserve user-selected range
  React.useEffect(() => {
    if (selectedDate && !userHasCustomRange.current) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  }, [selectedDate]);

  // Collect all unique dates from dailyCounts, packageCounts, and ticketCounts
  const allRecordedDates = useMemo(() => {
    const set = new Set<string>();
    Object.keys(dailyCounts || {}).forEach(d => set.add(d));
    Object.keys(dailyPackageCounts || {}).forEach(d => set.add(d));
    Object.keys(dailyTicketCounts || {}).forEach(d => set.add(d));
    if (selectedDate) set.add(selectedDate);
    return Array.from(set).sort().reverse();
  }, [dailyCounts, dailyPackageCounts, dailyTicketCounts, selectedDate]);

  // Filter dates by range
  const filteredDates = useMemo(() => {
    return allRecordedDates.filter(d => {
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [allRecordedDates, startDate, endDate]);

  // Filter rides by search or particular game selection
  const targetRides = useMemo(() => {
    return rides.filter(ride => {
      if (selectedGameId !== 'all' && String(ride.id) !== selectedGameId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = ride.name.toLowerCase().includes(q);
        const matchFloor = (ride.floor || '').toLowerCase().includes(q);
        if (!matchName && !matchFloor) return false;
      }
      return true;
    });
  }, [rides, selectedGameId, searchQuery]);

  // Build report rows
  const reportData = useMemo(() => {
    return filteredDates.map(date => {
      const counts = dailyCounts[date] || {};
      const pkgCounts = dailyPackageCounts[date] || {};
      const tktCounts = dailyTicketCounts[date] || {};

      let totalPkg = 0;
      let totalTkt = 0;

      rides.forEach(ride => {
        let pkg = Number(pkgCounts[ride.id] !== undefined ? pkgCounts[ride.id] : (pkgCounts[String(ride.id)] || 0));
        let tkt = Number(tktCounts[ride.id] !== undefined ? tktCounts[ride.id] : (tktCounts[String(ride.id)] || 0));
        const rawCount = Number(counts[ride.id] !== undefined ? counts[ride.id] : (counts[String(ride.id)] || 0));
        if (pkg === 0 && tkt === 0 && rawCount > 0) {
          pkg = rawCount;
        }
        totalPkg += pkg;
        totalTkt += tkt;
      });

      const total = totalPkg + totalTkt;

      return { date, counts, pkgCounts, tktCounts, total, totalPkg, totalTkt };
    });
  }, [filteredDates, dailyCounts, dailyPackageCounts, dailyTicketCounts, rides]);

  // Summary KPIs in selected date range:
  // 1. Package Entries
  const overallPackageGuests = useMemo(() => {
    if (selectedGameId === 'all') {
      return reportData.reduce((sum, r) => sum + r.totalPkg, 0);
    }
    const rId = Number(selectedGameId);
    return reportData.reduce((sum, row) => {
      let pkg = Number(row.pkgCounts[rId] !== undefined ? row.pkgCounts[rId] : (row.pkgCounts[String(rId)] || 0));
      const raw = Number(row.counts[rId] !== undefined ? row.counts[rId] : (row.counts[String(rId)] || 0));
      if (pkg === 0 && raw > 0) pkg = raw;
      return sum + pkg;
    }, 0);
  }, [reportData, selectedGameId]);

  // 2. Ticket Entries
  const overallTicketGuests = useMemo(() => {
    if (selectedGameId === 'all') {
      return reportData.reduce((sum, r) => sum + r.totalTkt, 0);
    }
    const rId = Number(selectedGameId);
    return reportData.reduce((sum, row) => {
      const tkt = Number(row.tktCounts[rId] !== undefined ? row.tktCounts[rId] : (row.tktCounts[String(rId)] || 0));
      return sum + tkt;
    }, 0);
  }, [reportData, selectedGameId]);

  // 3. Total Guests in Range: STRICTLY summation of Package Entries + Ticket Entries
  const overallTotalGuests = useMemo(() => {
    return overallPackageGuests + overallTicketGuests;
  }, [overallPackageGuests, overallTicketGuests]);

  // Quick preset handlers
  const setRangePreset = (preset: 'today' | '7days' | '30days' | 'month' | 'all') => {
    userHasCustomRange.current = true;
    const end = selectedDate || todayStr;
    setEndDate(end);

    if (preset === 'today') {
      setStartDate(end);
    } else if (preset === '7days') {
      const s = new Date(end);
      s.setDate(s.getDate() - 7);
      setStartDate(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`);
    } else if (preset === '30days') {
      const s = new Date(end);
      s.setDate(s.getDate() - 30);
      setStartDate(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`);
    } else if (preset === 'month') {
      const d = new Date(end);
      const s = new Date(d.getFullYear(), d.getMonth(), 1);
      setStartDate(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Download Report CSV
  const handleDownloadCSV = () => {
    let filename = '';
    const csvLines: string[] = [];

    // Grand totals accumulators
    let grandTotalGuests = 0;
    let grandTotalPkg = 0;
    let grandTotalTkt = 0;
    const gameTotalsMap: Record<number | string, { pkg: number; tkt: number; total: number }> = {};
    targetRides.forEach(r => {
      gameTotalsMap[r.id] = { pkg: 0, tkt: 0, total: 0 };
    });

    if (selectedGameId !== 'all') {
      const selectedRide = rides.find(r => String(r.id) === selectedGameId);
      const rideName = selectedRide?.name || 'Game';
      filename = `Guest_Count_Report_${rideName.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate || 'All'}_to_${endDate || 'All'}.csv`;

      const headers = [
        'Date',
        'Game / Ride ID',
        'Game / Ride Name',
        'Floor',
        'Guest Count (Package)',
        'Guest Count (Ticket)',
        'Total Guests'
      ];
      csvLines.push(headers.join(','));
      
      reportData.forEach(row => {
        const rId = Number(selectedGameId);
        let pkg = Number(row.pkgCounts[rId] !== undefined ? row.pkgCounts[rId] : (row.pkgCounts[String(rId)] || 0));
        let tkt = Number(row.tktCounts[rId] !== undefined ? row.tktCounts[rId] : (row.tktCounts[String(rId)] || 0));
        const raw = Number(row.counts[rId] !== undefined ? row.counts[rId] : (row.counts[String(rId)] || 0));
        if (pkg === 0 && tkt === 0 && raw > 0) {
          pkg = raw;
        }
        const totalVal = pkg + tkt;

        grandTotalPkg += pkg;
        grandTotalTkt += tkt;
        grandTotalGuests += totalVal;

        csvLines.push([
          row.date,
          rId,
          `"${rideName.replace(/"/g, '""')}"`,
          `"${selectedRide?.floor || 'N/A'}"`,
          pkg,
          tkt,
          totalVal
        ].join(','));
      });

      // Total Summary Row
      csvLines.push([
        'TOTAL SUMMARY',
        selectedRide?.id || '--',
        `"${rideName.replace(/"/g, '""')} (TOTALS)"`,
        `"${selectedRide?.floor || 'N/A'}"`,
        grandTotalPkg,
        grandTotalTkt,
        grandTotalGuests
      ].join(','));
    } else {
      filename = `Guest_Count_Report_All_Games_${startDate || 'All'}_to_${endDate || 'All'}.csv`;

      // Header with Overall Totals + Game-wise columns (Package, Ticket, Total)
      const headers = [
        'Date',
        'Total Guests (All)',
        'Total Package Count',
        'Total Ticket Count',
        ...targetRides.flatMap(r => [
          `"${r.name.replace(/"/g, '""')} (Package)"`,
          `"${r.name.replace(/"/g, '""')} (Ticket)"`,
          `"${r.name.replace(/"/g, '""')} (Total)"`
        ])
      ];
      csvLines.push(headers.join(','));

      reportData.forEach(row => {
        grandTotalPkg += row.totalPkg;
        grandTotalTkt += row.totalTkt;
        grandTotalGuests += row.total;

        const rideColumns: number[] = [];
        targetRides.forEach(r => {
          let pkg = Number(row.pkgCounts[r.id] !== undefined ? row.pkgCounts[r.id] : (row.pkgCounts[String(r.id)] || 0));
          let tkt = Number(row.tktCounts[r.id] !== undefined ? row.tktCounts[r.id] : (row.tktCounts[String(r.id)] || 0));
          const raw = Number(row.counts[r.id] !== undefined ? row.counts[r.id] : (row.counts[String(r.id)] || 0));
          if (pkg === 0 && tkt === 0 && raw > 0) {
            pkg = raw;
          }
          const rideTot = pkg + tkt;

          gameTotalsMap[r.id].pkg += pkg;
          gameTotalsMap[r.id].tkt += tkt;
          gameTotalsMap[r.id].total += rideTot;

          rideColumns.push(pkg, tkt, rideTot);
        });

        csvLines.push([
          row.date,
          row.total,
          row.totalPkg,
          row.totalTkt,
          ...rideColumns
        ].join(','));
      });

      // Grand Total Row across all dates
      const grandTotalRideColumns: number[] = [];
      targetRides.forEach(r => {
        grandTotalRideColumns.push(
          gameTotalsMap[r.id].pkg,
          gameTotalsMap[r.id].tkt,
          gameTotalsMap[r.id].total
        );
      });

      csvLines.push([
        'TOTAL SUMMARY (ALL DATES)',
        grandTotalGuests,
        grandTotalPkg,
        grandTotalTkt,
        ...grandTotalRideColumns
      ].join(','));

      // Dedicated Game-Wise Summary Breakdown Table
      csvLines.push('');
      csvLines.push('"=== GAME-WISE TOTAL GUEST COUNT BREAKDOWN ==="');
      csvLines.push(['Game / Ride ID', 'Game / Ride Name', 'Floor', 'Total Package Count', 'Total Ticket Count', 'Total Guest Count'].join(','));

      targetRides.forEach(r => {
        csvLines.push([
          r.id,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.floor || 'N/A'}"`,
          gameTotalsMap[r.id].pkg,
          gameTotalsMap[r.id].tkt,
          gameTotalsMap[r.id].total
        ].join(','));
      });

      csvLines.push([
        'ALL',
        '"ALL GAMES COMBINED"',
        '--',
        grandTotalPkg,
        grandTotalTkt,
        grandTotalGuests
      ].join(','));
    }

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Export Bar */}
      <div className="bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Guest Count Reports</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Historical guest entry analytics with date-range filters, particular game search, and CSV download
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCSV}
          disabled={reportData.length === 0}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Report (CSV)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Guests in Range</span>
          <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">{overallTotalGuests.toLocaleString()}</h3>
        </div>

        <div className="bg-gradient-to-br from-blue-950/40 to-gray-800 rounded-xl p-4 border border-blue-800/50 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">Package Entries</span>
          <h3 className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">{overallPackageGuests.toLocaleString()}</h3>
        </div>

        <div className="bg-gradient-to-br from-teal-950/40 to-gray-800 rounded-xl p-4 border border-teal-800/50 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">Ticket Entries</span>
          <h3 className="text-2xl sm:text-3xl font-black text-teal-400 mt-1">{overallTicketGuests.toLocaleString()}</h3>
        </div>
      </div>

      {/* Filter and Range Controls Bar */}
      <div className="bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-md space-y-4">
        {/* Date Range Inputs and Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1">Date Range:</span>
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-700">
              <span className="text-xs text-gray-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  userHasCustomRange.current = true;
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-700">
              <span className="text-xs text-gray-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  userHasCustomRange.current = true;
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-400 mr-1">Presets:</span>
            {(['today', '7days', '30days', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setRangePreset(p)}
                className="px-2.5 py-1 bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-gray-700 transition-colors cursor-pointer"
              >
                {p === 'today' ? 'Today' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Particular Game Filter and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Particular Game Dropdown */}
            <div className="w-full sm:w-72">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1">
                Filter Particular Game / Ride:
              </label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-gray-900 text-white border border-gray-700 hover:border-teal-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="all">🎮 All Games & Rides ({rides.length})</option>
                {rides.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.floor || 'Floor'})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Search Game:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type ride name or floor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 text-white pl-9 pr-3 py-2 rounded-xl text-xs border border-gray-700 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {selectedGameId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedGameId('all')}
              className="px-3 py-1.5 text-xs text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 rounded-xl font-semibold self-end sm:self-auto cursor-pointer"
            >
              Reset to All Games
            </button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-200 uppercase bg-gray-700/90 sticky top-0 backdrop-blur-md z-10 border-b border-gray-600">
              <tr>
                <th className="px-6 py-4">Date</th>
                {selectedGameId === 'all' ? (
                  <>
                    <th className="px-6 py-4 text-right">Total Guests</th>
                    <th className="px-6 py-4 text-right text-blue-300">Package</th>
                    <th className="px-6 py-4 text-right text-teal-300">Ticket</th>
                    {targetRides.map(ride => (
                      <th key={ride.id} className="px-6 py-4 whitespace-nowrap">{ride.name}</th>
                    ))}
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Game / Ride Name</th>
                    <th className="px-6 py-4">Floor</th>
                    <th className="px-6 py-4 text-right text-blue-300">Package Count</th>
                    <th className="px-6 py-4 text-right text-teal-300">Ticket Count</th>
                    <th className="px-6 py-4 text-right font-bold text-white">Total Guests</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {selectedGameId === 'all' ? (
                reportData.map((row, idx) => (
                  <tr key={row.date} className={`${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60'} hover:bg-gray-700/40 transition-colors`}>
                    <td className="px-6 py-3.5 font-medium text-white whitespace-nowrap font-mono">{row.date}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-white font-mono">{row.total.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-blue-400 font-mono">{row.totalPkg.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-teal-400 font-mono">{row.totalTkt.toLocaleString()}</td>
                    {targetRides.map(ride => {
                      let pkg = Number(row.pkgCounts[ride.id] !== undefined ? row.pkgCounts[ride.id] : (row.pkgCounts[String(ride.id)] || 0));
                      let tkt = Number(row.tktCounts[ride.id] !== undefined ? row.tktCounts[ride.id] : (row.tktCounts[String(ride.id)] || 0));
                      const raw = Number(row.counts[ride.id] !== undefined ? row.counts[ride.id] : (row.counts[String(ride.id)] || 0));
                      if (pkg === 0 && tkt === 0 && raw > 0) {
                        pkg = raw;
                      }
                      const rideVal = pkg + tkt;
                      return (
                        <td key={ride.id} className="px-6 py-3.5 text-right font-mono">
                          <div className="text-gray-200 font-bold">{rideVal.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">P:{pkg} • T:{tkt}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                reportData.map((row, idx) => {
                  const rId = Number(selectedGameId);
                  const selectedRide = rides.find(r => r.id === rId);
                  let pkg = Number(row.pkgCounts[rId] !== undefined ? row.pkgCounts[rId] : (row.pkgCounts[String(rId)] || 0));
                  let tkt = Number(row.tktCounts[rId] !== undefined ? row.tktCounts[rId] : (row.tktCounts[String(rId)] || 0));
                  const raw = Number(row.counts[rId] !== undefined ? row.counts[rId] : (row.counts[String(rId)] || 0));
                  if (pkg === 0 && tkt === 0 && raw > 0) {
                    pkg = raw;
                  }
                  const totalVal = pkg + tkt;

                  return (
                    <tr key={row.date} className={`${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60'} hover:bg-gray-700/40 transition-colors`}>
                      <td className="px-6 py-3.5 font-medium text-white whitespace-nowrap font-mono">{row.date}</td>
                      <td className="px-6 py-3.5 font-bold text-white">{selectedRide?.name}</td>
                      <td className="px-6 py-3.5 text-gray-400">{selectedRide?.floor || 'N/A'}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-blue-400 font-mono">{pkg.toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-teal-400 font-mono">{tkt.toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-right font-black text-white font-mono bg-gray-900/40">{totalVal.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}

              {reportData.length === 0 && (
                <tr>
                  <td colSpan={selectedGameId === 'all' ? targetRides.length + 4 : 6} className="px-6 py-12 text-center text-gray-500 italic">
                    No guest entry records found for the selected date range and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
            {reportData.length > 0 && (
              <tfoot className="text-xs text-white uppercase bg-gray-900/95 font-bold border-t-2 border-gray-600 sticky bottom-0 z-10 backdrop-blur-md">
                {selectedGameId === 'all' ? (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-amber-400 font-black text-xs tracking-wider">TOTALS IN RANGE</div>
                      <div className="text-[11px] text-gray-300 font-mono font-normal normal-case mt-0.5">
                        Date Range: <strong className="text-white font-semibold">{startDate || 'Earliest'}</strong> to <strong className="text-white font-semibold">{endDate || 'Latest'}</strong>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-white text-base bg-gray-950/80 border-x border-gray-700">
                      <div className="text-white text-base font-black">{overallTotalGuests.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-normal normal-case">Total Guests in Range</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-blue-400 text-sm">
                      <div className="text-blue-400 text-sm font-black">{overallPackageGuests.toLocaleString()}</div>
                      <div className="text-[10px] text-blue-300/70 font-normal normal-case">Package Entries</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-teal-400 text-sm">
                      <div className="text-teal-400 text-sm font-black">{overallTicketGuests.toLocaleString()}</div>
                      <div className="text-[10px] text-teal-300/70 font-normal normal-case">Ticket Entries</div>
                    </td>
                    {targetRides.map(ride => {
                      let rTot = 0;
                      let rPkg = 0;
                      let rTkt = 0;
                      reportData.forEach(row => {
                        let p = Number(row.pkgCounts[ride.id] !== undefined ? row.pkgCounts[ride.id] : (row.pkgCounts[String(ride.id)] || 0));
                        let t = Number(row.tktCounts[ride.id] !== undefined ? row.tktCounts[ride.id] : (row.tktCounts[String(ride.id)] || 0));
                        const raw = Number(row.counts[ride.id] !== undefined ? row.counts[ride.id] : (row.counts[String(ride.id)] || 0));
                        if (p === 0 && t === 0 && raw > 0) {
                          p = raw;
                        }
                        const val = p + t;
                        rPkg += p;
                        rTkt += t;
                        rTot += val;
                      });
                      return (
                        <td key={ride.id} className="px-6 py-4 text-right font-mono text-xs">
                          <div className="text-white font-bold">{rTot.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400 font-normal normal-case">P:{rPkg.toLocaleString()} • T:{rTkt.toLocaleString()}</div>
                        </td>
                      );
                    })}
                  </tr>
                ) : (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-amber-400 font-black text-xs tracking-wider">TOTALS IN RANGE</div>
                      <div className="text-[11px] text-gray-300 font-mono font-normal normal-case mt-0.5">
                        Date Range: <strong className="text-white font-semibold">{startDate || 'Earliest'}</strong> to <strong className="text-white font-semibold">{endDate || 'Latest'}</strong>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      <div>{rides.find(r => String(r.id) === selectedGameId)?.name}</div>
                      <div className="text-[10px] text-teal-400 normal-case font-normal">Filtered Game</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{rides.find(r => String(r.id) === selectedGameId)?.floor || '--'}</td>
                    <td className="px-6 py-4 text-right font-black font-mono text-blue-400 text-sm">
                      <div className="text-blue-400 text-sm font-black">{overallPackageGuests.toLocaleString()}</div>
                      <div className="text-[10px] text-blue-300/70 font-normal normal-case">Package Entries</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-teal-400 text-sm">
                      <div className="text-teal-400 text-sm font-black">{overallTicketGuests.toLocaleString()}</div>
                      <div className="text-[10px] text-teal-300/70 font-normal normal-case">Ticket Entries</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-white text-base bg-gray-950/80 border-l border-gray-700">
                      <div className="text-white text-base font-black">{overallTotalGuests.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-normal normal-case">Total Guests in Range</div>
                    </td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export const normalizeAssigneeIds = (raw: any): number[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(Number).filter(n => !isNaN(n) && n > 0);
  }
  if (typeof raw === 'object') {
    return Object.values(raw).map(Number).filter(n => !isNaN(n) && n > 0);
  }
  const n = Number(raw);
  return (!isNaN(n) && n > 0) ? [n] : [];
};

const GenericAssignmentView = ({ 
  items, 
  personnel, 
  assignments, 
  onSave, 
  selectedDate, 
  title,
  itemNameKey = 'name',
  attendance = [],
  onCopyPrevious,
  canCopyPrevious,
  latestRecordedDate
}: any) => {
  const [localAssignments, setLocalAssignments] = useState<Record<string, number[]>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize with parent assignments when date or incoming assignments change
  React.useEffect(() => {
    const parentData = assignments[selectedDate] || {};
    const normalized: Record<string, number[]> = {};
    Object.entries(parentData).forEach(([k, v]) => {
      const arr = normalizeAssigneeIds(v);
      if (arr.length > 0) {
        normalized[k] = arr;
      }
    });
    setLocalAssignments(normalized);
  }, [selectedDate, assignments]);

  const handleAssign = (itemId: string, personnelId: string) => {
    const pId = Number(personnelId);
    if (!pId) return;

    const currentAssignees = normalizeAssigneeIds(localAssignments[itemId] || localAssignments[String(itemId)]);
    if (currentAssignees.includes(pId)) return;

    const updated = {
      ...localAssignments,
      [itemId]: [...currentAssignees, pId]
    };
    setLocalAssignments(updated);
    setSaveStatus('saving');
    onSave(selectedDate, updated);
    setTimeout(() => setSaveStatus('saved'), 400);
    setTimeout(() => setSaveStatus('idle'), 3500);
  };

  const handleRemove = (itemId: string, personnelId: number) => {
    const currentAssignees = normalizeAssigneeIds(localAssignments[itemId] || localAssignments[String(itemId)]);
    const filtered = currentAssignees.filter(id => id !== Number(personnelId));
    const updated = { ...localAssignments };
    if (filtered.length > 0) {
      updated[itemId] = filtered;
    } else {
      delete updated[itemId];
    }
    setLocalAssignments(updated);
    setSaveStatus('saving');
    onSave(selectedDate, updated);
    setTimeout(() => setSaveStatus('saved'), 400);
    setTimeout(() => setSaveStatus('idle'), 3500);
  };

  const handleClearAll = () => {
    if (window.confirm(`Are you sure you want to clear all assignments for ${selectedDate}?`)) {
      setLocalAssignments({});
      setSaveStatus('saving');
      onSave(selectedDate, {});
      setTimeout(() => setSaveStatus('saved'), 400);
      setTimeout(() => setSaveStatus('idle'), 3500);
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    onSave(selectedDate, localAssignments);
    setTimeout(() => setSaveStatus('saved'), 400);
    setTimeout(() => setSaveStatus('idle'), 4000);
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item: any) => {
      const name = String(item[itemNameKey] || '').toLowerCase();
      const id = String(item.id || '').toLowerCase();
      const floor = String(item.floor || item.location || '').toLowerCase();
      return name.includes(q) || id.includes(q) || floor.includes(q);
    });
  }, [items, itemNameKey, searchQuery]);

  // Total stats
  const totalAssignedSlots = useMemo(() => {
    return Object.values(localAssignments).reduce<number>((sum: number, ids: any) => {
      const norm = normalizeAssigneeIds(ids);
      return sum + norm.length;
    }, 0);
  }, [localAssignments]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-lg gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
              {totalAssignedSlots} assigned
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Assign staff to operational locations. Changes save automatically in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {canCopyPrevious && onCopyPrevious && (
            <button 
              onClick={onCopyPrevious}
              type="button"
              className="bg-indigo-700/80 hover:bg-indigo-600 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border border-indigo-500/50 shadow flex items-center gap-1.5"
              title={`Copy all assignments from ${latestRecordedDate}`}
            >
              <span>📋 Copy from {latestRecordedDate}</span>
            </button>
          )}

          {Object.keys(localAssignments).length > 0 && (
            <button 
              onClick={handleClearAll}
              type="button"
              className="bg-red-950/40 hover:bg-red-900/60 text-red-300 active:scale-95 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-red-800/50 flex items-center gap-1"
              title="Clear all assignments for this date"
            >
              <span>🗑️ Clear All</span>
            </button>
          )}

          {/* Real-time Save Status Indicator */}
          {saveStatus === 'saving' && (
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 rounded-xl border border-amber-800/60 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 rounded-xl border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              All Saved!
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="text-xs text-gray-400 hidden sm:inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
              Auto-save active
            </span>
          )}

          <button 
            onClick={handleSave}
            type="button"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-5 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 border border-blue-400/30 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Assignments
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-3 bg-gray-800/90 p-3 rounded-xl border border-gray-700">
        <svg className="w-4 h-4 text-gray-400 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${items.length} locations by name or ID...`}
          className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item: any) => {
          const assignees = normalizeAssigneeIds(localAssignments[item.id] || localAssignments[String(item.id)]);
          return (
            <div key={item.id} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-md hover:border-gray-600 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-700/70">
                  <div>
                    <h3 className="font-bold text-base text-white">{item[itemNameKey]}</h3>
                    {item.floor && (
                      <span className="text-[11px] text-gray-400">{item.floor}</span>
                    )}
                    {item.location && (
                      <span className="text-[11px] text-gray-400">{item.location}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                    assignees.length > 0 
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/60' 
                      : 'bg-gray-750 text-gray-400 border-gray-600/60'
                  }`}>
                    {assignees.length} assigned
                  </span>
                </div>
                
                <div className="mb-4 space-y-2">
                  {assignees.map((pId: number) => {
                    const person = personnel.find((p: any) => Number(p.id) === Number(pId) || String(p.id) === String(pId));
                    const isPresent = attendance.some((a: any) => 
                      (Number(a.operatorId) === Number(pId) || String(a.operatorId) === String(pId)) && 
                      a.date === selectedDate
                    );

                    return (
                      <div key={pId} className="flex justify-between items-center bg-gray-750/70 px-3 py-2 rounded-xl border border-gray-700 group hover:border-gray-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isPresent ? 'bg-emerald-400 ring-2 ring-emerald-900' : 'bg-gray-500'}`} title={isPresent ? 'Present today' : 'Attendance not logged'} />
                          <span className="text-gray-200 text-sm font-medium">{person?.name || `Personnel #${pId}`}</span>
                          {isPresent && (
                            <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 bg-emerald-950/80 rounded border border-emerald-800/60">
                              Present
                            </span>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemove(item.id.toString(), pId)} 
                          className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-950/40 transition-colors"
                          title="Remove assignment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                  {assignees.length === 0 && (
                    <div className="py-4 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                      <p className="text-gray-500 text-xs italic">No personnel assigned to this location.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/80">
                <select 
                  className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssign(item.id.toString(), e.target.value);
                    }
                  }}
                >
                  <option value="">+ Assign Person ({personnel.length} available)...</option>
                  {personnel.map((p: any) => {
                    const isAlreadyOnThisItem = assignees.map(Number).includes(Number(p.id));
                    const isPresent = attendance.some((a: any) => 
                      (Number(a.operatorId) === Number(p.id) || String(a.operatorId) === String(p.id)) && 
                      a.date === selectedDate
                    );

                    return (
                      <option 
                        key={p.id} 
                        value={p.id}
                        disabled={isAlreadyOnThisItem}
                      >
                        {isAlreadyOnThisItem ? `✓ ${p.name} (Already Assigned)` : `${p.name} ${isPresent ? '● Present' : ''}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AssignmentView = (props: any) => (
  <GenericAssignmentView 
    {...props} 
    items={props.rides} 
    personnel={props.operators} 
    assignments={props.dailyAssignments} 
    title={`Games & Ride Associate Assignments: ${props.selectedDate}`} 
    onCopyPrevious={props.onCopyPrevious}
    canCopyPrevious={props.canCopyPrevious}
    latestRecordedDate={props.latestRecordedDate}
  />
);

export const TicketSalesAssignmentView = (props: any) => (
  <GenericAssignmentView 
    {...props} 
    items={props.counters} 
    personnel={props.ticketSalesPersonnel} 
    assignments={props.dailyAssignments} 
    title={`Sales Assignments: ${props.selectedDate}`} 
    onCopyPrevious={props.onCopyPrevious}
    canCopyPrevious={props.canCopyPrevious}
    latestRecordedDate={props.latestRecordedDate}
  />
);

export const ExpertiseReport = ({ operators, dailyAssignments, rides }: any) => {
  const stats = useMemo(() => {
    const data: Record<number, Record<number, number>> = {};
    if (!dailyAssignments || typeof dailyAssignments !== 'object') return data;
    Object.values(dailyAssignments).forEach((dayAssignments: any) => {
      if (!dayAssignments || typeof dayAssignments !== 'object') return;
      Object.entries(dayAssignments).forEach(([rideId, opIds]: [string, any]) => {
        const ids = normalizeAssigneeIds(opIds);
        ids.forEach((opId: number) => {
          if (!data[opId]) data[opId] = {};
          data[opId][Number(rideId)] = (data[opId][Number(rideId)] || 0) + 1;
        });
      });
    });
    return data;
  }, [dailyAssignments]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-white mb-6">Expertise & Assignment History</h2>
      <div className="grid gap-6">
        {operators.map((op: Operator) => (
          <div key={op.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-blue-400 mb-4">{op.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {rides.map((ride: Ride) => {
                const count = stats[op.id]?.[ride.id] || 0;
                return (
                  <div key={ride.id} className={`p-3 rounded-lg border ${count > 0 ? 'bg-blue-900/20 border-blue-800' : 'bg-gray-900/50 border-gray-800'} flex flex-col items-center justify-center text-center`}>
                    <span className="text-xs text-gray-400 mb-1 h-8 flex items-center justify-center line-clamp-2">{ride.name}</span>
                    <span className={`text-xl font-bold ${count > 5 ? 'text-green-400' : count > 0 ? 'text-blue-300' : 'text-gray-600'}`}>
                      {count}
                    </span>
                    <span className="text-[10px] uppercase text-gray-500 mt-1">Assignments</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TicketSalesExpertiseReport = ({ ticketSalesPersonnel, dailyAssignments, counters }: any) => {
  return <ExpertiseReport operators={ticketSalesPersonnel} dailyAssignments={dailyAssignments} rides={counters} />;
};

// Individual Assigned Ride Card in My Roster with Guest count (Package), Guest count (Ticket), Total guest count, and Issue reporting
const RosterRideCard: React.FC<{
  ride: Ride & { count?: number; packageCount?: number; ticketCount?: number };
  onPackageCountChange?: (id: number, count: number) => void;
  onIncrementPackageCount?: (id: number, delta: number) => void;
  onTicketCountChange?: (id: number, count: number) => void;
  onIncrementTicketCount?: (id: number, delta: number) => void;
  onCountChange?: (id: number, count: number) => void;
  onIncrementCount?: (id: number, delta: number) => void;
  onNavigate?: (view: string) => void;
  onReportIssue?: (ride: Ride, problem: string) => void;
  activeIssuesForRide?: MaintenanceTicket[];
}> = ({
  ride,
  onPackageCountChange,
  onIncrementPackageCount,
  onTicketCountChange,
  onIncrementTicketCount,
  onCountChange,
  onIncrementCount,
  onReportIssue,
  activeIssuesForRide = []
}) => {
  let packageCount = Number(ride.packageCount !== undefined ? ride.packageCount : 0);
  const ticketCount = Number(ride.ticketCount !== undefined ? ride.ticketCount : 0);
  const rawCount = Number(ride.count !== undefined ? ride.count : 0);
  if (packageCount === 0 && ticketCount === 0 && rawCount > 0) {
    packageCount = rawCount;
  }

  const [packageInput, setPackageInput] = useState<string>(String(packageCount));
  const [ticketInput, setTicketInput] = useState<string>(String(ticketCount));
  const [isPkgEditing, setIsPkgEditing] = useState(false);
  const [isTktEditing, setIsTktEditing] = useState(false);
  const [justSavedPkg, setJustSavedPkg] = useState(false);
  const [justSavedTkt, setJustSavedTkt] = useState(false);

  // Live values: if actively typing, dynamically reflect in-progress input, otherwise display current saved counts
  const currentPkgVal = isPkgEditing ? Math.max(0, parseInt(packageInput, 10) || 0) : packageCount;
  const currentTktVal = isTktEditing ? Math.max(0, parseInt(ticketInput, 10) || 0) : ticketCount;
  const totalGuestCount = currentPkgVal + currentTktVal;

  // Issue reporting states
  const [issueText, setIssueText] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSubmitNotice, setIssueSubmitNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isPkgEditing) {
      setPackageInput(String(packageCount));
    }
  }, [packageCount, isPkgEditing]);

  React.useEffect(() => {
    if (!isTktEditing) {
      setTicketInput(String(ticketCount));
    }
  }, [ticketCount, isTktEditing]);

  const handleSavePackage = () => {
    const val = Math.max(0, parseInt(packageInput, 10) || 0);
    setPackageInput(String(val));
    setIsPkgEditing(false);
    if (val !== packageCount) {
      if (onPackageCountChange) {
        onPackageCountChange(ride.id, val);
      }
      if (onCountChange) {
        onCountChange(ride.id, val + ticketCount);
      }
      setJustSavedPkg(true);
      setTimeout(() => setJustSavedPkg(false), 2000);
    }
  };

  const handleQuickAddPackage = (delta: number) => {
    setIsPkgEditing(false);
    const newCount = Math.max(0, packageCount + delta);
    setPackageInput(String(newCount));
    if (onIncrementPackageCount) {
      onIncrementPackageCount(ride.id, delta);
    } else if (onPackageCountChange) {
      onPackageCountChange(ride.id, newCount);
    } else if (onIncrementCount) {
      onIncrementCount(ride.id, delta);
    }
    if (onCountChange) {
      onCountChange(ride.id, newCount + ticketCount);
    }
    setJustSavedPkg(true);
    setTimeout(() => setJustSavedPkg(false), 2000);
  };

  const handleSaveTicket = () => {
    const val = Math.max(0, parseInt(ticketInput, 10) || 0);
    setTicketInput(String(val));
    setIsTktEditing(false);
    if (val !== ticketCount) {
      if (onTicketCountChange) {
        onTicketCountChange(ride.id, val);
      }
      if (onCountChange) {
        onCountChange(ride.id, packageCount + val);
      }
      setJustSavedTkt(true);
      setTimeout(() => setJustSavedTkt(false), 2000);
    }
  };

  const handleQuickAddTicket = (delta: number) => {
    setIsTktEditing(false);
    const newCount = Math.max(0, ticketCount + delta);
    setTicketInput(String(newCount));
    if (onIncrementTicketCount) {
      onIncrementTicketCount(ride.id, delta);
    } else if (onTicketCountChange) {
      onTicketCountChange(ride.id, newCount);
    } else if (onIncrementCount) {
      onIncrementCount(ride.id, delta);
    }
    if (onCountChange) {
      onCountChange(ride.id, packageCount + newCount);
    }
    setJustSavedTkt(true);
    setTimeout(() => setJustSavedTkt(false), 2000);
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim() || !onReportIssue) return;
    setIsSubmittingIssue(true);
    try {
      await onReportIssue(ride, issueText.trim());
      setIssueSubmitNotice(`Issue for ${ride.name} sent directly to Maintenance Dashboard → Reported Issues (Associates)!`);
      setIssueText('');
      setTimeout(() => setIssueSubmitNotice(null), 6000);
    } catch (err) {
      setIssueSubmitNotice(`Failed to report issue. Please retry.`);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Find most recent tickets for this ride
  const latestResolved = activeIssuesForRide.find(t => t.status === 'solved');
  const latestInProgress = activeIssuesForRide.find(t => t.status === 'in-progress');
  const latestReported = activeIssuesForRide.find(t => t.status === 'reported');

  return (
    <div className="bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700 shadow-xl flex flex-col gap-4 transition-all hover:border-gray-600">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/30 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
            🎢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-bold text-white tracking-wide">{ride.name}</h4>
            </div>
            <span className="text-xs text-blue-400 font-medium tracking-wide uppercase">{ride.floor || 'Floor'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {latestInProgress && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/70 animate-pulse">
              <Wrench className="w-3 h-3 text-blue-400" />
              Repair In Progress
            </span>
          )}
          {latestReported && !latestInProgress && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/70">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Issue Reported
            </span>
          )}
          {latestResolved && !latestInProgress && !latestReported && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/70">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Operational (Resolved)
            </span>
          )}
        </div>
      </div>

      {/* Row 1: Guest count (Package) */}
      <div className="bg-gray-900/90 rounded-xl p-3.5 sm:p-4 border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">Guest count (Package)</span>
              {justSavedPkg && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700 font-semibold animate-pulse">
                  Auto-saved ✓
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">Guests entering via package pass</span>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => handleQuickAddPackage(-1)}
            className="h-10 w-10 rounded-xl bg-gray-800 hover:bg-red-950/60 active:bg-red-900 text-red-400 active:scale-95 flex items-center justify-center text-xl font-black border border-gray-700 shadow cursor-pointer transition-all"
            title="Decrease 1 (Auto-saves)"
          >
            -
          </button>
          <input
            type="number"
            min="0"
            value={packageInput}
            onChange={(e) => {
              setPackageInput(e.target.value);
              setIsPkgEditing(true);
            }}
            onBlur={handleSavePackage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSavePackage();
            }}
            className="w-20 sm:w-24 bg-gray-800 text-xl font-mono font-bold text-blue-400 text-center py-1.5 px-2 rounded-xl border border-gray-600 focus:border-blue-500 outline-none"
          />
          <button
            type="button"
            onClick={() => handleQuickAddPackage(1)}
            className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white active:scale-95 flex items-center justify-center text-xl font-black shadow-lg shadow-blue-900/30 cursor-pointer transition-all"
            title="Increase 1 (Auto-saves)"
          >
            +
          </button>

          <div className="hidden sm:flex gap-1.5 pl-1">
            {[5, 10, 25].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAddPackage(amt)}
                className="text-xs font-bold px-2.5 py-1.5 bg-gray-800 hover:bg-blue-900/40 text-gray-300 hover:text-blue-300 rounded-lg border border-gray-700 cursor-pointer active:scale-95 transition-all"
                title={`Add ${amt} (Auto-saves)`}
              >
                +{amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Guest count (Ticket) */}
      <div className="bg-gray-900/90 rounded-xl p-3.5 sm:p-4 border border-teal-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">Guest count (Ticket)</span>
              {justSavedTkt && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700 font-semibold animate-pulse">
                  Auto-saved ✓
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">Guests entering via single ticket / counter token</span>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => handleQuickAddTicket(-1)}
            className="h-10 w-10 rounded-xl bg-gray-800 hover:bg-red-950/60 active:bg-red-900 text-red-400 active:scale-95 flex items-center justify-center text-xl font-black border border-gray-700 shadow cursor-pointer transition-all"
            title="Decrease 1 (Auto-saves)"
          >
            -
          </button>
          <input
            type="number"
            min="0"
            value={ticketInput}
            onChange={(e) => {
              setTicketInput(e.target.value);
              setIsTktEditing(true);
            }}
            onBlur={handleSaveTicket}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTicket();
            }}
            className="w-20 sm:w-24 bg-gray-800 text-xl font-mono font-bold text-teal-400 text-center py-1.5 px-2 rounded-xl border border-gray-600 focus:border-teal-500 outline-none"
          />
          <button
            type="button"
            onClick={() => handleQuickAddTicket(1)}
            className="h-10 w-10 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white active:scale-95 flex items-center justify-center text-xl font-black shadow-lg shadow-teal-900/30 cursor-pointer transition-all"
            title="Increase 1 (Auto-saves)"
          >
            +
          </button>

          <div className="hidden sm:flex gap-1.5 pl-1">
            {[5, 10, 25].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAddTicket(amt)}
                className="text-xs font-bold px-2.5 py-1.5 bg-gray-800 hover:bg-teal-900/40 text-gray-300 hover:text-teal-300 rounded-lg border border-gray-700 cursor-pointer active:scale-95 transition-all"
                title={`Add ${amt} (Auto-saves)`}
              >
                +{amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Total guest count sum */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-gray-900 to-indigo-950/80 p-3.5 sm:p-4 rounded-xl border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-bold text-indigo-300">Total guest count:</span>
          <span className="text-xs sm:text-sm text-gray-200">
            (Package: <strong className="text-blue-400 font-mono font-bold">{currentPkgVal}</strong>) + (Ticket: <strong className="text-teal-400 font-mono font-bold">{currentTktVal}</strong>)
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight bg-gray-800/90 px-4 py-1 rounded-xl border border-indigo-400/40 shadow-inner">
            {totalGuestCount}
          </span>
          <span className="text-xs sm:text-sm font-bold text-indigo-200 uppercase tracking-wide">Guests</span>
        </div>
      </div>

      {/* Row 4: Attached with total count - Issue reporting for assigned ride */}
      <div className="pt-2 border-t border-gray-700/80 space-y-3">
        {/* Notification to Associate if ride has a newly resolved issue */}
        {latestResolved && (
          <div className="bg-emerald-950/60 border border-emerald-600/70 p-3 rounded-xl flex items-start gap-3 text-xs text-emerald-200 shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-white flex items-center gap-2">
                <span>Notification: Reported Issue Resolved!</span>
                {latestResolved.solvedAt && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ({new Date(latestResolved.solvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
              <p className="text-emerald-300/90 mt-0.5">
                {latestResolved.resolutionNotes || latestResolved.problem}
              </p>
              {latestResolved.assignedToName && (
                <div className="text-[11px] text-emerald-400 font-medium mt-1">
                  Resolved by technician: <strong>{latestResolved.assignedToName}</strong>. Your ride is certified operational!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status if currently in-progress */}
        {latestInProgress && (
          <div className="bg-blue-950/50 border border-blue-600/60 p-3 rounded-xl flex items-start gap-3 text-xs text-blue-200 shadow-sm">
            <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <span className="font-bold text-white">Technician In Progress:</span>
              <p className="text-blue-300 mt-0.5">{latestInProgress.problem}</p>
              <div className="text-[11px] text-blue-400 mt-1">
                Assigned to: <strong>{latestInProgress.assignedToName || 'Maintenance Tech'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Status if currently reported and awaiting maintenance technician */}
        {latestReported && !latestInProgress && (
          <div className="bg-red-950/50 border border-red-600/60 p-3 rounded-xl flex items-start gap-3 text-xs text-red-200 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Issue Pending in Maintenance:</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700 font-semibold">
                  Reported Issues (Associates)
                </span>
              </div>
              <p className="text-red-300 mt-0.5">{latestReported.problem}</p>
              <div className="text-[11px] text-red-400 mt-1">
                Awaiting technician dispatch • Reported by {latestReported.reportedByName || 'Associate'}
              </div>
            </div>
          </div>
        )}

        {/* Issue Report Form */}
        <form onSubmit={handleSubmitIssue} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Report Issue for Assigned Ride (Maintenance Dashboard)
            </label>
            <span className="text-[11px] text-gray-400">Directly routes to Reported Issues (Associates)</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder={`Write issue for ${ride.name} (e.g. sensor delay, harness lock, strange sound)...`}
              className="flex-1 bg-gray-900 text-white text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!issueText.trim() || isSubmittingIssue}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          </div>

          {issueSubmitNotice && (
            <div className="text-xs text-amber-300 bg-amber-950/70 border border-amber-500/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>{issueSubmitNotice}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export const DailyRoster = ({ 
  rides, operators, dailyAssignments, selectedDate, onDateChange, 
  role, currentUser, attendance, onNavigate, onCountChange, onIncrementCount, 
  onPackageCountChange, onIncrementPackageCount, onTicketCountChange, onIncrementTicketCount,
  onReportProblem, maintenanceTickets,
  hasCheckedInToday, onClockIn, isCheckinAllowed,
  onSaveAssignments, onCopyAssignmentsFromPrevious, canCopyAssignments, latestRecordedDate
}: any) => {
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [selectedCopyDate, setSelectedCopyDate] = useState(latestRecordedDate || '');
  const [rosterRangeFrom, setRosterRangeFrom] = useState(selectedDate);
  const [rosterRangeTo, setRosterRangeTo] = useState(selectedDate);
  const [showRangeExport, setShowRangeExport] = useState(false);

  const availablePriorDates = useMemo(() => {
    if (!dailyAssignments) return [];
    return Object.keys(dailyAssignments)
      .filter(d => d < selectedDate && dailyAssignments[d] && Object.keys(dailyAssignments[d]).length > 0)
      .sort()
      .reverse();
  }, [dailyAssignments, selectedDate]);

  useEffect(() => {
    if (latestRecordedDate) {
      setSelectedCopyDate(latestRecordedDate);
    }
  }, [latestRecordedDate]);
  
  if (role === 'admin' || role === 'operation-officer') {
    const assignments = dailyAssignments[selectedDate] || {};

    const handleAssignToRide = (rideId: number, opId: number) => {
      if (!opId) return;
      const currentList = normalizeAssigneeIds(assignments[rideId] || assignments[String(rideId)]);
      if (currentList.includes(Number(opId))) return;
      const updatedList = [...currentList, Number(opId)];
      const updatedAssignments = {
        ...assignments,
        [rideId]: updatedList
      };
      if (onSaveAssignments) {
        onSaveAssignments(selectedDate, updatedAssignments);
      }
    };

    const handleRemoveFromRide = (rideId: number, opId: number) => {
      const currentList = normalizeAssigneeIds(assignments[rideId] || assignments[String(rideId)]);
      const updatedList = currentList.filter((id: number) => id !== Number(opId));
      const updatedAssignments = { ...assignments };
      if (updatedList.length > 0) {
        updatedAssignments[rideId] = updatedList;
      } else {
        delete updatedAssignments[rideId];
      }
      if (onSaveAssignments) {
        onSaveAssignments(selectedDate, updatedAssignments);
      }
    };

    // Compute distinct assigned operator IDs across all rides on selectedDate
    const assignedIdsSet = new Set<number>();
    let totalAssignmentSlots = 0;
    rides.forEach((ride: Ride) => {
      const assignedIds = normalizeAssigneeIds(assignments[ride.id] || assignments[String(ride.id)]);
      totalAssignmentSlots += assignedIds.length;
      assignedIds.forEach((id: number) => assignedIdsSet.add(id));
    });

    const assignedOperatorsList = Array.from(assignedIdsSet);
    
    // Count Present and Absent among assigned operators
    let assignedPresentCount = 0;
    let assignedAbsentCount = 0;

    assignedOperatorsList.forEach((id: number) => {
      const isPresent = attendance.some((a: AttendanceRecord) => 
        (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && 
        a.date === selectedDate
      );
      if (isPresent) {
        assignedPresentCount++;
      } else {
        assignedAbsentCount++;
      }
    });

    // Total personnel pool count
    const totalPoolCount = operators.length;
    const totalPoolPresent = operators.filter((op: Operator) =>
      attendance.some((a: AttendanceRecord) => a.operatorId === op.id && a.date === selectedDate)
    ).length;
    const totalPoolAbsent = totalPoolCount - totalPoolPresent;

    // Helper to generate export data for assigned staff
    const getStaffListForDate = (targetDate: string, categoryFilter?: 'all' | 'present' | 'absent') => {
      const dateAssignments = dailyAssignments[targetDate] || {};
      const targetAssignedIds = new Set<number>();
      rides.forEach((r: Ride) => {
        const ids = normalizeAssigneeIds(dateAssignments[r.id] || dateAssignments[String(r.id)]);
        ids.forEach(id => targetAssignedIds.add(id));
      });

      return Array.from(targetAssignedIds).map(id => {
        const op = operators.find((o: Operator) => Number(o.id) === Number(id));
        const att = attendance.find((a: AttendanceRecord) => 
          (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && 
          a.date === targetDate
        );
        const isPresent = Boolean(att);
        const assignedRides = rides.filter((r: Ride) => {
          const ids = normalizeAssigneeIds(dateAssignments[r.id] || dateAssignments[String(r.id)]);
          return ids.includes(Number(id));
        }).map((r: Ride) => r.name).join('; ');

        return {
          date: targetDate,
          id,
          name: op?.name || `Associate #${id}`,
          phone: op?.phone || 'N/A',
          role: op?.role || 'Games & Rides Associate',
          assignedRides: assignedRides || 'None',
          status: isPresent ? 'Present' : 'Absent',
          clockInTime: att?.clockInTime || (isPresent ? 'Present' : 'Not Clocked In')
        };
      }).filter(s => {
        if (categoryFilter === 'present') return s.status === 'Present';
        if (categoryFilter === 'absent') return s.status === 'Absent';
        return true;
      });
    };

    // Single-date CSV download for Assigned, Present, or Absent
    const handleDownloadSingleDateRoster = (category: 'Assigned' | 'Present' | 'Absent') => {
      const filterType = category === 'Present' ? 'present' : (category === 'Absent' ? 'absent' : 'all');
      const list = getStaffListForDate(selectedDate, filterType);
      
      const headers = ['Date', 'Associate ID', 'Associate Name', 'Phone', 'Role', 'Assigned Rides', 'Attendance Status', 'Clock In Time'];
      const rows = list.map(item => [
        item.date,
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.phone}"`,
        `"${item.role}"`,
        `"${item.assignedRides.replace(/"/g, '""')}"`,
        item.status,
        `"${item.clockInTime}"`
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Roster_${category}_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    // Date-range CSV download
    const handleDownloadDateRangeRoster = (category: 'Assigned' | 'Present' | 'Absent' | 'All') => {
      const start = rosterRangeFrom <= rosterRangeTo ? rosterRangeFrom : rosterRangeTo;
      const end = rosterRangeFrom <= rosterRangeTo ? rosterRangeTo : rosterRangeFrom;

      // Gather distinct dates in range
      const datesInRange: string[] = [];
      const cur = new Date(start);
      const stop = new Date(end);
      while (cur <= stop) {
        datesInRange.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }

      const filterType = category === 'Present' ? 'present' : (category === 'Absent' ? 'absent' : 'all');
      const allRows: any[] = [];
      datesInRange.forEach(d => {
        const staff = getStaffListForDate(d, filterType);
        staff.forEach(s => allRows.push(s));
      });

      const headers = ['Date', 'Associate ID', 'Associate Name', 'Phone', 'Role', 'Assigned Rides', 'Attendance Status', 'Clock In Time'];
      const rows = allRows.map(item => [
        item.date,
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.phone}"`,
        `"${item.role}"`,
        `"${item.assignedRides.replace(/"/g, '""')}"`,
        item.status,
        `"${item.clockInTime}"`
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Roster_${category}_${start}_to_${end}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    // Filter rides
    const filteredRides = rides.filter((ride: Ride) => {
      const assignedIds = normalizeAssigneeIds(assignments[ride.id] || assignments[String(ride.id)]);
      if (rosterFilter === 'unassigned' && assignedIds.length > 0) return false;
      if (rosterFilter === 'assigned' && assignedIds.length === 0) return false;
      if (!rosterSearch.trim()) return true;
      const q = rosterSearch.toLowerCase().trim();
      const matchName = ride.name.toLowerCase().includes(q);
      const matchFloor = (ride.floor || '').toLowerCase().includes(q);
      const matchOperator = assignedIds.some((id: number) => {
        const op = operators.find((o: Operator) => Number(o.id) === id);
        return op?.name.toLowerCase().includes(q);
      });
      return matchName || matchFloor || matchOperator;
    });

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-md gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Daily Roster</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60 font-semibold">
                {assignedOperatorsList.length} Associates on Duty
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Shift assignments and live associate attendance status</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {canCopyAssignments && onCopyAssignmentsFromPrevious && (
              <button
                type="button"
                onClick={() => onCopyAssignmentsFromPrevious(selectedCopyDate || latestRecordedDate)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1.5"
                title={`Copy previous roster from ${selectedCopyDate || latestRecordedDate}`}
              >
                <span>📋 Copy from {selectedCopyDate || latestRecordedDate}</span>
              </button>
            )}

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('assignments')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 text-gray-200 rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1.5 border border-gray-600"
              >
                <span>👥 Full Assignments Matrix</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">Date:</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => onDateChange(e.target.value)} 
                className="bg-transparent text-white text-sm outline-none cursor-pointer focus:text-blue-400" 
              />
            </div>
          </div>
        </div>

        {/* Quick Copy Alert when roster is unpopulated */}
        {assignedOperatorsList.length === 0 && canCopyAssignments && onCopyAssignmentsFromPrevious && (
          <div className="bg-gradient-to-r from-indigo-950/70 via-blue-950/60 to-purple-950/50 border border-indigo-500/60 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">📋</span>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">No Associates Assigned for {selectedDate}</h4>
                <p className="text-xs text-indigo-200/90 mt-0.5">
                  Previous operational roster is available from <strong>{selectedCopyDate || latestRecordedDate}</strong>. Choose a source date to restore for today:
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
              {availablePriorDates.length > 1 && (
                <select
                  value={selectedCopyDate || latestRecordedDate}
                  onChange={(e) => setSelectedCopyDate(e.target.value)}
                  className="bg-gray-900 border border-indigo-500/50 text-white text-xs px-2.5 py-2 rounded-xl outline-none"
                  title="Select source date to copy assignments from"
                >
                  {availablePriorDates.map(d => {
                    const count = Object.keys(dailyAssignments[d] || {}).length;
                    return (
                      <option key={d} value={d}>
                        {d} ({count} rides)
                      </option>
                    );
                  })}
                </select>
              )}
              <button
                type="button"
                onClick={() => onCopyAssignmentsFromPrevious(selectedCopyDate || latestRecordedDate)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap flex-grow sm:flex-grow-0 justify-center"
              >
                <span>📋 Restore Roster</span>
              </button>
            </div>
          </div>
        )}

        {/* Daily Roster Attendance Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Assigned */}
          <div className="bg-gray-800/90 rounded-xl p-3.5 sm:p-4 border border-gray-700 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Assigned</p>
                <h3 className="text-2xl font-bold text-white mt-1">{assignedOperatorsList.length}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{totalAssignmentSlots} assigned slot{totalAssignmentSlots !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-900/30 border border-blue-800/60 flex items-center justify-center text-blue-400 font-bold text-lg">
                👥
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-700/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDownloadSingleDateRoster('Assigned')}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title={`Download Assigned Staff CSV for ${selectedDate}`}
              >
                <Download className="w-3 h-3" />
                <span>Download ({selectedDate})</span>
              </button>
            </div>
          </div>

          {/* Total Present (Assigned) */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-gray-800 rounded-xl p-3.5 sm:p-4 border border-emerald-800/50 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Total Present
                </p>
                <h3 className="text-2xl font-bold text-emerald-300 mt-1">{assignedPresentCount}</h3>
                <p className="text-[11px] text-emerald-500/80 mt-0.5">
                  {assignedOperatorsList.length > 0 ? `${Math.round((assignedPresentCount / assignedOperatorsList.length) * 100)}% attendance` : 'No assignments'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-bold text-lg">
                ✓
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-900/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDownloadSingleDateRoster('Present')}
                className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title={`Download Present Staff CSV for ${selectedDate}`}
              >
                <Download className="w-3 h-3" />
                <span>Download ({selectedDate})</span>
              </button>
            </div>
          </div>

          {/* Total Absent (Assigned) */}
          <div className="bg-gradient-to-br from-red-950/40 to-gray-800 rounded-xl p-3.5 sm:p-4 border border-red-800/50 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Total Absent
                </p>
                <h3 className="text-2xl font-bold text-red-300 mt-1">{assignedAbsentCount}</h3>
                <p className="text-[11px] text-red-400/80 mt-0.5">
                  {assignedAbsentCount > 0 ? `${assignedAbsentCount} missing` : 'All present'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-900/40 border border-red-700/60 flex items-center justify-center text-red-300 font-bold text-lg">
                ✗
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-red-900/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDownloadSingleDateRoster('Absent')}
                className="text-[11px] font-semibold text-red-300 hover:text-red-200 bg-red-950/70 hover:bg-red-900/80 border border-red-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title={`Download Absent Staff CSV for ${selectedDate}`}
              >
                <Download className="w-3 h-3" />
                <span>Download ({selectedDate})</span>
              </button>
            </div>
          </div>

          {/* All Personnel Attendance Pool */}
          <div className="bg-gray-800/90 rounded-xl p-3.5 sm:p-4 border border-gray-700 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Staff Pool ({totalPoolCount})</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold text-emerald-400">{totalPoolPresent} <span className="text-xs font-normal text-gray-400">P</span></span>
                  <span className="text-gray-600">/</span>
                  <span className="text-lg font-bold text-red-400">{totalPoolAbsent} <span className="text-xs font-normal text-gray-400">A</span></span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Total registered pool</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-700/60 border border-gray-600 flex items-center justify-center text-gray-300 font-bold text-sm">
                📊
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-700/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowRangeExport(!showRangeExport)}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{showRangeExport ? 'Hide Range' : 'Date Range Wise ▾'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date-Range Roster Export Bar */}
        {showRangeExport && (
          <div className="bg-gray-850 p-4 rounded-xl border border-indigo-500/40 shadow-md flex flex-wrap items-center justify-between gap-3 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4" />
                Date Range Wise Roster Export:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">From:</span>
                <input
                  type="date"
                  value={rosterRangeFrom}
                  onChange={(e) => setRosterRangeFrom(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">To:</span>
                <input
                  type="date"
                  value={rosterRangeTo}
                  onChange={(e) => setRosterRangeTo(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadDateRangeRoster('Assigned')}
                className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Assigned Range</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadDateRangeRoster('Present')}
                className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Present Range</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadDateRangeRoster('Absent')}
                className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Absent Range</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-800/80 p-3 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 flex-grow bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-750">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Search by ride name, floor, or assigned associate..."
              className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-full"
            />
            {rosterSearch && (
              <button 
                type="button" 
                onClick={() => setRosterSearch('')}
                className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setRosterFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rosterFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              All Rides ({rides.length})
            </button>
            <button
              type="button"
              onClick={() => setRosterFilter('unassigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rosterFilter === 'unassigned'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-900/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              Unstaffed
            </button>
            <button
              type="button"
              onClick={() => setRosterFilter('assigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rosterFilter === 'assigned'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-900/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              Staffed
            </button>
          </div>
        </div>

        {/* Ride Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRides.map((ride: Ride) => {
            const assignedIds = normalizeAssigneeIds(assignments[ride.id] || assignments[String(ride.id)]);
            
            // Calculate card specific present and absent
            const ridePresentCount = assignedIds.filter((id: number) =>
              attendance.some((a: AttendanceRecord) => (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && a.date === selectedDate)
            ).length;
            const rideAbsentCount = assignedIds.length - ridePresentCount;

            return (
              <div key={ride.id} className="bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-md hover:border-gray-600 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2 pb-2 border-b border-gray-700/60">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white leading-tight">{ride.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ride.floor && (
                          <span className="text-[11px] text-gray-400">{ride.floor}</span>
                        )}
                        <span className="text-[11px] text-blue-400 font-medium">
                          {assignedIds.length} Associate{assignedIds.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {assignedIds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-lg font-semibold">
                          {ridePresentCount} P
                        </span>
                        {rideAbsentCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-950/60 text-red-300 border border-red-800/60 rounded-lg font-semibold">
                            {rideAbsentCount} A
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {assignedIds.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {assignedIds.map((id: number) => {
                        const op = operators.find((o: Operator) => Number(o.id) === id);
                        const att = attendance.find((a: AttendanceRecord) => (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && a.date === selectedDate);
                        return (
                          <div key={id} className="flex justify-between items-center text-xs sm:text-sm bg-gray-750/70 p-2 sm:p-2.5 rounded-xl border border-gray-700/60">
                            <span className="text-gray-200 font-medium truncate mr-2">{op?.name || `Associate #${id}`}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {att ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] px-2 py-0.5 bg-emerald-900/30 rounded-full border border-emerald-800 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-400 text-[11px] px-2 py-0.5 bg-red-900/30 rounded-full border border-red-800 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                  Absent
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveFromRide(ride.id, id)}
                                className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-950/40 transition-colors"
                                title={`Remove ${op?.name || 'associate'} from ${ride.name}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center mb-3 border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                      <p className="text-gray-500 italic text-xs">No associates assigned yet.</p>
                    </div>
                  )}
                </div>

                {/* Inline Quick Assign Selector */}
                <div className="mt-2 pt-2 border-t border-gray-700/70">
                  <select
                    className="w-full bg-gray-900 text-gray-200 border border-gray-650 hover:border-blue-500 focus:border-blue-500 rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
                    value=""
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val) {
                        handleAssignToRide(ride.id, val);
                      }
                    }}
                  >
                    <option value="">+ Assign Associate ({operators.length} available)...</option>
                    {operators.map((op: Operator) => {
                      const isAssigned = assignedIds.includes(Number(op.id));
                      const isPresent = attendance.some((a: AttendanceRecord) => (Number(a.operatorId) === Number(op.id) || String(a.operatorId) === String(op.id)) && a.date === selectedDate);
                      return (
                        <option key={op.id} value={op.id} disabled={isAssigned}>
                          {isAssigned ? `✓ ${op.name} (Assigned)` : `${op.name} ${isPresent ? '● Present' : ''}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Operator View
  const myAssignments = useMemo(() => {
    const todays = dailyAssignments[selectedDate] || {};
    const myRides: (Ride & { count?: number; packageCount?: number; ticketCount?: number })[] = [];
    const currentId = currentUser ? Number(currentUser.id) : null;
    const currentName = currentUser?.name ? currentUser.name.trim().toLowerCase() : '';

    Object.entries(todays).forEach(([rideId, opIds]: [string, any]) => {
      const list = normalizeAssigneeIds(opIds);
      const isMatch = (currentId !== null && list.includes(currentId)) ||
        (Boolean(currentName) && list.some(id => {
          const op = operators.find((o: Operator) => Number(o.id) === id);
          return op && op.name.trim().toLowerCase() === currentName;
        }));

      if (isMatch) {
        const r = rides.find((ride: Ride) => Number(ride.id) === Number(rideId));
        if (r) myRides.push(r);
      }
    });

    // If no explicit roster assignments found for this selectedDate (e.g. historical date),
    // include rides that have recorded guest counts for this date so the associate can inspect previous records
    if (myRides.length === 0) {
      rides.forEach((r: any) => {
        const c = Number(r.count ?? 0);
        const p = Number(r.packageCount ?? 0);
        const t = Number(r.ticketCount ?? 0);
        if (c > 0 || p > 0 || t > 0) {
          if (!myRides.some(mr => mr.id === r.id)) {
            myRides.push(r);
          }
        }
      });
    }

    return myRides;
  }, [dailyAssignments, selectedDate, currentUser, rides, operators]);

  const [dismissedSolvedIds, setDismissedSolvedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tfw_dismissed_solved_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const handleDismissSolved = (ticketId: string) => {
    setDismissedSolvedIds(prev => {
      const next = [...prev, ticketId];
      try {
        localStorage.setItem('tfw_dismissed_solved_tickets', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const myRideIds = useMemo(() => new Set(myAssignments.map(r => Number(r.id))), [myAssignments]);

  const solvedNotificationsForAssociate = useMemo(() => {
    if (!maintenanceTickets || typeof maintenanceTickets !== 'object') return [];
    const list: MaintenanceTicket[] = [];
    const seen = new Set<string>();

    Object.entries(maintenanceTickets).forEach(([dKey, dateTickets]: [string, any]) => {
      if (dateTickets && typeof dateTickets === 'object') {
        Object.values(dateTickets).forEach((t: any) => {
          if (!t || !t.id || seen.has(t.id)) return;
          if (t.status === 'solved') {
            const isMyRide = myRideIds.has(Number(t.rideId));
            const isReportedByMe = currentUser?.id && Number(t.reportedById) === Number(currentUser.id);
            if (isMyRide || isReportedByMe) {
              const solvedDate = t.solvedAt ? new Date(t.solvedAt) : null;
              const isToday = dKey === selectedDate || t.date === selectedDate || (solvedDate && solvedDate.toISOString().startsWith(selectedDate));
              const isRecent = solvedDate && (Date.now() - solvedDate.getTime() < 24 * 3600 * 1000);
              if (isToday || isRecent) {
                seen.add(t.id);
                list.push(t);
              }
            }
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.solvedAt || 0).getTime() - new Date(a.solvedAt || 0).getTime());
  }, [maintenanceTickets, myRideIds, currentUser?.id, selectedDate]);

  const activeSolvedAlerts = useMemo(() => {
    return solvedNotificationsForAssociate.filter(t => !dismissedSolvedIds.includes(t.id));
  }, [solvedNotificationsForAssociate, dismissedSolvedIds]);

  const [saveAllFeedback, setSaveAllFeedback] = useState(false);

  const handleSaveAll = () => {
    if (myAssignments.length > 0) {
      myAssignments.forEach(ride => {
        const pkg = Number((ride as any).packageCount || 0);
        const tkt = Number((ride as any).ticketCount || 0);
        if (onPackageCountChange) onPackageCountChange(ride.id, pkg);
        if (onTicketCountChange) onTicketCountChange(ride.id, tkt);
        if (onCountChange) onCountChange(ride.id, (ride as any).count || (pkg + tkt));
      });
      setSaveAllFeedback(true);
      setTimeout(() => setSaveAllFeedback(false), 2500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header & Date Controls for Operator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-md gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Hello, {currentUser?.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Games & Ride Associate Roster</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 px-3 py-1.5 rounded-xl">
          <span className="text-xs text-gray-400 font-medium">Date:</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange && onDateChange(e.target.value)} 
            className="bg-transparent text-white text-sm outline-none cursor-pointer focus:text-blue-400" 
          />
        </div>
      </div>

      {/* Shift Check-in Card / Banner */}
      {!hasCheckedInToday ? (
        <div className="bg-gradient-to-r from-blue-950/50 to-indigo-950/40 rounded-2xl p-5 border border-blue-800/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 bg-blue-900/40 rounded-xl border border-blue-700/50 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ready for your shift?</h3>
              <p className="text-xs text-gray-300">Click to record your attendance for {selectedDate}.</p>
            </div>
          </div>
          {isCheckinAllowed ? (
            <button 
              onClick={() => onClockIn(true, new Date().toLocaleTimeString())}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>CLOCK IN NOW</span>
            </button>
          ) : (
            <span className="text-xs text-red-400 bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-800/50">
              Check-in closed for today
            </span>
          )}
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              ✓
            </div>
            <span className="text-emerald-300 text-xs sm:text-sm font-semibold">You are checked in for today ({selectedDate}).</span>
          </div>
          {saveAllFeedback && (
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
              All counts synced ✓
            </span>
          )}
        </div>
      )}

      {/* Real-time Notification Banner when Maintenance solves an issue */}
      {activeSolvedAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-gray-900 border-2 border-emerald-500/70 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base sm:text-lg font-black text-white">
                Maintenance Notification: Reported Issue Solved!
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              Operational ✓
            </span>
          </div>

          <div className="space-y-2.5">
            {activeSolvedAlerts.map(ticket => (
              <div key={ticket.id} className="bg-gray-900/90 rounded-xl p-3.5 border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm sm:text-base">{ticket.rideName}</span>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800">
                      Issue Resolved
                    </span>
                    {ticket.solvedAt && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({new Date(ticket.solvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-200/95 text-xs sm:text-sm mt-1">
                    {ticket.resolutionNotes || ticket.problem}
                  </p>
                  <div className="text-[11px] text-gray-300 mt-1">
                    Resolved by: <strong className="text-white">{ticket.assignedToName || 'Maintenance Technician'}</strong> • Ride certified operational and ready for guest boarding!
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissSolved(ticket.id)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md border border-emerald-500/50 flex items-center justify-center gap-1.5 transition-all self-end sm:self-auto cursor-pointer active:scale-95"
                  title="Acknowledge and dismiss notification"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Acknowledge</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Rides Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Your Assigned Rides</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
                {myAssignments.length}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage live guest entry counts for your designated rides</p>
          </div>
          {myAssignments.length > 1 && (
            <button
              onClick={handleSaveAll}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Check className="w-3.5 h-3.5 text-blue-400" />
              <span>Save All Counts</span>
            </button>
          )}
        </div>

        {myAssignments.length > 0 ? (
          <div className="grid gap-4">
            {myAssignments.map(ride => (
              <RosterRideCard
                key={`${ride.id}-${selectedDate}`}
                ride={ride}
                onCountChange={onCountChange}
                onIncrementCount={onIncrementCount}
                onPackageCountChange={onPackageCountChange}
                onIncrementPackageCount={onIncrementPackageCount}
                onTicketCountChange={onTicketCountChange}
                onIncrementTicketCount={onIncrementTicketCount}
                onNavigate={onNavigate}
                activeIssuesForRide={(() => {
                  if (!maintenanceTickets || typeof maintenanceTickets !== 'object') return [];
                  const list: MaintenanceTicket[] = [];
                  const seen = new Set<string>();

                  // Aggregate active/recent tickets for this ride across dates
                  Object.entries(maintenanceTickets).forEach(([dKey, dateTickets]: [string, any]) => {
                    if (dateTickets && typeof dateTickets === 'object') {
                      Object.values(dateTickets).forEach((t: any) => {
                        if (t && Number(t.rideId) === Number(ride.id) && !seen.has(t.id)) {
                          if (dKey === selectedDate || t.date === selectedDate || t.status === 'reported' || t.status === 'in-progress') {
                            seen.add(t.id);
                            list.push(t);
                          }
                        }
                      });
                    }
                  });
                  return list;
                })()}
                onReportIssue={async (r, issueText) => {
                  if (onReportProblem) {
                    await onReportProblem(r.id, issueText, 'Operational Issue', 'normal', undefined, 'operator', selectedDate);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800/80 rounded-2xl p-8 text-center border border-gray-700 border-dashed">
            <p className="text-gray-300 font-medium text-sm">No rides assigned to you for {selectedDate}.</p>
            <p className="text-xs text-gray-500 mt-1.5">
              If your manager just updated the roster, you can switch dates above or contact the Operation Officer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const TicketSalesRoster = ({ 
  counters = [], 
  ticketSalesPersonnel = [], 
  dailyAssignments = {}, 
  selectedDate, 
  onDateChange, 
  role, 
  currentUser, 
  attendance = [], 
  onNavigate, 
  onClockIn, 
  hasCheckedInToday, 
  isCheckinAllowed,
  onCountChange,
  onIncrementCount,
  onSaveAssignments,
  onCopyAssignmentsFromPrevious,
  canCopyAssignments,
  latestRecordedDate
}: any) => {
  // If viewing as admin or sales-officer: show the manager's overview roster
  if (role === 'admin' || role === 'sales-officer') {
    const assignments = dailyAssignments[selectedDate] || {};

    const handleAssignToCounter = (counterId: number | string, staffId: number) => {
      if (!staffId) return;
      const currentList = normalizeAssigneeIds(assignments[counterId] || assignments[String(counterId)]);
      if (currentList.includes(Number(staffId))) return;
      const updatedList = [...currentList, Number(staffId)];
      const updatedAssignments = {
        ...assignments,
        [counterId]: updatedList
      };
      if (onSaveAssignments) {
        onSaveAssignments(selectedDate, updatedAssignments);
      }
    };

    const handleRemoveFromCounter = (counterId: number | string, staffId: number) => {
      const currentList = normalizeAssigneeIds(assignments[counterId] || assignments[String(counterId)]);
      const updatedList = currentList.filter((id: number) => id !== Number(staffId));
      const updatedAssignments = { ...assignments };
      if (updatedList.length > 0) {
        updatedAssignments[counterId] = updatedList;
      } else {
        delete updatedAssignments[counterId];
      }
      if (onSaveAssignments) {
        onSaveAssignments(selectedDate, updatedAssignments);
      }
    };

    const assignedIdsSet = new Set<number>();
    let totalAssignmentSlots = 0;
    counters.forEach((counter: any) => {
      const assignedIds = normalizeAssigneeIds(assignments[counter.id] || assignments[String(counter.id)]);
      totalAssignmentSlots += assignedIds.length;
      assignedIds.forEach((id: number) => assignedIdsSet.add(id));
    });

    const assignedStaffList = Array.from(assignedIdsSet);
    
    let assignedPresentCount = 0;
    let assignedAbsentCount = 0;

    assignedStaffList.forEach((id: number) => {
      const isPresent = attendance.some((a: AttendanceRecord) => (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && a.date === selectedDate);
      if (isPresent) {
        assignedPresentCount++;
      } else {
        assignedAbsentCount++;
      }
    });

    const totalPoolCount = ticketSalesPersonnel.length;
    const totalPoolPresent = ticketSalesPersonnel.filter((staff: any) =>
      attendance.some((a: AttendanceRecord) => (Number(a.operatorId) === Number(staff.id) || String(a.operatorId) === String(staff.id)) && a.date === selectedDate)
    ).length;
    const totalPoolAbsent = totalPoolCount - totalPoolPresent;

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header & Date Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-md gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Counter Sales Roster</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60 font-semibold">
                {assignedStaffList.length} Cashiers on Duty
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Counter shift assignments and live cashier attendance status</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {canCopyAssignments && onCopyAssignmentsFromPrevious && (
              <button
                type="button"
                onClick={onCopyAssignmentsFromPrevious}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1.5"
                title={`Copy previous roster from ${latestRecordedDate}`}
              >
                <span>📋 Copy from {latestRecordedDate}</span>
              </button>
            )}

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('ts-assignments')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 text-gray-200 rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1.5 border border-gray-600"
              >
                <span>👥 Full Sales Matrix</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">Date:</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => onDateChange && onDateChange(e.target.value)} 
                className="bg-transparent text-white text-sm outline-none cursor-pointer focus:text-teal-400" 
              />
            </div>
          </div>
        </div>

        {/* Quick Copy Alert when sales roster is unpopulated */}
        {assignedStaffList.length === 0 && canCopyAssignments && onCopyAssignmentsFromPrevious && (
          <div className="bg-gradient-to-r from-teal-950/70 via-cyan-950/60 to-emerald-950/50 border border-teal-500/60 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">📋</span>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">No Cashiers Assigned for {selectedDate}</h4>
                <p className="text-xs text-teal-200/90 mt-0.5">
                  Previous counter sales roster is available from <strong>{latestRecordedDate}</strong>. Would you like to restore it for today?
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCopyAssignmentsFromPrevious}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              <span>📋 Copy Sales Roster from {latestRecordedDate}</span>
            </button>
          </div>
        )}

        {/* Attendance Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gray-800/90 rounded-xl p-3.5 sm:p-4 border border-gray-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Assigned</p>
              <h3 className="text-2xl font-bold text-white mt-1">{assignedStaffList.length}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{totalAssignmentSlots} counter slot{totalAssignmentSlots !== 1 ? 's' : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-900/30 border border-teal-800/60 flex items-center justify-center text-teal-400 font-bold text-lg">
              <Ticket className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/40 to-gray-800 rounded-xl p-3.5 sm:p-4 border border-emerald-800/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Total Present
              </p>
              <h3 className="text-2xl font-bold text-emerald-300 mt-1">{assignedPresentCount}</h3>
              <p className="text-[11px] text-emerald-500/80 mt-0.5">
                {assignedStaffList.length > 0 ? `${Math.round((assignedPresentCount / assignedStaffList.length) * 100)}% attendance` : 'No assignments'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-bold text-lg">
              ✓
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-950/40 to-gray-800 rounded-xl p-3.5 sm:p-4 border border-red-800/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Total Absent
              </p>
              <h3 className="text-2xl font-bold text-red-300 mt-1">{assignedAbsentCount}</h3>
              <p className="text-[11px] text-red-400/80 mt-0.5">
                {assignedAbsentCount > 0 ? `${assignedAbsentCount} missing` : 'All present'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-900/40 border border-red-700/60 flex items-center justify-center text-red-300 font-bold text-lg">
              ✗
            </div>
          </div>

          <div className="bg-gray-800/90 rounded-xl p-3.5 sm:p-4 border border-gray-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Staff Pool ({totalPoolCount})</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-emerald-400">{totalPoolPresent} <span className="text-xs font-normal text-gray-400">P</span></span>
                <span className="text-gray-600">/</span>
                <span className="text-lg font-bold text-red-400">{totalPoolAbsent} <span className="text-xs font-normal text-gray-400">A</span></span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Sales personnel pool</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-700/60 border border-gray-600 flex items-center justify-center text-gray-300 font-bold text-sm">
              👥
            </div>
          </div>
        </div>

        {/* Counter Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {counters.map((counter: any) => {
            const assignedIds = normalizeAssigneeIds(assignments[counter.id] || assignments[String(counter.id)]);
            const counterPresentCount = assignedIds.filter((id: number) =>
              attendance.some((a: AttendanceRecord) => (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && a.date === selectedDate)
            ).length;
            const counterAbsentCount = assignedIds.length - counterPresentCount;

            return (
              <div key={counter.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-md hover:border-gray-600 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2 pb-2 border-b border-gray-700/60">
                    <div>
                      <h3 className="font-bold text-lg text-white leading-tight">{counter.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{assignedIds.length} Associate{assignedIds.length !== 1 ? 's' : ''} Assigned</span>
                        {counter.location && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                            • {counter.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {assignedIds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-lg font-semibold">
                          {counterPresentCount} P
                        </span>
                        {counterAbsentCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-950/60 text-red-300 border border-red-800/60 rounded-lg font-semibold">
                            {counterAbsentCount} A
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {assignedIds.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {assignedIds.map((id: number) => {
                        const staff = ticketSalesPersonnel.find((p: any) => Number(p.id) === id);
                        const att = attendance.find((a: AttendanceRecord) => (Number(a.operatorId) === Number(id) || String(a.operatorId) === String(id)) && a.date === selectedDate);
                        return (
                          <div key={id} className="flex justify-between items-center text-sm bg-gray-750/70 p-2.5 rounded-xl border border-gray-700/60">
                            <span className="text-gray-200 font-medium truncate mr-2">{staff?.name || `Associate #${id}`}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {att ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs px-2.5 py-0.5 bg-emerald-900/30 rounded-full border border-emerald-800 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-400 text-xs px-2.5 py-0.5 bg-red-900/30 rounded-full border border-red-800 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                  Absent
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCounter(counter.id, id)}
                                className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-950/40 transition-colors"
                                title={`Remove ${staff?.name || 'cashier'} from ${counter.name}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center mb-3 border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                      <p className="text-gray-500 italic text-xs">No associates assigned yet.</p>
                    </div>
                  )}
                </div>

                {/* Inline Quick Assign Selector for Counter */}
                <div className="mt-2 pt-2 border-t border-gray-700/70">
                  <select
                    className="w-full bg-gray-900 text-gray-200 border border-gray-650 hover:border-teal-500 focus:border-teal-500 rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer transition-colors"
                    value=""
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val) {
                        handleAssignToCounter(counter.id, val);
                      }
                    }}
                  >
                    <option value="">+ Assign Cashier ({ticketSalesPersonnel.length} available)...</option>
                    {ticketSalesPersonnel.map((staff: any) => {
                      const isAssigned = assignedIds.includes(Number(staff.id));
                      const isPresent = attendance.some((a: AttendanceRecord) => (Number(a.operatorId) === Number(staff.id) || String(a.operatorId) === String(staff.id)) && a.date === selectedDate);
                      return (
                        <option key={staff.id} value={staff.id} disabled={isAssigned}>
                          {isAssigned ? `✓ ${staff.name} (Assigned)` : `${staff.name} ${isPresent ? '● Present' : ''}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Ticket Sales Associate View
  const myAssignedCounters = useMemo(() => {
    const todays = dailyAssignments[selectedDate] || {};
    const assignedList: any[] = [];
    const currentId = currentUser ? Number(currentUser.id) : null;
    const currentName = currentUser?.name ? currentUser.name.trim().toLowerCase() : '';

    Object.entries(todays).forEach(([counterId, opIds]: [string, any]) => {
      const list = normalizeAssigneeIds(opIds);
      const isMatch = (currentId !== null && list.includes(currentId)) ||
        (Boolean(currentName) && list.some(id => {
          const staff = ticketSalesPersonnel.find((p: any) => Number(p.id) === id);
          return staff && staff.name.trim().toLowerCase() === currentName;
        }));

      if (isMatch) {
        const c = counters.find((counter: any) => String(counter.id) === String(counterId));
        if (c) assignedList.push(c);
      }
    });
    return assignedList;
  }, [dailyAssignments, selectedDate, currentUser, counters, ticketSalesPersonnel]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header & Date Controls for Ticket Sales Associate */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-md gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Hello, {currentUser?.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Sales Executive Roster</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 px-3 py-1.5 rounded-xl">
          <span className="text-xs text-gray-400 font-medium">Date:</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange && onDateChange(e.target.value)} 
            className="bg-transparent text-white text-sm outline-none cursor-pointer focus:text-teal-400" 
          />
        </div>
      </div>

      {/* Shift Check-in Card / Banner */}
      {!hasCheckedInToday ? (
        <div className="bg-gradient-to-r from-teal-950/50 to-emerald-950/40 rounded-2xl p-5 border border-teal-800/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 bg-teal-900/40 rounded-xl border border-teal-700/50 flex items-center justify-center text-teal-400 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ready for your shift?</h3>
              <p className="text-xs text-gray-300">Click to record your attendance for {selectedDate}.</p>
            </div>
          </div>
          {isCheckinAllowed ? (
            <button 
              onClick={() => onClockIn && onClockIn(true, new Date().toLocaleTimeString())}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>CLOCK IN NOW</span>
            </button>
          ) : (
            <span className="text-xs text-red-400 bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-800/50">
              Check-in closed for today
            </span>
          )}
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              ✓
            </div>
            <span className="text-emerald-300 text-xs sm:text-sm font-semibold">You are checked in for today ({selectedDate}).</span>
          </div>
        </div>
      )}

      {/* Assigned Counters Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Your Assigned Counter</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60">
                {myAssignedCounters.length}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage ticket counts and record package sales for your assigned counter</p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('my-sales')}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              title="Open Daily Package Sales"
            >
              <Package className="w-4 h-4" />
              <span>Daily Package Sales</span>
            </button>
          )}
        </div>

        {myAssignedCounters.length > 0 ? (
          <div className="grid gap-5">
            {myAssignedCounters.map((counter: any) => (
              <div 
                key={counter.id} 
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl flex flex-col gap-4 transition-all hover:border-gray-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-gradient-to-br from-teal-600/30 to-emerald-600/30 border border-teal-500/30 rounded-2xl flex items-center justify-center text-teal-400 shadow-inner">
                      <Ticket className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-white">{counter.name}</h4>
                        <span className="text-xs font-mono text-gray-400 bg-gray-700/60 px-2 py-0.5 rounded">ID: #{counter.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-teal-950/60 text-teal-300 border border-teal-800/60">
                          {counter.type || 'Ticket Sales Counter'}
                        </span>
                        {counter.location && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal-400" />
                            {counter.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Assigned Counter
                    </span>
                  </div>
                </div>

                {/* Quick Counter Ticket Entry with Permanent Database Persistence */}
                <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">Today's Counter Tickets Dispensed</span>
                    <span className="text-2xl font-mono font-bold text-white">{(counter.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onIncrementCount ? onIncrementCount(counter.id, -1) : onCountChange && onCountChange(counter.id, Math.max(0, (counter.count || 0) - 1))}
                      className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-red-900/40 text-red-400 font-bold text-lg flex items-center justify-center border border-gray-700 transition-all active:scale-95"
                      title="Decrease tickets dispensed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={counter.count || ''}
                      onChange={(e) => onCountChange && onCountChange(counter.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-24 text-center font-mono font-bold text-lg bg-gray-800 text-teal-300 border border-gray-750 focus:border-teal-400 rounded-lg py-1 px-2 outline-none"
                      title="Type ticket sales count directly (saves to database automatically)"
                    />
                    <button
                      type="button"
                      onClick={() => onIncrementCount ? onIncrementCount(counter.id, 1) : onCountChange && onCountChange(counter.id, (counter.count || 0) + 1)}
                      className="w-9 h-9 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-lg flex items-center justify-center shadow transition-all active:scale-95"
                      title="Increase tickets dispensed"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <span>Shift Date: <strong className="text-gray-200">{selectedDate}</strong></span>
                  </div>
                  {onNavigate && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('my-sales')}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Daily Package Sales</span>
                      </button>
                      <button
                        onClick={() => onNavigate('ticket-sales-dashboard')}
                        className="px-3.5 py-1.5 bg-gray-700 hover:bg-gray-650 text-gray-200 font-semibold rounded-lg border border-gray-600 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Counter Sales</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800/80 rounded-2xl p-8 text-center border border-gray-700 border-dashed space-y-4">
            <Ticket className="w-10 h-10 text-gray-600 mx-auto" />
            <div>
              <p className="text-gray-300 font-medium text-sm">No counters assigned to you for {selectedDate}.</p>
              <p className="text-xs text-gray-500 mt-1.5">
                You can still view and record your daily package sales anytime.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('my-sales')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Open Daily Package Sales</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Interactive Physical Counter Card with direct numeric entry, assigned cashier revenue attribution, and lively real-time display
const InteractiveCounterCard: React.FC<{
  counter: CounterWithSales;
  onSalesChange: (id: number, count: number) => void;
  onIncrementSales?: (id: number, delta: number) => void;
  currency?: string;
  selectedDate: string;
  daySales?: Record<string, any>;
  packageSales?: Record<string, Record<string, any>>;
  ticketSalesAssignments?: Record<string, Record<string, number[]>>;
  ticketSalesPersonnel?: any[];
  packages?: PackageItem[];
  attendance?: AttendanceRecord[];
  onNavigate?: (view: string) => void;
}> = ({ 
  counter, 
  onSalesChange, 
  onIncrementSales, 
  currency = 'BDT',
  selectedDate,
  daySales = {},
  packageSales = {},
  ticketSalesAssignments = {},
  ticketSalesPersonnel = [],
  packages = [],
  attendance = [],
  onNavigate
}) => {
  const [localInput, setLocalInput] = useState<string>(String(counter.sales || 0));
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLivelyFlash, setIsLivelyFlash] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external counter.sales prop changes with input when not actively typing
  useEffect(() => {
    if (!isEditing) {
      setLocalInput(String(counter.sales || 0));
    }
  }, [counter.sales, isEditing]);

  // Assigned personnel at this specific counter on selectedDate (with fallback to latest known assignment)
  const assignedStaffIds = useMemo(() => {
    // 1. Direct assignment for selectedDate
    const dayAssignments = ticketSalesAssignments[selectedDate] || {};
    const directIds = dayAssignments[counter.id] || dayAssignments[String(counter.id)];
    if (directIds && Array.isArray(directIds) && directIds.length > 0) {
      return directIds;
    }

    // 2. Fallback to latest available assignment date if current date hasn't been explicitly assigned yet
    const dates = Object.keys(ticketSalesAssignments || {}).sort().reverse();
    for (const d of dates) {
      const pastDayAssignments = ticketSalesAssignments[d] || {};
      const ids = pastDayAssignments[counter.id] || pastDayAssignments[String(counter.id)];
      if (ids && Array.isArray(ids) && ids.length > 0) {
        return ids;
      }
    }

    return [];
  }, [ticketSalesAssignments, selectedDate, counter.id]);

  // Detailed assigned staff info with individual package & other sales
  const assignedStaffDetails = useMemo(() => {
    return assignedStaffIds.map((id: number) => {
      const person = ticketSalesPersonnel?.find((p: any) => p.id === id);
      const att = attendance?.find((a: AttendanceRecord) => a.operatorId === id && a.date === selectedDate);
      let salesRec = daySales[id] || daySales[String(id)];
      // If no sales recorded on selectedDate for this cashier, check fallback to latest recorded date in packageSales
      if (!salesRec || (Number(salesRec.total) === 0 && Object.keys(salesRec.packages || {}).length === 0)) {
        if (packageSales && typeof packageSales === 'object') {
          const dates = Object.keys(packageSales).sort().reverse();
          for (const d of dates) {
            const pRec = packageSales[d]?.[id] || packageSales[d]?.[String(id)];
            if (pRec && (Number(pRec.total) > 0 || Object.keys(pRec.packages || {}).length > 0)) {
              salesRec = pRec;
              break;
            }
          }
        }
      }
      salesRec = salesRec || {};
      const packageItems: Record<string, number> = salesRec.packages || {};
      const otherItems: Array<{ amount: number; description?: string; category?: string }> = salesRec.otherSales || [];
      const totalAmount = Number(salesRec.total) || 0;
      const packageCount = Object.values(packageItems).reduce((sum: number, c: any) => sum + (Number(c) || 0), 0);

      return {
        id,
        name: person?.name || `Associate #${id}`,
        phone: person?.phone,
        isPresent: !!att,
        totalAmount,
        packageCount,
        packageItems,
        otherItems
      };
    });
  }, [assignedStaffIds, ticketSalesPersonnel, attendance, daySales, packageSales, selectedDate]);

  // Total sales generated by assigned cashiers stationed at this counter
  const cashierSalesAmount = useMemo(() => {
    return assignedStaffDetails.reduce((sum, staff) => sum + staff.totalAmount, 0);
  }, [assignedStaffDetails]);

  const totalPackagesSoldByCashiers = useMemo(() => {
    return assignedStaffDetails.reduce((sum, staff) => sum + staff.packageCount, 0);
  }, [assignedStaffDetails]);

  // Ticket unit rate
  const defaultEntryPrice = useMemo(() => {
    const entryPkg = packages.find(p => p.name.toLowerCase().includes('entry'));
    return entryPkg?.price || 150;
  }, [packages]);

  const [ticketPrice, setTicketPrice] = useState<number>(() => {
    return counter.ticketPrice || counter.price || defaultEntryPrice;
  });
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(String(ticketPrice));

  // Direct tickets dispensed
  const ticketsCount = Number(localInput !== '' ? localInput : counter.sales) || 0;
  const directTicketSalesAmount = ticketsCount * ticketPrice;

  // Live Total Sales Amount for this counter (Assigned Cashier Revenue + Counter Tickets Revenue)
  const totalCounterAmount = cashierSalesAmount + directTicketSalesAmount;

  // Trigger lively pulse effect whenever sales numbers change
  const prevTotalRef = useRef<number>(totalCounterAmount);
  useEffect(() => {
    if (prevTotalRef.current !== totalCounterAmount) {
      prevTotalRef.current = totalCounterAmount;
      setIsLivelyFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setIsLivelyFlash(false);
      }, 800);
    }
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [totalCounterAmount]);

  const handleInputChange = (val: string) => {
    setLocalInput(val);
    setIsEditing(true);
    setSaveStatus('saving');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const parsed = Math.max(0, parseInt(val, 10) || 0);
      onSalesChange(counter.id, parsed);
      setSaveStatus('saved');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 2500);
    }, 450);
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const parsed = Math.max(0, parseInt(localInput, 10) || 0);
    setLocalInput(String(parsed));
    onSalesChange(counter.id, parsed);
    setSaveStatus('saved');
    setIsEditing(false);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleIncrement = (delta: number) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const current = Number(counter.sales) || 0;
    const nextVal = Math.max(0, current + delta);
    setLocalInput(String(nextVal));
    setIsEditing(false);
    setSaveStatus('saved');
    if (onIncrementSales) {
      onIncrementSales(counter.id, delta);
    } else {
      onSalesChange(counter.id, nextVal);
    }
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleSavePrice = () => {
    const num = Math.max(0, parseInt(tempPrice, 10) || defaultEntryPrice);
    setTicketPrice(num);
    setIsEditingPrice(false);
  };

  return (
    <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700/80 flex flex-col transition-all hover:border-teal-500/50">
      {/* Card Header */}
      <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-gray-850 to-gray-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">{counter.name}</h3>
            {counter.counterNumber ? (
              <span className="text-xs font-mono font-bold bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800">
                #{counter.counterNumber}
              </span>
            ) : (
              <span className="text-xs font-mono font-bold bg-gray-750 text-gray-300 px-2 py-0.5 rounded border border-gray-650">
                #{counter.id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            {counter.location && <span>{counter.location}</span>}
            <span>•</span>
            <span className="text-teal-400 font-medium">{counter.type || 'Ticket Sales Counter'}</span>
          </div>
        </div>

        {/* Live Status Indicator & DB Sync */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[11px] font-bold text-emerald-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </div>

          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              Saving...
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Saved to DB
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-900/60 border border-gray-700/50 px-2 py-0.5 rounded-full">
              <Database className="w-3 h-3 text-gray-400" />
              DB Synced
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        {/* Hero Total Counter Revenue Box (Assigned Counter Wise Total Revenue) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
          isLivelyFlash 
            ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-950/60' 
            : 'bg-gradient-to-br from-emerald-950/60 via-gray-900 to-gray-900 border-emerald-500/40 shadow-md'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Counter Revenue</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/50 border border-emerald-700/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              Lively Real-Time
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{currency}</span>
              <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight text-white transition-all duration-200 ${
                isLivelyFlash ? 'text-emerald-300 scale-105' : ''
              }`}>
                {totalCounterAmount.toLocaleString()}
              </span>
            </div>

            {totalCounterAmount > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 font-semibold font-mono">
                {assignedStaffDetails.length > 0 ? `${assignedStaffDetails.length} Cashier${assignedStaffDetails.length > 1 ? 's' : ''}` : 'Direct Tickets'}
              </span>
            )}
          </div>

          {/* Revenue Breakdown Metrics */}
          <div className="mt-3 pt-2.5 border-t border-emerald-800/30 grid grid-cols-2 gap-2 text-xs font-medium">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Cashier Shift Sales:</span>
              <span className="text-sm font-bold font-mono text-emerald-300">
                {currency} {cashierSalesAmount.toLocaleString()}
                {totalPackagesSoldByCashiers > 0 && (
                  <span className="text-[10px] text-gray-400 font-normal ml-1">({totalPackagesSoldByCashiers} pkgs)</span>
                )}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Tickets Dispensed:</span>
              <span className="text-sm font-bold font-mono text-teal-300">
                {currency} {directTicketSalesAmount.toLocaleString()}
                <span className="text-[10px] text-gray-400 font-normal ml-1">({ticketsCount})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stationed Cashier(s) Section */}
        <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-750 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              Stationed Cashier(s):
            </span>
            {assignedStaffDetails.length > 0 ? (
              <span className="text-[11px] text-emerald-400 font-medium">
                {assignedStaffDetails.filter(s => s.isPresent).length}/{assignedStaffDetails.length} Present
              </span>
            ) : (
              <span className="text-[11px] text-amber-400 font-medium">Unassigned</span>
            )}
          </div>

          {assignedStaffDetails.length > 0 ? (
            <div className="space-y-1.5">
              {assignedStaffDetails.map(staff => (
                <div key={staff.id} className="flex items-center justify-between text-xs bg-gray-800/90 px-3 py-2 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2">
                    <span 
                      className={`w-2 h-2 rounded-full ${staff.isPresent ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
                      title={staff.isPresent ? 'Checked in / Present' : 'Absent'}
                    ></span>
                    <div>
                      <span className="font-semibold text-white">{staff.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono ml-1.5">#{staff.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">
                      {currency} {staff.totalAmount.toLocaleString()}
                    </span>
                    {staff.packageCount > 0 && (
                      <button 
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-[10px] bg-teal-950 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800 hover:border-teal-600 transition-colors"
                        title="View sold packages"
                      >
                        {staff.packageCount} pkgs
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-800/50 p-2.5 rounded-lg border border-dashed border-gray-700 text-xs">
              <span className="text-gray-400 italic">No cashier assigned for this date</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('ts-assignments')}
                  className="text-teal-400 hover:text-teal-300 font-semibold text-[11px] underline"
                >
                  Assign Staff
                </button>
              )}
            </div>
          )}

          {/* Expandable Package Breakdown if toggled */}
          {showDetails && assignedStaffDetails.some(s => s.packageCount > 0) && (
            <div className="bg-gray-850 p-2.5 rounded-lg border border-gray-700/80 text-xs space-y-1 mt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Package Sales Breakdown:
              </div>
              {assignedStaffDetails.map(staff => (
                <div key={staff.id} className="space-y-0.5">
                  {Object.entries(staff.packageItems).map(([pkgName, count]) => {
                    if (!count) return null;
                    const pkg = packages.find(p => p.name === pkgName);
                    const price = pkg?.price || 0;
                    const subtotal = (Number(count) || 0) * price;
                    return (
                      <div key={pkgName} className="flex justify-between items-center text-gray-300">
                        <span>{count}× {pkgName}</span>
                        <span className="font-mono font-semibold text-emerald-400">{currency} {subtotal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {staff.otherItems?.map((other, idx) => (
                    <div key={idx} className="flex justify-between items-center text-gray-300">
                      <span>{other.category || 'Other'}{other.description ? `: ${other.description}` : ''}</span>
                      <span className="font-mono font-semibold text-amber-300">{currency} {Number(other.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Counter Tickets Dispenser Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-teal-400" />
              Counter Tickets Dispensed:
            </span>
            
            {/* Rate badge with quick edit */}
            {isEditingPrice ? (
              <div className="flex items-center gap-1">
                <input 
                  type="number"
                  min="0"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value)}
                  className="w-16 text-center text-xs font-mono font-bold bg-gray-900 text-teal-300 border border-teal-500 rounded px-1 py-0.5 outline-none"
                />
                <button 
                  type="button"
                  onClick={handleSavePrice}
                  className="text-[10px] bg-teal-600 hover:bg-teal-500 text-white font-bold px-1.5 py-0.5 rounded"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setTempPrice(String(ticketPrice)); setIsEditingPrice(true); }}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-gray-900/60 px-2 py-0.5 rounded border border-gray-700/80 hover:border-emerald-600 transition-colors"
                title="Click to adjust ticket rate"
              >
                <span>@{currency} {ticketPrice}/ticket</span>
                <Edit2 className="w-2.5 h-2.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Stepper and numeric input */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleIncrement(-1)}
              className="h-12 w-12 rounded-xl bg-gray-750 hover:bg-red-900/50 active:scale-95 text-red-400 flex items-center justify-center text-2xl font-bold transition-all border border-gray-650 shadow"
              aria-label="Decrease sales"
            >
              -
            </button>

            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                value={localInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleBlur}
                onFocus={() => setIsEditing(true)}
                placeholder="0"
                className="w-full text-center text-3xl font-extrabold font-mono bg-gray-900 text-teal-300 border-2 border-teal-500/50 focus:border-teal-400 rounded-xl py-2.5 px-3 outline-none shadow-inner"
                title="Click or type directly to edit sales quantity - auto-saved to database permanently"
              />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
                Type or use +/- buttons (Auto-saved)
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleIncrement(1)}
              className="h-12 w-12 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-teal-900/40 transition-all border border-teal-400/30"
              aria-label="Increase sales"
            >
              +
            </button>
          </div>

          {/* Quick Batch Increment Pills */}
          <div className="flex items-center gap-2 pt-1 justify-center">
            {[5, 10, 25, 50].map(step => (
              <button
                key={step}
                type="button"
                onClick={() => handleIncrement(step)}
                className="px-2.5 py-1 rounded-lg bg-gray-750 hover:bg-teal-950/60 hover:text-teal-300 text-gray-400 text-xs font-mono font-bold border border-gray-600/70 hover:border-teal-700/60 transition-all active:scale-95"
              >
                +{step}
              </button>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-gray-700/60 flex items-center justify-between text-xs">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('my-sales')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Daily Package Sales</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 ml-auto transition-colors"
          >
            <span>{showDetails ? 'Hide Sales Details' : 'View Shift Details'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TicketSalesView = ({ 
  countersWithSales, 
  onSalesChange,
  onIncrementSales,
  selectedDate,
  packageSales = {},
  packages = [],
  otherSalesCategories = [],
  currency = 'BDT',
  ticketSalesPersonnel = [],
  ticketSalesAssignments = {},
  attendance = [],
  onNavigate,
  currentUser,
  role
}: { 
  countersWithSales: CounterWithSales[]; 
  onSalesChange: (id: number, count: number) => void;
  onIncrementSales?: (id: number, delta: number) => void;
  selectedDate?: string;
  packageSales?: PackageSalesData;
  packages?: PackageItem[];
  otherSalesCategories?: string[];
  currency?: string;
  ticketSalesPersonnel?: any[];
  ticketSalesAssignments?: Record<string, Record<string, number[]>>;
  attendance?: AttendanceRecord[];
  onNavigate?: (view: string) => void;
  currentUser?: any;
  role?: string;
}) => {
  const dateKey = selectedDate || new Date().toISOString().split('T')[0];
  const daySales = useMemo(() => (packageSales && packageSales[dateKey]) || {}, [packageSales, dateKey]);

  // Packages list fallback if empty
  const packagesList: PackageItem[] = useMemo(() => {
    return packages.length > 0 ? packages : DEFAULT_PACKAGES;
  }, [packages]);

  // Aggregate individual package total sales
  const packageBreakdown = useMemo(() => {
    const allPkgMap = new Map<string, { name: string; price: number; category?: string }>();
    packagesList.forEach(pkg => {
      allPkgMap.set(pkg.name, { name: pkg.name, price: pkg.price || 0, category: pkg.category });
    });

    // Also include any package that might be in daySales records even if not in packagesList
    Object.values(daySales).forEach((rec: any) => {
      if (rec?.packages) {
        Object.keys(rec.packages).forEach(pkgName => {
          if (!allPkgMap.has(pkgName)) {
            allPkgMap.set(pkgName, { name: pkgName, price: 0, category: 'Custom' });
          }
        });
      }
    });

    let totalSoldUnits = 0;
    let totalRevenue = 0;

    const list = Array.from(allPkgMap.values()).map(pkg => {
      let count = 0;
      Object.values(daySales).forEach((rec: any) => {
        if (rec?.packages && rec.packages[pkg.name] !== undefined) {
          count += Number(rec.packages[pkg.name]) || 0;
        }
      });
      const amount = count * pkg.price;
      totalSoldUnits += count;
      totalRevenue += amount;
      return {
        ...pkg,
        count,
        amount
      };
    });

    return { list, totalSoldUnits, totalRevenue };
  }, [packagesList, daySales]);

  // Aggregate other sales category wise total amount
  const otherSalesBreakdown = useMemo(() => {
    const baseCats = otherSalesCategories.length > 0 
      ? otherSalesCategories 
      : ['Merchandise', 'Food & Beverage', 'Photo Booth', 'Locker Rental', 'Game Tokens'];
    
    const catMap = new Map<string, { category: string; count: number; amount: number; items: Array<{ amount: number; description?: string; personName?: string }> }>();
    
    // Seed with configured categories
    baseCats.forEach(cat => {
      catMap.set(cat.toLowerCase(), { category: cat, count: 0, amount: 0, items: [] });
    });

    // Traverse daySales records
    Object.entries(daySales).forEach(([personId, rec]: [string, any]) => {
      if (Array.isArray(rec?.otherSales)) {
        rec.otherSales.forEach((item: any) => {
          const rawCat = (item.category || 'General').trim();
          const key = rawCat.toLowerCase();
          const person = ticketSalesPersonnel?.find(p => String(p.id) === String(personId));
          const personName = person?.name || `Executive #${personId}`;
          const amt = Number(item.amount) || 0;

          if (!catMap.has(key)) {
            catMap.set(key, { category: rawCat, count: 0, amount: 0, items: [] });
          }
          const entry = catMap.get(key)!;
          entry.count += 1;
          entry.amount += amt;
          if (amt > 0 || item.description) {
            entry.items.push({ amount: amt, description: item.description, personName });
          }
        });
      }
    });

    let totalItems = 0;
    let totalRevenue = 0;
    const list = Array.from(catMap.values()).map(entry => {
      totalItems += entry.count;
      totalRevenue += entry.amount;
      return entry;
    });

    return { list, totalItems, totalRevenue };
  }, [otherSalesCategories, daySales, ticketSalesPersonnel]);

  // Total counter tickets
  const totalCounterTickets = useMemo(() => {
    return countersWithSales.reduce((sum, c) => sum + (c.sales || 0), 0);
  }, [countersWithSales]);

  // Grand Total Sales Amount
  const grandTotalSalesAmount = useMemo(() => {
    return packageBreakdown.totalRevenue + otherSalesBreakdown.totalRevenue;
  }, [packageBreakdown.totalRevenue, otherSalesBreakdown.totalRevenue]);

  // Logged personnel contributors
  const activeContributors = useMemo(() => {
    return Object.entries(daySales).map(([personId, rec]: [string, any]) => {
      const person = ticketSalesPersonnel?.find(p => String(p.id) === String(personId));
      return {
        id: personId,
        name: person?.name || `Executive #${personId}`,
        total: rec?.total || 0,
        packageCount: Object.values(rec?.packages || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
      };
    });
  }, [daySales, ticketSalesPersonnel]);

  return (
    <div className="space-y-6 pb-28 animate-fade-in-up">
      {/* Overview Top Header */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/80 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-teal-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Counter Sales & Revenue Summary</h2>
          </div>
          <p className="text-gray-400 text-sm">
            Breakdown of individual package revenues, category-wise other sales, and physical ticket counter status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-200">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span>Date: {dateKey}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Total Sales Amount & Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Amount Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-gray-800 to-gray-800 p-5 rounded-2xl border border-emerald-500/40 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Sales Amount</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs tracking-wider">
              TK
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {currency} {grandTotalSalesAmount.toLocaleString()}
          </div>
          <p className="text-xs text-emerald-400/80 mt-1.5 font-medium">
            {packageBreakdown.totalSoldUnits} packages + {otherSalesBreakdown.totalItems} other items
          </p>
        </div>

        {/* Package Sales Total Card */}
        <div className="bg-gradient-to-br from-blue-950/40 via-gray-800 to-gray-800 p-5 rounded-2xl border border-blue-500/30 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Package Sales Total</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono tracking-tight">
            {currency} {packageBreakdown.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-blue-400/80 mt-1.5 font-medium">
            {packageBreakdown.totalSoldUnits} packages sold
          </p>
        </div>

        {/* Other Sales Total Card */}
        <div className="bg-gradient-to-br from-amber-950/40 via-gray-800 to-gray-800 p-5 rounded-2xl border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Other Sales Total</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
            {currency} {otherSalesBreakdown.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-amber-400/80 mt-1.5 font-medium">
            {otherSalesBreakdown.totalItems} items recorded
          </p>
        </div>

        {/* Counter Tickets Card */}
        <div className="bg-gradient-to-br from-teal-950/40 via-gray-800 to-gray-800 p-5 rounded-2xl border border-teal-500/30 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Turnstile Tickets</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-300 font-mono tracking-tight">
            {totalCounterTickets.toLocaleString()}
          </div>
          <p className="text-xs text-teal-400/80 mt-1.5 font-medium">
            Across {countersWithSales.length} physical counters
          </p>
        </div>
      </div>

      {/* Two Detailed Summary Tables: Individual Packages & Other Sales Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Individual Package Total Sales Amount */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700/80 shadow-lg overflow-hidden flex flex-col">
          <div className="p-5 bg-gradient-to-r from-gray-850 to-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Individual Package Sales Summary</h3>
                <p className="text-xs text-gray-400">Package breakdown with unit rate, quantity, and total sales amount</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
              {packageBreakdown.totalSoldUnits} units
            </span>
          </div>

          <div className="p-4 flex-grow overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700/80 text-xs uppercase tracking-wider text-gray-400">
                  <th className="pb-3 font-semibold">Package Name</th>
                  <th className="pb-3 text-right font-semibold">Unit Price</th>
                  <th className="pb-3 text-center font-semibold">Sold Qty</th>
                  <th className="pb-3 text-right font-semibold">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {packageBreakdown.list.map((pkg, idx) => (
                  <tr key={idx} className="hover:bg-gray-750/50 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="font-semibold text-white">{pkg.name}</div>
                      {pkg.category && (
                        <span className="text-[10px] font-medium text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                          {pkg.category}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-gray-300 text-xs">
                      {currency} {pkg.price.toLocaleString()}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                        pkg.count > 0 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                          : 'bg-gray-750 text-gray-500'
                      }`}>
                        {pkg.count}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-sm">
                      <span className={pkg.amount > 0 ? 'text-emerald-400' : 'text-gray-500'}>
                        {currency} {pkg.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal Row */}
          <div className="p-4 bg-gray-850 border-t border-gray-700 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Total Packages: <span className="text-white font-bold ml-1">{packageBreakdown.totalSoldUnits} sold</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 mr-2 uppercase tracking-wider font-medium">Package Revenue:</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {currency} {packageBreakdown.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Other Sales Category-wise Total Amount */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700/80 shadow-lg overflow-hidden flex flex-col">
          <div className="p-5 bg-gradient-to-r from-gray-850 to-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Other Sales (Category-wise)</h3>
                <p className="text-xs text-gray-400">Total revenue categorized by ancillary revenue stream</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(role === 'sales-officer' || role === 'admin') && (
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('other-sales-categories')}
                  className="text-xs bg-amber-600/30 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Create and manage Other Sales Categories"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage / Create Categories</span>
                </button>
              )}
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                {otherSalesBreakdown.totalItems} entries
              </span>
            </div>
          </div>

          <div className="p-4 flex-grow overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700/80 text-xs uppercase tracking-wider text-gray-400">
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 text-center font-semibold">Entries / Items</th>
                  <th className="pb-3 text-right font-semibold">Category Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {otherSalesBreakdown.list.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-gray-750/50 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>{cat.category}</span>
                      </div>
                      {cat.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cat.items.slice(0, 3).map((it, iIdx) => (
                            <span key={iIdx} className="text-[10px] bg-gray-700/60 text-gray-300 px-1.5 py-0.5 rounded">
                              {it.description || 'Item'}: {currency} {it.amount.toLocaleString()}
                            </span>
                          ))}
                          {cat.items.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{cat.items.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                        cat.count > 0 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-gray-750 text-gray-500'
                      }`}>
                        {cat.count}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-sm">
                      <span className={cat.amount > 0 ? 'text-emerald-400' : 'text-gray-500'}>
                        {currency} {cat.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal Row */}
          <div className="p-4 bg-gray-850 border-t border-gray-700 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Total Other Items: <span className="text-white font-bold ml-1">{otherSalesBreakdown.totalItems} entries</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 mr-2 uppercase tracking-wider font-medium">Other Revenue:</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {currency} {otherSalesBreakdown.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contributing Personnel Notice if any */}
      {activeContributors.length > 0 && (
        <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-white">Sales Recorded By:</span>
            <div className="flex flex-wrap gap-2">
              {activeContributors.map(c => (
                <span key={c.id} className="bg-gray-700 px-2.5 py-1 rounded-lg border border-gray-600 text-gray-200">
                  <span className="font-semibold text-white">{c.name}</span>: {currency} {c.total.toLocaleString()} ({c.packageCount} pkgs)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section Divider & Physical Counters Heading */}
      <div className="pt-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-800 via-gray-800 to-teal-950/30 p-4 rounded-2xl border border-gray-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Physical Ticket Counters</h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Lively Real-Time Feed
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Counter-wise assigned cashier shift sales & dispensed physical tickets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-gray-300 font-mono bg-gray-900/80 border border-gray-750 px-3 py-1.5 rounded-xl">
              {countersWithSales.length} Active Terminals
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('ts-assignments')}
                className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors shadow flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roster Assignments</span>
              </button>
            )}
          </div>
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countersWithSales.map(counter => (
            <InteractiveCounterCard 
              key={counter.id} 
              counter={counter} 
              onSalesChange={onSalesChange}
              onIncrementSales={onIncrementSales}
              currency={currency}
              selectedDate={dateKey}
              daySales={daySales}
              packageSales={packageSales}
              ticketSalesAssignments={ticketSalesAssignments}
              ticketSalesPersonnel={ticketSalesPersonnel}
              packages={packagesList}
              attendance={attendance}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const DailySalesEntry = ({ 
  currentUser, 
  selectedDate, 
  onDateChange, 
  packageSales, 
  onSave, 
  otherSalesCategories = [], 
  availablePackages = [],
  currency = 'BDT',
  ticketSalesPersonnel = [],
  role = 'ticket-sales',
  onAddCategory,
  mySalesStartDate,
  onMySalesStartDateChange,
  mySalesEndDate,
  onMySalesEndDateChange
}: any) => {
  const currentUserIdNum = currentUser?.id 
    ? Number(currentUser.id) 
    : (ticketSalesPersonnel.find((p: any) => p.name === currentUser?.name)?.id || ticketSalesPersonnel[0]?.id || 0);
  const [targetPersonnelId, setTargetPersonnelId] = useState<number>(currentUserIdNum);
  const effectivePersonnelId = Number(
    (role === 'sales-officer' || role === 'admin') 
      ? (targetPersonnelId || currentUserIdNum) 
      : currentUserIdNum
  );

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyDateFilterEnabled, setHistoryDateFilterEnabled] = useState(false);

  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const dayData = packageSales[selectedDate]?.[effectivePersonnelId] || packageSales[selectedDate]?.[String(effectivePersonnelId)] || {};
  const packagesList: PackageItem[] = availablePackages.length > 0 ? availablePackages : DEFAULT_PACKAGES;

  const [packages, setPackages] = useState<Record<string, number>>(dayData.packages || {});
  const [otherSales, setOtherSales] = useState<Array<{
    category: string; 
    customName?: string;
    count?: number;
    unitPrice?: number;
    amount: number; 
    baseAmount?: number;
    discount?: string;
    description?: string;
  }>>(() => {
    const raw = dayData.otherSales || [];
    return raw.map((item: any) => {
      const count = Math.max(1, parseInt(String(item.count || 1), 10) || 1);
      const matchedPkg = packagesList.find(p => p.name === item.category);
      const defaultUnitPrice = matchedPkg ? matchedPkg.price : (item.unitPrice !== undefined ? Number(item.unitPrice) : (item.baseAmount !== undefined ? Number(item.baseAmount) : (Number(item.amount) || 0) / count));
      const base = item.baseAmount !== undefined ? item.baseAmount : defaultUnitPrice;
      const isCustom = !packagesList.some(p => p.name === item.category) || item.category === '__CUSTOM_NEW_SALE__';
      const customName = item.customName !== undefined 
        ? item.customName 
        : (isCustom && item.category !== '__CUSTOM_NEW_SALE__' ? item.category : '');
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : base;
      const totalAmount = item.amount !== undefined ? Number(item.amount) : (unitPrice * count);
      return {
        category: item.category || (packagesList[0]?.name || 'General'),
        customName,
        count,
        unitPrice,
        amount: totalAmount,
        baseAmount: base,
        discount: item.discount || '',
        description: item.description || ''
      };
    });
  });

  const isInitialMount = useRef(true);
  const prevDataSignatureRef = useRef<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // When date, personnel, or loaded packageSales from server changes, sync form data
  useEffect(() => {
    const currentDayData = packageSales[selectedDate]?.[effectivePersonnelId] || packageSales[selectedDate]?.[String(effectivePersonnelId)] || {};
    const signature = `${selectedDate}_${effectivePersonnelId}_${JSON.stringify(currentDayData)}`;

    if (prevDataSignatureRef.current !== signature) {
      prevDataSignatureRef.current = signature;
      isInitialMount.current = true;
      setPackages(currentDayData.packages || {});
      const rawOther = currentDayData.otherSales || [];
      setOtherSales(rawOther.map((item: any) => {
        const count = Math.max(1, parseInt(String(item.count || 1), 10) || 1);
        const matchedPkg = packagesList.find(p => p.name === item.category);
        const defaultUnitPrice = matchedPkg ? matchedPkg.price : (item.unitPrice !== undefined ? Number(item.unitPrice) : (item.baseAmount !== undefined ? Number(item.baseAmount) : (Number(item.amount) || 0) / count));
        const base = item.baseAmount !== undefined ? item.baseAmount : defaultUnitPrice;
        const isCustom = !packagesList.some(p => p.name === item.category) || item.category === '__CUSTOM_NEW_SALE__';
        const customName = item.customName !== undefined 
          ? item.customName 
          : (isCustom && item.category !== '__CUSTOM_NEW_SALE__' ? item.category : '');
        const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : base;
        const totalAmount = item.amount !== undefined ? Number(item.amount) : (unitPrice * count);
        return {
          category: item.category || (packagesList[0]?.name || 'General'),
          customName,
          count,
          unitPrice,
          amount: totalAmount,
          baseAmount: base,
          discount: item.discount || '',
          description: item.description || ''
        };
      }));
    }
  }, [selectedDate, effectivePersonnelId, packageSales, packagesList]);

  const handlePackageChange = (type: string, val: string) => {
    setPackages(prev => ({ ...prev, [type]: Number(val) }));
  };

  const calculateTotal = () => {
    let total = 0;
    packagesList.forEach(pkg => {
      const count = Number(packages[pkg.name] || 0);
      total += count * (pkg.price || 0);
    });
    otherSales.forEach(s => total += Number(s.amount || 0));
    return total;
  };

  const sanitizeOtherSales = (items: typeof otherSales) => {
    return items.map(s => {
      const isKnownCategory = otherSalesCategories.includes(s.category);
      const isCustom = !isKnownCategory && (s.category === '__CUSTOM_NEW_SALE__' || !packagesList.some(p => p.name === s.category));
      const resolvedName = isKnownCategory
        ? s.category
        : (isCustom ? (s.customName?.trim() || (s.category !== '__CUSTOM_NEW_SALE__' ? s.category : 'Custom Sale')) : s.category);
      return {
        ...s,
        category: resolvedName,
        customName: s.customName !== undefined ? s.customName : (isCustom ? resolvedName : ''),
        count: Math.max(1, Number(s.count || 1)),
        unitPrice: s.unitPrice !== undefined ? Number(s.unitPrice) : (Number(s.amount || 0) / Math.max(1, Number(s.count || 1)))
      };
    });
  };

  // Real-time automatic persistence to database on any input
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const total = calculateTotal();
      const sanitized = sanitizeOtherSales(otherSales);
      onSave({ packages, otherSales: sanitized, total }, effectivePersonnelId, true);
      setSaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [packages, otherSales, effectivePersonnelId]);

  const handleManualSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const total = calculateTotal();
    const sanitized = sanitizeOtherSales(otherSales);
    onSave({ packages, otherSales: sanitized, total }, effectivePersonnelId, false);
    setSaveStatus('saved');
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const computeDiscountAndAmount = (base: number, discountRaw: string | number | undefined) => {
    const basePrice = Math.max(0, Number(base) || 0);
    if (!discountRaw && discountRaw !== 0) {
      return { discountPercent: 0, discountValue: 0, finalAmount: basePrice };
    }

    const str = String(discountRaw).trim();
    if (!str) {
      return { discountPercent: 0, discountValue: 0, finalAmount: basePrice };
    }

    let discountPercent = 0;
    let discountValue = 0;

    if (str.includes('%')) {
      const parsed = parseFloat(str.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) {
        discountPercent = parsed;
        discountValue = Math.round((basePrice * parsed) / 100);
      }
    } else {
      const num = parseFloat(str);
      if (!isNaN(num)) {
        if (num <= 100) {
          discountPercent = num;
          discountValue = Math.round((basePrice * num) / 100);
        } else {
          discountValue = Math.round(num);
          discountPercent = basePrice > 0 ? Math.round((num / basePrice) * 100) : 0;
        }
      }
    }

    const finalAmount = Math.max(0, Math.round(basePrice - discountValue));
    return { discountPercent, discountValue, finalAmount };
  };

  const handleOtherSalesAdd = () => {
    const defaultCat = otherSalesCategories[0] || (packagesList[0] ? packagesList[0].name : '__CUSTOM_NEW_SALE__');
    const matchedPkg = packagesList.find(p => p.name === defaultCat);
    const initialBase = matchedPkg ? matchedPkg.price : 0;
    setOtherSales(prev => [
      ...prev, 
      { 
        category: defaultCat, 
        customName: '',
        count: 1,
        unitPrice: initialBase,
        baseAmount: initialBase,
        discount: '',
        amount: initialBase, 
        description: '' 
      }
    ]);
  };

  const handleOtherSalesCategoryChange = (idx: number, catName: string) => {
    setOtherSales(prev => {
      const updated = [...prev];
      const current = updated[idx];
      if (!current) return prev;
      const count = Math.max(1, Number(current.count || 1));
      if (catName === '__CUSTOM_NEW_SALE__') {
        const customNameVal = current.customName || '';
        updated[idx] = {
          ...current,
          category: customNameVal.trim() ? customNameVal.trim() : '__CUSTOM_NEW_SALE__',
          customName: customNameVal,
          baseAmount: 0,
          unitPrice: 0,
          amount: 0,
          description: customNameVal.trim() ? `Custom sale: ${customNameVal.trim()}` : 'New custom sale'
        };
      } else if (otherSalesCategories.includes(catName)) {
        const unit = current.unitPrice || current.baseAmount || current.amount || 0;
        updated[idx] = {
          ...current,
          category: catName,
          customName: current.customName || '',
          baseAmount: unit,
          unitPrice: unit,
          amount: unit * count,
          description: current.description || catName
        };
      } else {
        const matchedPkg = packagesList.find(p => p.name === catName);
        const base = matchedPkg ? matchedPkg.price : (current.baseAmount || current.amount || 0);
        const { finalAmount: singleItemPrice } = computeDiscountAndAmount(base, current.discount);
        
        updated[idx] = {
          ...current,
          category: catName,
          customName: '',
          baseAmount: base,
          unitPrice: singleItemPrice,
          amount: singleItemPrice * count,
          description: current.discount ? `${current.discount.includes('%') ? current.discount : `${current.discount}%`} discount` : ''
        };
      }
      return updated;
    });
  };

  const handleOtherSalesCustomNameChange = (idx: number, name: string) => {
    setOtherSales(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const current = updated[idx];
      const isKnownCategory = otherSalesCategories.includes(current.category) || packagesList.some(p => p.name === current.category);
      updated[idx] = {
        ...current,
        customName: name,
        category: isKnownCategory ? current.category : (name.trim() ? name.trim() : '__CUSTOM_NEW_SALE__'),
        description: name.trim() ? `Sale: ${name.trim()}` : (current.description || 'Custom sale')
      };
      return updated;
    });
  };

  const handleOtherSalesCountChange = (idx: number, countRaw: string | number) => {
    setOtherSales(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const current = updated[idx];
      const count = Math.max(1, parseInt(String(countRaw), 10) || 1);
      
      let base = current.baseAmount;
      if (base === undefined || base === 0) {
        const matchedPkg = packagesList.find(p => p.name === current.category);
        base = matchedPkg ? matchedPkg.price : (current.unitPrice || current.amount || 0);
      }
      const { finalAmount: singlePrice } = computeDiscountAndAmount(base, current.discount);
      const total = singlePrice * count;

      updated[idx] = {
        ...current,
        count,
        baseAmount: base,
        unitPrice: singlePrice,
        amount: total
      };
      return updated;
    });
  };

  const handleOtherSalesIncrementCount = (idx: number, delta: number) => {
    setOtherSales(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const current = updated[idx];
      const curCount = Math.max(1, Number(current.count || 1));
      const nextCount = Math.max(1, curCount + delta);
      
      let base = current.baseAmount;
      if (base === undefined || base === 0) {
        const matchedPkg = packagesList.find(p => p.name === current.category);
        base = matchedPkg ? matchedPkg.price : (current.unitPrice || current.amount || 0);
      }
      const { finalAmount: singlePrice } = computeDiscountAndAmount(base, current.discount);
      const total = singlePrice * nextCount;

      updated[idx] = {
        ...current,
        count: nextCount,
        baseAmount: base,
        unitPrice: singlePrice,
        amount: total
      };
      return updated;
    });
  };

  const handleOtherSalesDiscountChange = (idx: number, discountVal: string) => {
    const updated = [...otherSales];
    const current = updated[idx];
    if (!current) return;
    const count = Math.max(1, Number(current.count || 1));
    
    let base = current.baseAmount;
    if (base === undefined || base === 0) {
      const matchedPkg = packagesList.find(p => p.name === current.category);
      base = matchedPkg ? matchedPkg.price : (current.unitPrice || current.amount || 0);
    }

    const { finalAmount: singlePrice } = computeDiscountAndAmount(base, discountVal);
    
    updated[idx] = {
      ...current,
      baseAmount: base,
      discount: discountVal,
      unitPrice: singlePrice,
      amount: singlePrice * count,
      description: discountVal ? `${discountVal.includes('%') ? discountVal : `${discountVal}%`} discount` : ''
    };
    setOtherSales(updated);
  };

  const handleOtherSalesUnitPriceChange = (idx: number, val: string) => {
    const updated = [...otherSales];
    const current = updated[idx];
    if (!current) return;
    const num = Math.max(0, Number(val) || 0);
    const count = Math.max(1, Number(current.count || 1));
    const { finalAmount: singlePrice } = computeDiscountAndAmount(num, current.discount);

    updated[idx] = {
      ...current,
      baseAmount: num,
      unitPrice: singlePrice,
      amount: singlePrice * count
    };
    setOtherSales(updated);
  };

  const handleOtherSalesAmountChange = (idx: number, val: string) => {
    const updated = [...otherSales];
    const current = updated[idx];
    if (!current) return;
    const num = Math.max(0, Number(val) || 0);
    const count = Math.max(1, Number(current.count || 1));
    
    updated[idx] = {
      ...current,
      amount: num,
      unitPrice: count > 0 ? Math.round(num / count) : num
    };
    setOtherSales(updated);
  };

  const handleOtherSalesRemove = (idx: number) => {
    setOtherSales(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Daily Package Sales</h2>
            {/* Live Database Save Status Indicator */}
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-full font-medium shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Saving to DB...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-3 py-1 rounded-full font-medium shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Saved in DB permanently {lastSavedAt ? `(${lastSavedAt})` : ''}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-1">
            Real-time persistence: any change is saved permanently to the database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Cashier Indicator for Ticket Sales */}
          {role === 'ticket-sales' && (
            <div className="flex items-center gap-2 bg-teal-950/60 px-3.5 py-1.5 rounded-xl border border-teal-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Cashier:</span>
              <span className="text-white text-sm font-semibold">{currentUser?.name || 'Ticket Sales'}</span>
            </div>
          )}

          {/* Personnel Selector for Sales Executive / Admin */}
          {ticketSalesPersonnel && ticketSalesPersonnel.length > 0 && (role === 'sales-officer' || role === 'admin') && (
            <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-700">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Staff:</span>
              <select 
                value={effectivePersonnelId} 
                onChange={(e) => {
                  isInitialMount.current = true;
                  setTargetPersonnelId(Number(e.target.value));
                }}
                className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer"
              >
                {ticketSalesPersonnel.map((p: any) => (
                  <option key={p.id} value={p.id} className="bg-gray-800 text-white">
                    {p.name} (#{p.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Date:</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => {
                isInitialMount.current = true;
                onDateChange(e.target.value);
              }} 
              className="bg-transparent text-white text-sm outline-none cursor-pointer" 
            />
          </div>

          <button 
            type="button"
            onClick={handleManualSave} 
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Packages</h3>
          <div className="space-y-4">
            {packagesList.map(pkg => (
              <div key={pkg.id || pkg.name} className="flex justify-between items-center">
                <div>
                  <label className="text-gray-200 font-medium block">{pkg.name}</label>
                  <span className="text-xs text-green-400">{currency} {pkg.price.toLocaleString()}</span>
                </div>
                <input 
                  type="number" 
                  min="0"
                  className="bg-gray-700 text-white w-24 p-2 rounded border border-gray-600 text-right outline-none focus:border-blue-500"
                  value={packages[pkg.name] || ''}
                  onChange={(e) => handlePackageChange(pkg.name, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <div>
              <h3 className="text-lg font-bold text-white">Other Sales</h3>
              <p className="text-xs text-gray-400">Ancillary sales, packages & custom categories</p>
            </div>
            <div className="flex items-center gap-2">
              {(role === 'sales-officer' || role === 'admin') && (
                <button 
                  type="button"
                  onClick={() => setNewCategoryModalOpen(!newCategoryModalOpen)}
                  className="text-xs bg-amber-600/30 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Create new Other Sales category"
                >
                  <Tag className="w-3 h-3" />
                  <span>+ New Category</span>
                </button>
              )}
              <button onClick={handleOtherSalesAdd} className="text-xs bg-blue-600 px-2.5 py-1 rounded text-white hover:bg-blue-700 font-bold transition-colors cursor-pointer">
                + Add Item
              </button>
            </div>
          </div>

          {newCategoryModalOpen && (
            <div className="bg-amber-950/40 border border-amber-500/50 p-3 rounded-xl mb-4 flex items-center gap-2 animate-fade-in-up">
              <input
                type="text"
                placeholder="Enter new Other Sales category name..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newCategoryInput.trim() && onAddCategory) {
                      onAddCategory(newCategoryInput.trim());
                      setNewCategoryInput('');
                      setNewCategoryModalOpen(false);
                    }
                  }
                }}
                className="flex-1 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg border border-gray-600 focus:border-amber-400 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCategoryInput.trim() && onAddCategory) {
                    onAddCategory(newCategoryInput.trim());
                    setNewCategoryInput('');
                    setNewCategoryModalOpen(false);
                  }
                }}
                className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Create Category
              </button>
              <button
                type="button"
                onClick={() => setNewCategoryModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="space-y-3 flex-grow">
            {otherSales.map((item, idx) => {
              const currentCount = Math.max(1, Number(item.count || 1));
              const unitBase = item.baseAmount !== undefined ? Number(item.baseAmount) : (item.unitPrice || 0);
              const { finalAmount: singleItemPrice } = computeDiscountAndAmount(unitBase, item.discount);
              const calculatedTotal = singleItemPrice * currentCount;

              return (
                <div key={idx} className="bg-gray-750/70 p-3.5 rounded-xl border border-gray-600/80 space-y-3 animate-fade-in-up">
                  {/* Top Row: 1st Package/Category, 2nd Sale Name/Item Description, Beside: Count, Remove */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                    {/* 1st: Package / Category */}
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                        1st: Package / Category
                      </label>
                      <select 
                        className="bg-gray-900 text-white w-full p-2 rounded-lg text-xs sm:text-sm border border-gray-600 outline-none focus:border-blue-500 cursor-pointer font-medium" 
                        value={
                          packagesList.some(p => p.name === item.category) 
                            ? item.category 
                            : (otherSalesCategories.includes(item.category) ? item.category : '__CUSTOM_NEW_SALE__')
                        }
                        onChange={(e) => handleOtherSalesCategoryChange(idx, e.target.value)}
                      >
                        <option value="" disabled>-- Select Category or Package --</option>
                        {otherSalesCategories.length > 0 && (
                          <optgroup label="📂 Categories (Created by Sales Officer)">
                            {otherSalesCategories.map((cat: string) => (
                              <option key={cat} value={cat}>
                                📁 {cat}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="🎟️ Packages">
                          {packagesList.map(pkg => (
                            <option key={pkg.id || pkg.name} value={pkg.name}>
                              {pkg.name} ({currency} {pkg.price.toLocaleString()})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="✨ Custom / Other Sale">
                          <option value="__CUSTOM_NEW_SALE__">+ Custom / New Sale</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* 2nd: Sale Name / Item Description */}
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                        2nd: Sale Name / Item Description
                      </label>
                      <input
                        type="text"
                        value={item.customName !== undefined ? item.customName : (!packagesList.some(p => p.name === item.category) && item.category !== '__CUSTOM_NEW_SALE__' && !otherSalesCategories.includes(item.category) ? item.category : '')}
                        onChange={(e) => handleOtherSalesCustomNameChange(idx, e.target.value)}
                        placeholder={otherSalesCategories.includes(item.category) ? `Description in ${item.category}...` : "Sale name (e.g. Festival Pass, Merchandise)..."}
                        className="bg-gray-900 text-white w-full px-3 py-2 rounded-lg text-xs sm:text-sm border border-gray-600 focus:border-amber-400 outline-none font-medium placeholder-gray-500"
                      />
                    </div>

                    {/* Beside of this: Other Sale Count */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
                        Count
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOtherSalesIncrementCount(idx, -1)}
                          className="w-7 h-9 rounded-lg bg-gray-850 hover:bg-gray-700 text-gray-200 border border-gray-600 font-bold text-sm cursor-pointer flex items-center justify-center transition-colors"
                          title="Decrease count"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.count !== undefined ? item.count : 1}
                          onChange={(e) => handleOtherSalesCountChange(idx, e.target.value)}
                          className="w-12 h-9 bg-gray-900 text-teal-300 text-center font-mono font-bold rounded-lg border border-teal-500/50 outline-none focus:border-teal-400 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleOtherSalesIncrementCount(idx, 1)}
                          className="w-7 h-9 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-bold text-sm cursor-pointer flex items-center justify-center transition-colors"
                          title="Increase count"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="md:col-span-1 flex justify-end">
                      <button 
                        type="button"
                        onClick={() => handleOtherSalesRemove(idx)} 
                        className="h-9 w-9 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 border border-red-500/30 transition-colors flex items-center justify-center font-bold text-lg cursor-pointer"
                        title="Remove item"
                      >
                        &times;
                      </button>
                    </div>
                  </div>

                  {/* Pricing & Multiplier Breakdown Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 bg-gray-850/60 p-2.5 rounded-xl border border-gray-700/60">
                    {/* Price for 1 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                          Price for 1 ({currency})
                        </label>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        className="bg-gray-900 text-white w-full px-2.5 py-1.5 rounded-lg text-xs sm:text-sm border border-gray-600 outline-none focus:border-blue-400 font-mono font-bold" 
                        placeholder="0"
                        value={item.baseAmount !== undefined ? item.baseAmount : (item.unitPrice || '')}
                        onChange={(e) => handleOtherSalesUnitPriceChange(idx, e.target.value)}
                      />
                    </div>

                    {/* Discount Option */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          Discount Option
                        </label>
                        {item.discount ? (
                          <span className="text-[9px] text-amber-300 font-mono">
                            Unit: {currency} {singleItemPrice.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            className="bg-gray-900 text-white w-full px-2 py-1.5 rounded-lg text-xs border border-gray-600 outline-none focus:border-amber-500 font-mono" 
                            placeholder="e.g. 10%"
                            value={item.discount || ''}
                            onChange={(e) => handleOtherSalesDiscountChange(idx, e.target.value)}
                          />
                          {item.discount && (
                            <button 
                              type="button"
                              onClick={() => handleOtherSalesDiscountChange(idx, '')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          {['5%', '10%', '15%', '20%'].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleOtherSalesDiscountChange(idx, item.discount === pct ? '' : pct)}
                              className={`px-1 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                                item.discount === pct
                                  ? 'bg-amber-500 text-gray-950 font-black shadow-sm'
                                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                              }`}
                            >
                              {pct}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Multiplied Total Amount */}
                    <div className="bg-emerald-950/40 border border-emerald-500/50 p-2 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                          Total (Count {currentCount} × {currency} {singleItemPrice.toLocaleString()})
                        </span>
                        {currentCount > 1 && (
                          <span className="text-[9px] bg-teal-900/80 text-teal-200 px-1.5 py-0.5 rounded font-mono font-bold">
                            ×{currentCount} Multiplied
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-300 font-mono">
                          {currentCount} × {singleItemPrice} =
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-emerald-400 font-bold font-mono">{currency}</span>
                          <input 
                            type="number" 
                            min="0"
                            className="bg-gray-900 text-emerald-300 font-mono font-black text-sm sm:text-base w-24 px-2 py-0.5 rounded border border-emerald-500/50 text-right outline-none focus:border-emerald-400" 
                            placeholder="0"
                            value={item.amount !== undefined ? item.amount : calculatedTotal}
                            onChange={(e) => handleOtherSalesAmountChange(idx, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {otherSales.length === 0 && <p className="text-gray-500 text-center italic text-sm py-4">No other sales recorded.</p>}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center shadow-lg">
        <span className="text-gray-400 text-lg">Total Daily Revenue</span>
        <p className="text-4xl font-bold text-green-400 mt-2">{currency} {calculateTotal().toLocaleString()}</p>
      </div>

        {/* Requirement 5: Previous Sales Records & Audited History for Ticket Sale role and Sales Executive role */}
      <div className="bg-gray-800 p-5 sm:p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Previous Sales Records</span>
                <span className="text-[11px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded-full">
                  Audited History
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Search, filter, and audit past sales entries by date range, cashier, package, or item.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setHistoryDateFilterEnabled(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                historyDateFilterEnabled 
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow' 
                  : 'bg-gray-900/80 text-gray-300 border-gray-700 hover:border-gray-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Date Filter: {historyDateFilterEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Date Range Controls */}
        <div className="space-y-2.5 bg-gray-900/60 p-3.5 rounded-xl border border-gray-750">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search records by date (YYYY-MM-DD), cashier name, package name, or other item..."
                className="w-full bg-gray-950 text-white rounded-lg pl-9 pr-8 py-2 text-xs border border-gray-700 outline-none focus:border-blue-500 placeholder-gray-500"
              />
              {historySearchQuery && (
                <button
                  type="button"
                  onClick={() => setHistorySearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  const todayStr = getLocalDateString();
                  setHistoryDateFilterEnabled(true);
                  if (onMySalesStartDateChange) onMySalesStartDateChange(todayStr);
                  if (onMySalesEndDateChange) onMySalesEndDateChange(todayStr);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-semibold cursor-pointer border border-gray-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayDate = new Date();
                  const past7 = new Date();
                  past7.setDate(past7.getDate() - 7);
                  setHistoryDateFilterEnabled(true);
                  if (onMySalesStartDateChange) onMySalesStartDateChange(getDhakaDateString(past7));
                  if (onMySalesEndDateChange) onMySalesEndDateChange(getDhakaDateString(todayDate));
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-semibold cursor-pointer border border-gray-700"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayDate = new Date();
                  const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
                  setHistoryDateFilterEnabled(true);
                  if (onMySalesStartDateChange) onMySalesStartDateChange(getDhakaDateString(startOfMonth));
                  if (onMySalesEndDateChange) onMySalesEndDateChange(getDhakaDateString(todayDate));
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-semibold cursor-pointer border border-gray-700"
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryDateFilterEnabled(false);
                  setHistorySearchQuery('');
                  if (onMySalesStartDateChange) onMySalesStartDateChange('');
                  if (onMySalesEndDateChange) onMySalesEndDateChange('');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-semibold cursor-pointer border border-gray-700"
              >
                All Time
              </button>
            </div>
          </div>

          {/* Date pickers row when filter is enabled */}
          {historyDateFilterEnabled && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-800 text-xs">
              <span className="text-gray-400 font-medium">Date Range:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">From:</span>
                <input
                  type="date"
                  value={mySalesStartDate || ''}
                  onChange={(e) => onMySalesStartDateChange && onMySalesStartDateChange(e.target.value)}
                  className="bg-gray-950 text-white rounded px-2.5 py-1 border border-gray-750 outline-none focus:border-blue-500 text-xs cursor-pointer font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">To:</span>
                <input
                  type="date"
                  value={mySalesEndDate || ''}
                  onChange={(e) => onMySalesEndDateChange && onMySalesEndDateChange(e.target.value)}
                  className="bg-gray-950 text-white rounded px-2.5 py-1 border border-gray-750 outline-none focus:border-blue-500 text-xs cursor-pointer font-mono"
                />
              </div>
              {(mySalesStartDate || mySalesEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onMySalesStartDateChange) onMySalesStartDateChange('');
                    if (onMySalesEndDateChange) onMySalesEndDateChange('');
                  }}
                  className="text-gray-400 hover:text-amber-300 text-xs underline cursor-pointer"
                >
                  Reset Range
                </button>
              )}
            </div>
          )}
        </div>

        {/* Previous Sales List */}
        {(() => {
          // Collect all records across dates
          const allHistoryEntries: Array<{
            date: string;
            personnelId: number;
            personnelName: string;
            packages: Record<string, number>;
            otherSales: any[];
            total: number;
          }> = [];

          Object.keys(packageSales || {}).sort((a, b) => b.localeCompare(a)).forEach(d => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
            const dayObj = packageSales[d] || {};
            Object.entries(dayObj).forEach(([pIdStr, rec]: [string, any]) => {
              const pId = Number(pIdStr);
              // For ticket-sales role, if not executive, focus on current user or show all
              if (role === 'ticket-sales' && effectivePersonnelId && pId !== effectivePersonnelId) {
                return;
              }
              const person = ticketSalesPersonnel.find((p: any) => p.id === pId);
              let total = Number(rec?.total || 0);
              if (!total) {
                // Calculate if total missing
                let calc = 0;
                packagesList.forEach(pkg => {
                  calc += Number(rec?.packages?.[pkg.name] || 0) * (pkg.price || 0);
                });
                (rec?.otherSales || []).forEach((os: any) => calc += Number(os.amount || 0));
                total = calc;
              }
              allHistoryEntries.push({
                date: d,
                personnelId: pId,
                personnelName: person?.name || `Cashier #${pId}`,
                packages: rec?.packages || {},
                otherSales: rec?.otherSales || [],
                total
              });
            });
          });

          // Filter by date range if enabled
          const filteredByDate = allHistoryEntries.filter(entry => {
            if (historyDateFilterEnabled) {
              if (mySalesStartDate && entry.date < mySalesStartDate) return false;
              if (mySalesEndDate && entry.date > mySalesEndDate) return false;
            }
            return true;
          });

          // Filter by search query
          const q = historySearchQuery.trim().toLowerCase();
          const historyEntries = q ? filteredByDate.filter(entry => {
            if (entry.date.toLowerCase().includes(q)) return true;
            if (entry.personnelName.toLowerCase().includes(q)) return true;
            if (String(entry.total).includes(q)) return true;
            if (Object.keys(entry.packages).some(pkgName => pkgName.toLowerCase().includes(q) && Number(entry.packages[pkgName]) > 0)) return true;
            if (entry.otherSales.some(os => {
              const label = (os.customName || os.category || os.description || '').toLowerCase();
              return label.includes(q);
            })) return true;
            return false;
          }) : filteredByDate;

          const totalFilteredRevenue = historyEntries.reduce((acc, e) => acc + e.total, 0);
          const totalFilteredPackages = historyEntries.reduce((acc, e) => {
            return acc + Object.values(e.packages).reduce((pAcc, v) => pAcc + Number(v || 0), 0);
          }, 0);

          if (allHistoryEntries.length === 0) {
            return (
              <div className="text-center py-6 bg-gray-900/50 rounded-xl border border-gray-750 text-gray-400 text-sm italic">
                No previous sales records found yet for this account. Newly saved sales will automatically appear here.
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {/* Summary KPIs for Filtered Records */}
              <div className="grid grid-cols-3 gap-2 bg-gray-900/70 p-2.5 rounded-xl border border-gray-750 text-center text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Filtered Records</span>
                  <span className="font-bold text-white font-mono text-sm">{historyEntries.length} of {allHistoryEntries.length}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Total Packages Sold</span>
                  <span className="font-bold text-amber-300 font-mono text-sm">{totalFilteredPackages.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Total Filtered Revenue</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">{currency} {totalFilteredRevenue.toLocaleString()}</span>
                </div>
              </div>

              {historyEntries.length === 0 ? (
                <div className="text-center py-6 bg-gray-900/50 rounded-xl border border-gray-750 text-gray-400 text-sm italic space-y-2">
                  <p>No records matched your search query or date range.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearchQuery('');
                      setHistoryDateFilterEnabled(false);
                      if (onMySalesStartDateChange) onMySalesStartDateChange('');
                      if (onMySalesEndDateChange) onMySalesEndDateChange('');
                    }}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Clear Search & Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1">
                {historyEntries.map((record, rIdx) => {
                  const isSelectedDate = record.date === selectedDate;
                  const totalPkgCount = Object.values(record.packages).reduce((acc, v) => acc + Number(v || 0), 0);
                  const totalOtherCount = record.otherSales.reduce((acc, os) => acc + Math.max(1, Number(os.count || 1)), 0);

                  return (
                    <div 
                      key={`${record.date}_${record.personnelId}_${rIdx}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelectedDate 
                          ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/40 shadow-lg' 
                          : 'bg-gray-900/70 border-gray-750 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-white text-sm bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700">
                            📅 {record.date}
                          </span>
                          <span className="text-xs text-gray-300 font-medium bg-gray-850 px-2 py-1 rounded-lg border border-gray-750">
                            👤 {record.personnelName}
                          </span>
                          {isSelectedDate && (
                            <span className="text-[10px] font-bold bg-blue-500 text-gray-950 px-2 py-0.5 rounded-full uppercase">
                              Currently Selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-xs text-gray-400 mr-1.5">Total Revenue:</span>
                            <span className="text-emerald-400 font-mono font-black text-sm sm:text-base">
                              {currency} {record.total.toLocaleString()}
                            </span>
                          </div>
                          {!isSelectedDate && (
                            <button
                              type="button"
                              onClick={() => {
                                isInitialMount.current = true;
                                if (role === 'sales-officer' || role === 'admin') {
                                  setTargetPersonnelId(record.personnelId);
                                }
                                onDateChange(record.date);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow"
                            >
                              Load Date
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Itemized details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Packages Sold */}
                        <div className="bg-gray-850/80 p-2.5 rounded-lg border border-gray-800">
                          <span className="text-gray-400 font-bold block mb-1">
                            🎟️ Packages Sold ({totalPkgCount} total):
                          </span>
                          {Object.keys(record.packages).length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(record.packages).map(([pName, qty]) => {
                                if (Number(qty) <= 0) return null;
                                return (
                                  <span key={pName} className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded border border-gray-700 font-mono text-[11px]">
                                    {pName}: <strong className="text-amber-300">{Number(qty).toLocaleString()}</strong>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">No package counts</span>
                          )}
                        </div>

                        {/* Other Sales */}
                        <div className="bg-gray-850/80 p-2.5 rounded-lg border border-gray-800">
                          <span className="text-gray-400 font-bold block mb-1">
                            📦 Other Sales ({totalOtherCount} items):
                          </span>
                          {record.otherSales && record.otherSales.length > 0 ? (
                            <div className="space-y-1">
                              {record.otherSales.map((os, osIdx) => {
                                const count = Math.max(1, Number(os.count || 1));
                                const label = os.customName || os.category || os.description || 'Other Sale';
                                return (
                                  <div key={osIdx} className="flex items-center justify-between text-[11px] font-mono text-gray-300 bg-gray-900/50 px-2 py-0.5 rounded">
                                    <span className="truncate max-w-[150px]">
                                      {label} {count > 1 ? `(Count: ${count})` : ''}
                                    </span>
                                    <span className="text-emerald-300 font-bold">
                                      {currency} {Number(os.amount || 0).toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">No other sales</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export const SalesOfficerDashboard = ({ 
  ticketSalesPersonnel = [], 
  packageSales = {}, 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  role = 'sales-officer',
  onEditSales,
  otherSalesCategories = [],
  currency = 'BDT',
  availablePackages = [],
  currentUser
}: any) => {
  const packagesList: PackageItem[] = availablePackages.length > 0 ? availablePackages : DEFAULT_PACKAGES;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDate, setEditDate] = useState<string>(endDate || new Date().toISOString().split('T')[0]);
  const [editPersonnelId, setEditPersonnelId] = useState<number>(ticketSalesPersonnel[0]?.id || 1);
  const [editPackages, setEditPackages] = useState<Record<string, number>>({});
  const [editOtherSales, setEditOtherSales] = useState<Array<{
    category: string;
    amount: number;
    baseAmount?: number;
    discount?: string;
    description?: string;
  }>>([]);
  const [editSaveStatus, setEditSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

  const aggregatedData = useMemo(() => {
    const totals: Record<number, number> = {};
    const records: any[] = [];
    Object.keys(packageSales).forEach(date => {
      if (date >= startDate && date <= endDate) {
        Object.entries(packageSales[date] || {}).forEach(([pId, data]: [string, any]) => {
          const id = Number(pId);
          totals[id] = (totals[id] || 0) + (data.total || 0);
          records.push({ date, personnelId: id, ...data });
        });
      }
    });
    return { totals, records };
  }, [packageSales, startDate, endDate]);

  const computeDiscountAndAmount = (base: number, discountRaw: string | number | undefined) => {
    const basePrice = Math.max(0, Number(base) || 0);
    if (!discountRaw && discountRaw !== 0) {
      return { discountPercent: 0, discountValue: 0, finalAmount: basePrice };
    }
    const str = String(discountRaw).trim();
    if (!str) return { discountPercent: 0, discountValue: 0, finalAmount: basePrice };

    let discountPercent = 0;
    let discountValue = 0;
    if (str.includes('%')) {
      const parsed = parseFloat(str.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) {
        discountPercent = parsed;
        discountValue = Math.round((basePrice * parsed) / 100);
      }
    } else {
      const num = parseFloat(str);
      if (!isNaN(num)) {
        if (num <= 100) {
          discountPercent = num;
          discountValue = Math.round((basePrice * num) / 100);
        } else {
          discountValue = Math.round(num);
          discountPercent = basePrice > 0 ? Math.round((num / basePrice) * 100) : 0;
        }
      }
    }
    const finalAmount = Math.max(0, Math.round(basePrice - discountValue));
    return { discountPercent, discountValue, finalAmount };
  };

  const loadRecordForEdit = (date: string, pId: number) => {
    setEditDate(date);
    setEditPersonnelId(pId);
    const existing = packageSales[date]?.[pId] || {};
    setEditPackages(existing.packages || {});
    const rawOther = existing.otherSales || [];
    setEditOtherSales(rawOther.map((item: any) => {
      const matchedPkg = packagesList.find(p => p.name === item.category);
      const base = item.baseAmount !== undefined ? item.baseAmount : (matchedPkg ? matchedPkg.price : (item.amount || 0));
      const isCustom = !packagesList.some(p => p.name === item.category) || item.category === '__CUSTOM_NEW_SALE__';
      const customName = item.customName !== undefined 
        ? item.customName 
        : (isCustom && item.category !== '__CUSTOM_NEW_SALE__' ? item.category : '');
      return {
        category: item.category || (packagesList[0]?.name || 'General'),
        customName,
        amount: item.amount !== undefined ? item.amount : base,
        baseAmount: base,
        discount: item.discount || '',
        description: item.description || ''
      };
    }));
    setEditSaveStatus('idle');
    setEditModalOpen(true);
  };

  const handleModalDateOrPersonnelChange = (newDate: string, newPersonnelId: number) => {
    setEditDate(newDate);
    setEditPersonnelId(newPersonnelId);
    const existing = packageSales[newDate]?.[newPersonnelId] || {};
    setEditPackages(existing.packages || {});
    const rawOther = existing.otherSales || [];
    setEditOtherSales(rawOther.map((item: any) => {
      const matchedPkg = packagesList.find(p => p.name === item.category);
      const base = item.baseAmount !== undefined ? item.baseAmount : (matchedPkg ? matchedPkg.price : (item.amount || 0));
      const isCustom = !packagesList.some(p => p.name === item.category) || item.category === '__CUSTOM_NEW_SALE__';
      const customName = item.customName !== undefined 
        ? item.customName 
        : (isCustom && item.category !== '__CUSTOM_NEW_SALE__' ? item.category : '');
      return {
        category: item.category || (packagesList[0]?.name || 'General'),
        customName,
        amount: item.amount !== undefined ? item.amount : base,
        baseAmount: base,
        discount: item.discount || '',
        description: item.description || ''
      };
    }));
    setEditSaveStatus('idle');
  };

  const handleEditPackageChange = (type: string, val: string) => {
    setEditPackages(prev => ({ ...prev, [type]: Number(val) }));
    setEditSaveStatus('idle');
  };

  const handleEditOtherAdd = () => {
    const defaultPkg = packagesList[0];
    const initialBase = defaultPkg ? defaultPkg.price : 0;
    setEditOtherSales(prev => [
      ...prev,
      {
        category: defaultPkg ? defaultPkg.name : '__CUSTOM_NEW_SALE__',
        customName: '',
        baseAmount: initialBase,
        discount: '',
        amount: initialBase,
        description: ''
      }
    ]);
    setEditSaveStatus('idle');
  };

  const handleEditOtherCategoryChange = (idx: number, catName: string) => {
    setEditOtherSales(prev => {
      const updated = [...prev];
      const current = updated[idx];
      if (!current) return prev;
      if (catName === '__CUSTOM_NEW_SALE__') {
        const customNameVal = current.customName || '';
        updated[idx] = {
          ...current,
          category: customNameVal.trim() ? customNameVal.trim() : '__CUSTOM_NEW_SALE__',
          customName: customNameVal,
          baseAmount: 0,
          amount: current.amount || 0,
          description: customNameVal.trim() ? `Custom sale: ${customNameVal.trim()}` : 'New custom sale'
        };
      } else {
        const matchedPkg = packagesList.find(p => p.name === catName);
        const base = matchedPkg ? matchedPkg.price : (current.baseAmount || current.amount || 0);
        const { finalAmount } = computeDiscountAndAmount(base, current.discount);
        updated[idx] = {
          ...current,
          category: catName,
          customName: '',
          baseAmount: base,
          amount: finalAmount,
          description: current.discount ? `${current.discount}% discount` : ''
        };
      }
      return updated;
    });
    setEditSaveStatus('idle');
  };

  const handleEditOtherCustomNameChange = (idx: number, name: string) => {
    setEditOtherSales(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const trimmed = name.trim();
      updated[idx] = {
        ...updated[idx],
        customName: name,
        category: trimmed ? trimmed : '__CUSTOM_NEW_SALE__',
        description: trimmed ? `Custom sale: ${trimmed}` : 'New custom sale'
      };
      return updated;
    });
    setEditSaveStatus('idle');
  };

  const handleEditOtherDiscountChange = (idx: number, discountVal: string) => {
    const updated = [...editOtherSales];
    const current = updated[idx];
    let base = current.baseAmount;
    if (base === undefined || base === 0) {
      const matchedPkg = packagesList.find(p => p.name === current.category);
      base = matchedPkg ? matchedPkg.price : (current.amount || 0);
    }
    const { finalAmount } = computeDiscountAndAmount(base, discountVal);
    updated[idx] = {
      ...current,
      baseAmount: base,
      discount: discountVal,
      amount: finalAmount,
      description: discountVal ? `${discountVal}% discount` : ''
    };
    setEditOtherSales(updated);
    setEditSaveStatus('idle');
  };

  const handleEditOtherAmountChange = (idx: number, val: string) => {
    const updated = [...editOtherSales];
    const num = Number(val) || 0;
    updated[idx] = {
      ...updated[idx],
      amount: num,
      baseAmount: !updated[idx].discount ? num : (updated[idx].baseAmount || num)
    };
    setEditOtherSales(updated);
    setEditSaveStatus('idle');
  };

  const handleEditOtherRemove = (idx: number) => {
    setEditOtherSales(prev => prev.filter((_, i) => i !== idx));
    setEditSaveStatus('idle');
  };

  const calculateEditTotal = () => {
    let total = 0;
    packagesList.forEach(pkg => {
      const count = Number(editPackages[pkg.name] || 0);
      total += count * (pkg.price || 0);
    });
    editOtherSales.forEach(s => total += Number(s.amount || 0));
    return total;
  };

  const handleSaveEditRecord = () => {
    if (!onEditSales) return;
    setEditSaveStatus('saving');
    const total = calculateEditTotal();
    const sanitized = editOtherSales.map(item => {
      const isCustom = !packagesList.some(p => p.name === item.category) || item.category === '__CUSTOM_NEW_SALE__';
      const resolvedName = isCustom ? (item.customName?.trim() || (item.category !== '__CUSTOM_NEW_SALE__' ? item.category : 'Custom Sale')) : item.category;
      return {
        ...item,
        category: resolvedName,
        customName: item.customName !== undefined ? item.customName : (isCustom ? resolvedName : '')
      };
    });
    onEditSales(editDate, editPersonnelId, {
      packages: editPackages,
      otherSales: sanitized,
      total
    });
    setEditSaveStatus('saved');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Header */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Sales Executive Dashboard</h2>
          <p className="text-gray-400 text-xs mt-1">
            Review personnel package sales and enter/adjust records with permanent cloud database storage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-700 text-xs">
            <span className="text-gray-400 font-medium">From:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => onStartDateChange(e.target.value)} 
              className="bg-transparent text-white outline-none cursor-pointer" 
            />
            <span className="text-gray-400 font-medium ml-1">To:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => onEndDateChange(e.target.value)} 
              className="bg-transparent text-white outline-none cursor-pointer" 
            />
          </div>

          <button
            type="button"
            onClick={() => loadRecordForEdit(endDate, ticketSalesPersonnel[0]?.id || 1)}
            className="bg-teal-600 hover:bg-teal-500 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-teal-900/40 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record / Enter Sales</span>
          </button>
        </div>
      </div>

      {/* Personnel Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {ticketSalesPersonnel.map((p: any) => (
          <div key={p.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow flex flex-col justify-between hover:border-teal-500/40 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 bg-teal-900/50 text-teal-300 rounded-2xl flex items-center justify-center text-lg font-bold border border-teal-700/60 shadow-inner">
                {p.name.charAt(0)}
              </div>
              <button
                type="button"
                onClick={() => loadRecordForEdit(endDate, p.id)}
                className="px-2.5 py-1 bg-teal-950/70 hover:bg-teal-700 text-teal-300 hover:text-white border border-teal-800/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                title="Enter or adjust sales for this personnel"
              >
                <Plus className="w-3 h-3" />
                <span>Enter Sales</span>
              </button>
            </div>
            
            <div className="mt-3">
              <h3 className="font-bold text-white text-base leading-tight">{p.name}</h3>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-750 px-1.5 py-0.5 rounded">ID #{p.id}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-750">
              <p className="text-gray-400 text-[11px] uppercase tracking-wider font-semibold">Total Revenue (Range)</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                {currency} {(aggregatedData.totals[p.id] || 0).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Records Table */}
      <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
        <div className="p-4 bg-gray-850 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Package Sales History</h3>
          <span className="text-xs text-gray-400">{aggregatedData.records.length} records found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-750 text-gray-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Personnel</th>
                <th className="p-4">Packages Sold</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/80">
              {aggregatedData.records.map((r, idx) => {
                const p = ticketSalesPersonnel.find((tp: any) => tp.id === r.personnelId);
                const pkgCount = Object.values(r.packages || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
                const otherCount = (r.otherSales || []).length;
                return (
                  <tr key={idx} className="hover:bg-gray-750/50 transition-colors">
                    <td className="p-4 font-mono text-gray-300">{r.date}</td>
                    <td className="p-4 font-medium text-white">{p?.name || `Staff #${r.personnelId}`}</td>
                    <td className="p-4 text-xs text-gray-300">
                      <span className="bg-gray-700 px-2 py-0.5 rounded text-teal-300 font-semibold">{pkgCount} pkgs</span>
                      {otherCount > 0 && (
                        <span className="ml-1.5 bg-gray-700 px-2 py-0.5 rounded text-amber-300 font-semibold">+{otherCount} other</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-400 font-mono text-base">
                      {currency} {r.total?.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => loadRecordForEdit(r.date, r.personnelId)}
                        className="px-3 py-1.5 bg-teal-600/30 hover:bg-teal-600 border border-teal-500/40 hover:border-teal-500 text-teal-300 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit / Adjust</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {aggregatedData.records.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center italic text-gray-500">
                    No sales records found for this period. Click "+ Record / Enter Sales" to add a new record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Executive Entry / Edit Modal with Direct Permanent Database Save */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-700 bg-gray-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sales Executive Record Entry</h3>
                  <p className="text-xs text-gray-400">Directly saves sales records to permanent cloud database</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditModalOpen(false)} 
                className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-grow">
              {/* Date & Personnel Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-750">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                    Staff Member / Cashier
                  </label>
                  <select
                    value={editPersonnelId}
                    onChange={(e) => handleModalDateOrPersonnelChange(editDate, Number(e.target.value))}
                    className="w-full bg-gray-800 text-white text-sm p-2 rounded-lg border border-gray-600 outline-none focus:border-teal-500 font-semibold"
                  >
                    {ticketSalesPersonnel.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (ID #{p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                    Sales Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => handleModalDateOrPersonnelChange(e.target.value, editPersonnelId)}
                    className="w-full bg-gray-800 text-white text-sm p-2 rounded-lg border border-gray-600 outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Status Banner if saved */}
              {editSaveStatus === 'saved' && (
                <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-300 font-semibold animate-fade-in-up">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Saved to database permanently!
                  </span>
                  <span className="text-[11px] text-emerald-400/80">Synced live with local SQLite database</span>
                </div>
              )}

              {/* Packages Section */}
              <div className="bg-gray-750/70 p-4 rounded-xl border border-gray-700">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-3 border-b border-gray-700 pb-2 flex items-center justify-between">
                  <span>Packages</span>
                  <span className="text-xs text-teal-400 font-normal">{packagesList.length} Options</span>
                </h4>
                <div className="space-y-3">
                  {packagesList.map(pkg => (
                    <div key={pkg.id || pkg.name} className="flex justify-between items-center bg-gray-800/80 p-2.5 rounded-lg border border-gray-700/60">
                      <div>
                        <span className="text-sm text-gray-200 font-medium block">{pkg.name}</span>
                        <span className="text-xs text-emerald-400 font-mono">{currency} {pkg.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPackageChange(pkg.name, String(Math.max(0, (editPackages[pkg.name] || 0) - 1)))}
                          className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-650 text-white font-bold flex items-center justify-center text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={editPackages[pkg.name] || ''}
                          onChange={(e) => handleEditPackageChange(pkg.name, e.target.value)}
                          placeholder="0"
                          className="w-16 bg-gray-900 text-white text-center font-mono font-bold p-1.5 rounded-lg border border-gray-600 outline-none focus:border-teal-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditPackageChange(pkg.name, String((editPackages[pkg.name] || 0) + 1))}
                          className="w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center text-sm shadow"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Sales Section */}
              <div className="bg-gray-750/70 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-200">Other Sales & Custom Passes</h4>
                  <button
                    type="button"
                    onClick={handleEditOtherAdd}
                    className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {editOtherSales.map((item, idx) => (
                    <div key={idx} className="bg-gray-800/90 p-3 rounded-xl border border-gray-700/80 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={packagesList.some(p => p.name === item.category) ? item.category : '__CUSTOM_NEW_SALE__'}
                          onChange={(e) => handleEditOtherCategoryChange(idx, e.target.value)}
                          className="flex-1 bg-gray-900 text-white text-xs p-2 rounded-lg border border-gray-600 outline-none focus:border-teal-500 font-medium cursor-pointer"
                        >
                          <option value="" disabled>-- Select Package or New Sale --</option>
                          <optgroup label="🎟️ Packages Only">
                            {packagesList.map(pkg => (
                              <option key={pkg.id || pkg.name} value={pkg.name}>
                                {pkg.name} ({currency} {pkg.price.toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="✨ Custom / New Sale">
                            <option value="__CUSTOM_NEW_SALE__">+ New Sale (Write Name & Amount)</option>
                          </optgroup>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleEditOtherRemove(idx)}
                          className="text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/10 text-sm cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Custom New Sale Name Input */}
                      {(!packagesList.some(p => p.name === item.category) || item.category === '__CUSTOM_NEW_SALE__') && (
                        <div className="bg-amber-950/30 border border-amber-500/40 p-2 rounded-lg">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                            ✍️ Sale Name (Sums into Total Daily Revenue)
                          </label>
                          <input
                            type="text"
                            placeholder="Write sale name (e.g. VIP Add-on, Special Pass)..."
                            value={item.customName !== undefined ? item.customName : (!packagesList.some(p => p.name === item.category) && item.category !== '__CUSTOM_NEW_SALE__' ? item.category : '')}
                            onChange={(e) => handleEditOtherCustomNameChange(idx, e.target.value)}
                            className="w-full bg-gray-900 text-white p-1.5 rounded-lg border border-gray-600 focus:border-amber-400 outline-none text-xs font-medium"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Discount Option</label>
                          <input
                            type="text"
                            placeholder="e.g. 10%"
                            value={item.discount || ''}
                            onChange={(e) => handleEditOtherDiscountChange(idx, e.target.value)}
                            className="w-full bg-gray-900 text-white p-1.5 rounded border border-gray-600 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-emerald-400 text-[10px] uppercase font-bold mb-1">Amount ({currency})</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.amount !== undefined ? item.amount : ''}
                            onChange={(e) => handleEditOtherAmountChange(idx, e.target.value)}
                            className="w-full bg-gray-900 text-emerald-400 font-mono font-bold p-1.5 rounded border border-gray-600 outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editOtherSales.length === 0 && (
                    <p className="text-gray-500 text-xs text-center italic py-2">No other sales items added.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-700 bg-gray-850 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Amount:</span>
                <p className="text-2xl font-bold text-emerald-400 font-mono">
                  {currency} {calculateEditTotal().toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditRecord}
                  disabled={editSaveStatus === 'saving'}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editSaveStatus === 'saving' ? 'Saving...' : 'Save to Database Permanently'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BackupManager = ({ 
  onClose, 
  onExport, 
  onImport, 
  onResetDay, 
  appLogo, 
  onLogoChange, 
  maintenancePersonnel, 
  onAddMaintenancePersonnel, 
  onDeleteMaintenancePersonnel, 
  onClearMaintenanceTickets 
}: any) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(appLogo || '');
  const [dateToReset, setDateToReset] = useState(new Date().toISOString().split('T')[0]);
  const [techName, setTechName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onImport(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <ModalWrapper title="System Configuration & Backup" onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h3 className="text-base font-bold text-white mb-2">App Logo</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-grow bg-gray-700 text-white rounded p-2 text-sm border border-gray-600 outline-none focus:border-blue-500"
              placeholder="Logo URL (https://...)"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <button onClick={() => onLogoChange(logoUrl)} className="bg-blue-600 text-white px-4 rounded text-sm hover:bg-blue-700 transition-colors">Save</button>
          </div>
        </section>

        <hr className="border-gray-700" />

        <section className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600 text-center">
            <h4 className="font-bold text-white mb-2 text-sm">Export Data</h4>
            <button onClick={onExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm w-full font-semibold transition-colors">Download JSON</button>
          </div>
          <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600 text-center">
            <h4 className="font-bold text-white mb-2 text-sm">Import Data</h4>
            <button onClick={() => fileInputRef.current?.click()} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm w-full font-semibold transition-colors">Upload JSON</button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
          </div>
        </section>
        
        <section className="bg-red-900/15 p-4 rounded-xl border border-red-900/40 space-y-2">
          <h3 className="text-base font-bold text-red-400">Daily Reset</h3>
          <p className="text-gray-400 text-xs">Permanently clear operational counts for a specific date.</p>
          <div className="flex gap-2">
            <input type="date" value={dateToReset} onChange={(e) => setDateToReset(e.target.value)} className="bg-gray-700 text-white p-2 rounded text-sm border border-gray-600 outline-none focus:border-red-500" />
            <button onClick={() => onResetDay(dateToReset)} className="bg-red-600 hover:bg-red-700 text-white px-4 rounded font-bold text-sm transition-colors">Reset</button>
          </div>
        </section>
      </div>
    </ModalWrapper>
  );
};

export const OperatorManager = ({ operators, onClose, onAddOperator, onDeleteOperators }: any) => {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <ModalWrapper title="Manage Games & Ride Associates" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Associate Name" 
            className="flex-grow bg-gray-700 text-white p-2 rounded border border-gray-600 outline-none focus:border-green-500"
          />
          <button 
            onClick={() => { if(name) { onAddOperator(name); setName(''); } }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded font-bold transition-colors"
          >
            Add
          </button>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-2 max-h-60 overflow-y-auto border border-gray-700 custom-scrollbar">
          {operators.map((op: Operator) => (
            <div key={op.id} className="flex items-center p-3 hover:bg-gray-700/50 rounded cursor-pointer border-b border-gray-800 last:border-0 transition-colors" onClick={() => toggleSelect(op.id)}>
              <input type="checkbox" checked={selectedIds.includes(op.id)} readOnly className="mr-3 w-4 h-4 rounded text-blue-600 bg-gray-700 border-gray-600" />
              <span className="text-gray-200">{op.name}</span>
            </div>
          ))}
        </div>

        {selectedIds.length > 0 && (
          <button 
            onClick={() => { onDeleteOperators(selectedIds); setSelectedIds([]); }}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold transition-colors"
          >
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>
    </ModalWrapper>
  );
};

export const EditImageModal = ({ ride, onClose, onSave }: any) => {
  const [imagePreview, setImagePreview] = useState<string>(ride.imageUrl || '');
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState<string>(ride.imageUrl?.startsWith('http') ? ride.imageUrl : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    setIsProcessing(true);
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
          setImagePreview(compressed);
        } else {
          setImagePreview(dataUrl);
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setImagePreview(dataUrl);
        setIsProcessing(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSave = () => {
    const finalImage = inputMode === 'url' ? urlInput.trim() : imagePreview.trim();
    onSave(ride.id, finalImage);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ModalWrapper title={`Edit Image: ${ride.name}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Toggle Mode */}
        <div className="flex items-center justify-between bg-gray-900/60 p-1 rounded-xl border border-gray-700">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload from Device
          </button>
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'url' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Web Link / URL
          </button>
        </div>

        {inputMode === 'upload' ? (
          <div>
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[130px] ${
                isDragging 
                  ? 'border-blue-500 bg-blue-950/30' 
                  : 'border-gray-600 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-900/80'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-white">Click to browse or drag picture here</p>
              <p className="text-xs text-gray-400 mt-0.5">Supports PNG, JPG, JPEG, WEBP</p>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Image Web Address (URL)</label>
            <input 
              type="text" 
              value={urlInput} 
              onChange={(e) => {
                setUrlInput(e.target.value);
                setImagePreview(e.target.value);
              }} 
              placeholder="https://images.unsplash.com/..." 
              className="w-full bg-gray-900 text-white p-2.5 rounded-lg border border-gray-600 outline-none focus:border-blue-500 text-sm"
            />
          </div>
        )}

        {/* Live Preview Display */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-400">Current / Selected Image</span>
            {imagePreview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Photo
              </button>
            )}
          </div>
          <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center overflow-hidden border border-gray-700 relative group shadow-inner">
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Ride Preview" 
                className="w-full h-full object-cover"
                onError={() => {}}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 p-4">
                <ImageIcon className="w-10 h-10 mb-1 opacity-40" />
                <span className="text-xs">No picture selected (will display default placeholder)</span>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-semibold gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Processing image...
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium transition-colors cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            disabled={isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-blue-950/40 cursor-pointer text-sm flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Ride Image
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export const HistoryLog = ({ history, onClearHistory }: any) => (
  <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl animate-fade-in-up">
    <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-800 to-gray-750">
      <h2 className="text-2xl font-bold text-white">System History Log</h2>
      <button onClick={onClearHistory} className="bg-red-900/30 text-red-300 hover:bg-red-900/50 px-4 py-2 rounded border border-red-800/50 transition-colors text-sm">Clear Logs</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-400">
        <thead className="bg-gray-700 text-gray-200 uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Time</th>
            <th className="px-6 py-4">User</th>
            <th className="px-6 py-4">Action</th>
            <th className="px-6 py-4">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {history.map((h: any) => (
            <tr key={h.id} className="hover:bg-gray-750 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">{new Date(h.timestamp).toLocaleString()}</td>
              <td className="px-6 py-4 font-semibold text-blue-400">{h.user}</td>
              <td className="px-6 py-4">
                <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs border border-gray-600 whitespace-nowrap">{h.action}</span>
              </td>
              <td className="px-6 py-4 text-gray-300">{h.details}</td>
            </tr>
          ))}
          {history.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center italic">No history available.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

// --- Customer Experience (CX) Portal & Feedback View ---
const CX_FEEDBACK_CATEGORIES = [
  'Guest Comfort & Seating',
  'Ride Smoothness & Noise',
  'Safety Harness & Restraints',
  'Audio, Video & Light FX',
  'Air Conditioning & Ventilation',
  'Cleanliness & Sanitation',
  'Queue Line & Signage',
  'Mechanical / Operational Issue',
  'General Guest Feedback'
];

interface CXFeedbackViewProps {
  rides: Ride[];
  currentUser: Operator | null;
  role: string;
  selectedDate: string;
  onDateChange?: (date: string) => void;
  maintenanceTickets: Record<string, Record<string, MaintenanceTicket>> | Record<string, any>;
  onReportProblem: (
    rideId: number, 
    problem: string, 
    feedbackCategory?: string, 
    priority?: 'normal' | 'high' | 'urgent', 
    guestDetails?: string, 
    source?: string,
    dateOverride?: string,
    targetDepartment?: string
  ) => void;
  onUpdateTicketStatus?: (
    ticket: MaintenanceTicket, 
    newStatus: 'in-progress' | 'solved' | 'reported', 
    technician?: any, 
    helpers?: any[], 
    notes?: string,
    solutionImageUrl?: string,
    isExplicitReopen?: boolean
  ) => void;
  floors?: string[];
  onNavigate?: (view: string) => void;
  onBroadcastSync?: () => void;
  isBroadcastingSync?: boolean;
  onShowModal?: (modal: any) => void;
}

export const CustomerExperienceView: React.FC<CXFeedbackViewProps> = ({
  rides,
  currentUser,
  role,
  selectedDate,
  maintenanceTickets,
  onReportProblem,
  onUpdateTicketStatus,
  floors = ['All Floors', 'L1', 'L2', 'L3', 'Outdoor'],
  onNavigate,
  onBroadcastSync,
  isBroadcastingSync,
  onShowModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('All Floors');
  
  // Feedback modal state
  const [feedbackRideId, setFeedbackRideId] = useState<number | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState(CX_FEEDBACK_CATEGORIES[0]);
  const [feedbackPriority, setFeedbackPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [feedbackTargetDept, setFeedbackTargetDept] = useState<'both' | 'operation-officer' | 'sales-officer'>('both');
  const [problemDescription, setProblemDescription] = useState('');
  const [guestDetails, setGuestDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccessRide, setSubmittedSuccessRide] = useState<number | null>(null);
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);
  const [showMobileShare, setShowMobileShare] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Status filtering & Download modal states
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'reported' | 'in-progress' | 'solved'>('all');
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadStartDate, setDownloadStartDate] = useState(selectedDate);
  const [downloadEndDate, setDownloadEndDate] = useState(selectedDate);
  const [downloadDeptFilter, setDownloadDeptFilter] = useState<'all' | 'operation-officer' | 'sales-officer'>('all');

  const handleSyncMobileAndDesktop = async () => {
    if (onBroadcastSync) {
      onBroadcastSync();
      return;
    }
    setIsLocalSyncing(true);
    setSyncFeedback(null);
    try {
      await database.syncViewEverywhere(selectedDate, 'cx-feedback', { portalType: 'cx' });
      await database.engine.fetchFullDatabase();
      setSyncFeedback('Mobile & Desktop Synced!');
    } catch (e) {
      console.warn('Sync failed:', e);
      setSyncFeedback('Synced locally');
    } finally {
      setTimeout(() => {
        setIsLocalSyncing(false);
        setTimeout(() => setSyncFeedback(null), 2500);
      }, 700);
    }
  };

  // Flatten tickets for today
  const todaysTickets: MaintenanceTicket[] = useMemo(() => {
    if (!maintenanceTickets || !maintenanceTickets[selectedDate]) return [];
    return (Object.values(maintenanceTickets[selectedDate]) as MaintenanceTicket[])
      .sort((a, b) => new Date(b.reportedAt || 0).getTime() - new Date(a.reportedAt || 0).getTime());
  }, [maintenanceTickets, selectedDate]);

  // All tickets flattened across all dates for history tracking
  const allTicketsFlat: MaintenanceTicket[] = useMemo(() => {
    if (!maintenanceTickets) return [];
    const flat: MaintenanceTicket[] = [];
    Object.entries(maintenanceTickets).forEach(([dateStr, byId]) => {
      if (byId && typeof byId === 'object') {
        Object.values(byId).forEach((ticket: any) => {
          if (ticket && typeof ticket === 'object') {
            flat.push({ ...ticket, date: ticket.date || dateStr });
          }
        });
      }
    });
    return flat.sort((a, b) => new Date(b.reportedAt || 0).getTime() - new Date(a.reportedAt || 0).getTime());
  }, [maintenanceTickets]);

  // CX specific tickets - strictly sent by Customer Experience role (exclude all other issues)
  const cxTickets = useMemo(() => {
    return allTicketsFlat.filter(t => {
      if (!t) return false;
      if (t.source === 'whatsapp') return false;
      if (t.source === 'operator') {
        const r = (t.reportedByRole || '').toLowerCase();
        if (!r.includes('cx') && !r.includes('customer experience')) return false;
      }
      if (t.source === 'cx') return true;
      const role = (t.reportedByRole || '').toLowerCase();
      const name = (t.reportedByName || '').toLowerCase();
      return role.includes('cx') || role.includes('customer experience') || name.includes('customer experience') || name.includes('(cx)');
    });
  }, [allTicketsFlat]);

  // Filtered rides
  const filteredRides = useMemo(() => {
    return rides.filter(ride => {
      const matchesSearch = !searchQuery || 
        ride.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.floor?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFloor = selectedFloor === 'All Floors' || ride.floor === selectedFloor;

      return matchesSearch && matchesFloor;
    });
  }, [rides, searchQuery, selectedFloor]);

  // Stats calculation (strictly for Customer Experience feedback)
  const totalRidesCount = rides.length;
  const cxTicketsTodayCount = cxTickets.filter(t => t.date === selectedDate).length;
  const cxResolvedCount = cxTickets.filter(t => t.status === 'solved').length;
  const cxPendingCount = cxTickets.filter(t => t.status === 'reported' || !t.status).length;
  const cxInProgressCount = cxTickets.filter(t => t.status === 'in-progress').length;

  const displayedCxTickets = useMemo(() => {
    return cxTickets.filter(t => {
      if (feedbackStatusFilter === 'all') return true;
      if (feedbackStatusFilter === 'reported') return t.status === 'reported' || !t.status;
      if (feedbackStatusFilter === 'in-progress') return t.status === 'in-progress';
      if (feedbackStatusFilter === 'solved') return t.status === 'solved';
      return true;
    });
  }, [cxTickets, feedbackStatusFilter]);

  const handleOpenFeedbackModal = (rideId?: number) => {
    setFeedbackRideId(rideId || (rides.length > 0 ? rides[0].id : null));
    setFeedbackCategory(CX_FEEDBACK_CATEGORIES[0]);
    setFeedbackPriority('normal');
    setFeedbackTargetDept('both');
    setProblemDescription('');
    setGuestDetails('');
  };

  const handleCloseFeedbackModal = () => {
    setFeedbackRideId(null);
    setProblemDescription('');
    setGuestDetails('');
    setFeedbackTargetDept('both');
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRideId || !problemDescription.trim()) return;

    setIsSubmitting(true);
    try {
      onReportProblem(
        feedbackRideId,
        problemDescription.trim(),
        feedbackCategory,
        feedbackPriority,
        guestDetails.trim(),
        'cx',
        undefined,
        feedbackTargetDept
      );
      // Immediately sync with mobile and all connected devices
      try {
        await database.syncViewEverywhere(selectedDate, 'cx-feedback', { portalType: 'cx' });
        await database.engine.fetchFullDatabase();
      } catch (_) {}

      setSubmittedSuccessRide(feedbackRideId);
      setTimeout(() => setSubmittedSuccessRide(null), 3000);
      handleCloseFeedbackModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export solved customer feedbacks by date range to CSV
  const handleDownloadSolvedCSV = () => {
    const start = downloadStartDate <= downloadEndDate ? downloadStartDate : downloadEndDate;
    const end = downloadStartDate <= downloadEndDate ? downloadEndDate : downloadStartDate;

    const solvedTickets = cxTickets.filter(t => {
      if (t.status !== 'solved') return false;
      const tDate = t.date || (t.reportedAt ? t.reportedAt.slice(0, 10) : '');
      if (tDate < start || tDate > end) return false;
      if (downloadDeptFilter !== 'all') {
        const dept = t.targetDepartment || 'both';
        if (dept !== 'both' && dept !== downloadDeptFilter) return false;
      }
      return true;
    });

    const headers = [
      'Date',
      'Reported Time',
      'Attraction / Game',
      'Floor',
      'Category',
      'Priority',
      'Customer Feedback / Problem',
      'Guest Details / Location',
      'Dispatched By',
      'Dispatched To Department',
      'Status',
      'Solved Date & Time',
      'Solved By (Officer/Executive)',
      'Resolution Action Taken'
    ];

    const rows = solvedTickets.map(t => {
      const repTime = t.reportedAt ? new Date(t.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const solvedTime = t.solvedAt ? new Date(t.solvedAt).toLocaleString() : 'Solved';
      const targetDeptStr = t.targetDepartment === 'operation-officer'
        ? 'Operation Officer'
        : t.targetDepartment === 'sales-officer'
        ? 'Sales Executive'
        : 'Operation Officer & Sales Executive';
      const solverStr = t.assignedToName || (t.solvedByRole ? `Solved by ${t.solvedByRole}` : 'Operations/Sales Team');

      return [
        t.date || '',
        `"${repTime}"`,
        `"${(t.rideName || '').replace(/"/g, '""')}"`,
        `"${(rides.find(r => r.id === t.rideId)?.floor || 'N/A').replace(/"/g, '""')}"`,
        `"${(t.feedbackCategory || 'General').replace(/"/g, '""')}"`,
        t.priority || 'normal',
        `"${(t.problem || '').replace(/"/g, '""')}"`,
        `"${(t.guestDetails || 'N/A').replace(/"/g, '""')}"`,
        `"${(t.reportedByName || 'CX Specialist').replace(/"/g, '""')}"`,
        `"${targetDeptStr}"`,
        'Solved',
        `"${solvedTime}"`,
        `"${solverStr.replace(/"/g, '""')}"`,
        `"${(t.resolutionNotes || 'Feedback investigated and resolved').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CX_Solved_Feedback_Report_${start}_to_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadModalOpen(false);
  };

  const selectedRideObj = rides.find(r => r.id === feedbackRideId);

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-purple-950/70 to-gray-900 border border-rose-900/50 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-500/50 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/50 flex-shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Customer Experience (CX)
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-700/60">
                  Guest Feedback Portal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl">
                Logged in as <strong className="text-white">{currentUser?.name || 'CX Team Member'}</strong>. Record guest feedback, comments, and customer satisfaction insights for any attraction.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Live Sync Status indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 rounded-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-xs">Mobile Sync Active</span>
            </div>

            {/* Sync Mobile & Desktop Button */}
            <button
              type="button"
              onClick={handleSyncMobileAndDesktop}
              disabled={isBroadcastingSync || isLocalSyncing}
              className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold px-3 py-2.5 rounded-xl shadow-md border border-emerald-500/50 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Sync CX feedback, operational date, and active view with mobile devices"
            >
              <Radio className={`w-4 h-4 text-emerald-300 ${isBroadcastingSync || isLocalSyncing ? 'animate-ping' : ''}`} />
              <span>{syncFeedback || (isBroadcastingSync || isLocalSyncing ? 'Syncing...' : 'Sync Mobile & Desktop')}</span>
            </button>

            {/* Mobile QR Scanner Link */}
            <button
              type="button"
              onClick={() => {
                if (onShowModal) onShowModal('share');
                else setShowMobileShare(true);
              }}
              className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 hover:text-blue-100 border border-blue-700/60 text-xs sm:text-sm font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open QR Code to scan and connect directly from mobile phone"
            >
              <QrCode className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Mobile QR</span>
            </button>

            {/* Download Solved Feedback by Date Range */}
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="bg-emerald-900/50 hover:bg-emerald-800/80 text-emerald-200 hover:text-white border border-emerald-600/70 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Download solved customer feedback report filtered by date range"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Solved Feedback</span>
            </button>

            {/* Log Feedback Button */}
            <button
              type="button"
              onClick={() => handleOpenFeedbackModal()}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-900/40 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Customer Feedback</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-rose-900/40">
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800">
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">All Park Rides</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-1.5">
              <span>{totalRidesCount}</span>
              <span className="text-[11px] font-normal text-gray-500">Total Attractions</span>
            </div>
          </div>

          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800">
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Total Guest Feedbacks</span>
            <div className="text-xl sm:text-2xl font-black text-pink-400 mt-0.5">
              {cxTickets.length} <span className="text-xs font-normal text-gray-400">records</span>
            </div>
          </div>

          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800">
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Feedbacks Today</span>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5">
              {cxTicketsTodayCount} <span className="text-xs font-normal text-gray-400">logged</span>
            </div>
          </div>

          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800">
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Solved Feedbacks</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>{cxResolvedCount}</span>
              <span className="text-[11px] font-normal text-emerald-500/80">Returned Solved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-md">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all rides & attractions by name or floor..."
            className="w-full bg-gray-900 text-white rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-gray-700 outline-none focus:border-rose-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Floor Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {['All Floors', ...new Set(rides.map(r => r.floor).filter(Boolean))].map((fl) => (
            <button
              key={fl}
              type="button"
              onClick={() => setSelectedFloor(fl)}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedFloor === fl
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 font-bold'
                  : 'bg-gray-900/80 hover:bg-gray-700 text-gray-300 border border-gray-700'
              }`}
            >
              {fl}
            </button>
          ))}
        </div>
      </div>

      {/* Rides Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredRides.map(ride => {
          const isJustSubmitted = submittedSuccessRide === ride.id;

          return (
            <div 
              key={ride.id} 
              className={`bg-gray-800 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-xl ${
                isJustSubmitted
                  ? 'border-rose-500 shadow-rose-950/50 ring-2 ring-rose-500/50'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Card Header & Image */}
              <div>
                <div className="relative aspect-video w-full bg-gray-900 overflow-hidden group">
                  {ride.imageUrl ? (
                    <img 
                      src={ride.imageUrl} 
                      alt={ride.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-900">
                      <Sparkles className="w-8 h-8 opacity-30 text-rose-400 mb-1" />
                      <span className="text-[11px] font-medium text-gray-500">{ride.name}</span>
                    </div>
                  )}

                  {/* Floor Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 shadow">
                      {ride.floor}
                    </span>
                  </div>
                </div>

                {/* Ride Info Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-white truncate" title={ride.name}>
                      {ride.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                      {ride.capacity && <span>Capacity: {ride.capacity}</span>}
                      {ride.capacity && ride.minHeight && <span>•</span>}
                      {ride.minHeight && <span>Min Height: {ride.minHeight}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={() => handleOpenFeedbackModal(ride.id)}
                  className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Log Customer Feedback</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRides.length === 0 && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/80 p-12 text-center text-gray-400 space-y-3">
          <HeartHandshake className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-base font-semibold text-gray-300">No rides match your filter criteria</p>
          <p className="text-xs text-gray-500">Try clearing your search query or switching floor tabs.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedFloor('All Floors');
            }}
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer mt-2"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Customer Experience (CX) Feedbacks Feed Section */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden mt-8">
        <div className="p-5 border-b border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-750">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Customer Experience (CX) Guest Feedback Records
              </h2>
              <p className="text-xs text-gray-400">
                Dispatched to Operation Officer & Sales Executive • Solved feedbacks return here with resolution actions
              </p>
            </div>
          </div>
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-900/90 p-1 rounded-xl border border-gray-750 flex-wrap">
            <button
              type="button"
              onClick={() => setFeedbackStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                feedbackStatusFilter === 'all'
                  ? 'bg-gray-750 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All ({cxTickets.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedbackStatusFilter('reported')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                feedbackStatusFilter === 'reported'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              Pending ({cxPendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFeedbackStatusFilter('in-progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                feedbackStatusFilter === 'in-progress'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-400/80 hover:text-blue-300'
              }`}
            >
              In Progress ({cxInProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setFeedbackStatusFilter('solved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                feedbackStatusFilter === 'solved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400/90 hover:text-emerald-300'
              }`}
            >
              Solved ({cxResolvedCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-gray-300">
            <thead className="bg-gray-900/90 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-700">
              <tr>
                <th className="px-5 py-3.5">Attraction & Date</th>
                <th className="px-5 py-3.5">Category & Feedback Details</th>
                <th className="px-5 py-3.5">Sent To Department</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Status & Resolution</th>
                <th className="px-5 py-3.5">Reported By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {displayedCxTickets.slice(0, 50).map((ticket) => {
                const targetDept = ticket.targetDepartment || 'both';
                const isSolved = ticket.status === 'solved';
                const isInProgress = ticket.status === 'in-progress';

                return (
                  <tr key={ticket.id} className="hover:bg-gray-750/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-white text-sm">{ticket.rideName}</div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span>{ticket.date} • {ticket.reportedAt ? new Date(ticket.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {ticket.feedbackCategory && (
                        <span className="inline-block bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md mb-1">
                          {ticket.feedbackCategory}
                        </span>
                      )}
                      <p className="text-gray-200 text-xs sm:text-sm leading-relaxed max-w-md font-medium">
                        {ticket.problem}
                      </p>
                      {ticket.guestDetails && (
                        <p className="text-[11px] text-gray-400 italic mt-1 bg-gray-900/60 p-1.5 rounded border border-gray-750">
                          Guest note: "{ticket.guestDetails}"
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {targetDept === 'both' ? (
                        <span className="inline-flex items-center gap-1 bg-purple-950/70 text-purple-300 border border-purple-800/70 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          <Users className="w-3 h-3 text-purple-400" />
                          <span>Ops Officer & Sales Exec</span>
                        </span>
                      ) : targetDept === 'operation-officer' ? (
                        <span className="inline-flex items-center gap-1 bg-blue-950/70 text-blue-300 border border-blue-800/70 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span>Operation Officer</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-indigo-950/70 text-indigo-300 border border-indigo-800/70 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          <Tag className="w-3 h-3 text-indigo-400" />
                          <span>Sales Executive</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {ticket.priority === 'urgent' ? (
                        <span className="bg-red-950 text-red-300 border border-red-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          Urgent
                        </span>
                      ) : ticket.priority === 'high' ? (
                        <span className="bg-amber-950 text-amber-300 border border-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          High
                        </span>
                      ) : (
                        <span className="bg-gray-700 text-gray-300 text-[11px] px-2.5 py-1 rounded-lg">
                          Normal
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 min-w-[220px]">
                      {isSolved ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-700/80 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Solved</span>
                          </span>
                          <div className="text-[11px] text-gray-300 font-semibold">
                            {ticket.assignedToName || (ticket.solvedByRole ? `Solved by ${ticket.solvedByRole}` : 'Officer / Executive')}
                          </div>
                          {ticket.solvedAt && (
                            <div className="text-[10px] text-gray-500 font-mono">
                              {new Date(ticket.solvedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                          {ticket.resolutionNotes && (
                            <div className="text-[11px] text-emerald-200 bg-emerald-950/50 p-2 rounded-lg border border-emerald-800/60 mt-1 leading-relaxed">
                              <strong>Action Taken:</strong> {ticket.resolutionNotes}
                            </div>
                          )}
                        </div>
                      ) : isInProgress ? (
                        <div>
                          <span className="inline-flex items-center gap-1 bg-blue-950 text-blue-300 border border-blue-700/80 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                            <span>In Progress</span>
                          </span>
                          {ticket.assignedToName && (
                            <div className="text-[11px] text-gray-400 mt-1">
                              Assigned: <strong className="text-gray-200">{ticket.assignedToName}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="inline-block bg-amber-950 text-amber-300 border border-amber-700/80 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                            Pending Officer Review
                          </span>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Awaiting action from assigned department
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <div className="font-semibold text-rose-300">{ticket.reportedByName || 'Customer Experience'}</div>
                      <div className="text-[11px] text-gray-500">CX Specialist</div>
                    </td>
                  </tr>
                );
              })}

              {displayedCxTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-400" />
                    {feedbackStatusFilter === 'all' 
                      ? 'No Customer Experience (CX) feedbacks recorded yet. Use the "Log Customer Feedback" button above to submit.'
                      : `No customer feedbacks found with status "${feedbackStatusFilter}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- POPUP MODAL: SUBMIT CUSTOMER FEEDBACK --- */}
      {feedbackRideId !== null && (
        <ModalWrapper 
          title={`Log Customer Feedback for ${selectedRideObj?.name || 'Attraction'}`} 
          onClose={handleCloseFeedbackModal}
        >
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            {/* Selected Ride Dropdown (Allows changing ride in modal) */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Amusement Attraction / Ride
              </label>
              <select
                value={feedbackRideId}
                onChange={(e) => setFeedbackRideId(Number(e.target.value))}
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-rose-500"
              >
                {rides.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.floor})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Department: Operation Officer / Sales Executive / Both */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Send Feedback To Department <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'both', label: 'Both (Ops & Sales)', icon: Users, desc: 'Operation Officer & Sales Exec' },
                  { id: 'operation-officer', label: 'Operation Officer', icon: Activity, desc: 'Rides, Queue & Operators' },
                  { id: 'sales-officer', label: 'Sales Executive', icon: Tag, desc: 'Ticketing, Packages & Counters' },
                ].map(dept => {
                  const Icon = dept.icon;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setFeedbackTargetDept(dept.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        feedbackTargetDept === dept.id
                          ? 'bg-rose-600/90 border-rose-400 text-white shadow-md shadow-rose-950/40 font-bold'
                          : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-750 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <Icon className="w-3.5 h-3.5 text-rose-300" />
                        <span>{dept.label}</span>
                      </div>
                      <div className="text-[10px] text-gray-300/80 mt-0.5">{dept.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Feedback Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {CX_FEEDBACK_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedbackCategory(cat)}
                    className={`text-xs p-2 rounded-xl border text-left transition-all ${
                      feedbackCategory === cat
                        ? 'bg-rose-600 text-white border-rose-400 font-bold shadow-md shadow-rose-950/40'
                        : 'bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Urgency / Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal', color: 'bg-gray-700 text-gray-200 border-gray-600' },
                  { id: 'high', label: 'High Priority', color: 'bg-amber-600 text-white border-amber-400' },
                  { id: 'urgent', label: 'Urgent / Immediate', color: 'bg-red-600 text-white border-red-400' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFeedbackPriority(p.id as any)}
                    className={`text-xs py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      feedbackPriority === p.id 
                        ? p.color + ' shadow-md' 
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback / Issue Description */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Customer Feedback / Issue Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the issue reported by the guest or observed (e.g., Guest reported jerky deceleration on stop 2, or sound speaker crackling)..."
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-rose-500"
              />
            </div>

            {/* Optional Guest Notes */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Guest Information / Specific Location (Optional)
              </label>
              <input
                type="text"
                value={guestDetails}
                onChange={(e) => setGuestDetails(e.target.value)}
                placeholder="e.g., Seat #5, Guest family with 2 children, or Queue entrance area"
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-rose-500"
              />
            </div>

            {/* Submitter Info */}
            <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-700 text-xs text-gray-400 flex items-center justify-between">
              <span>Dispatched By: <strong className="text-rose-300">{currentUser?.name || 'Customer Experience (CX)'}</strong></span>
              <span className="text-[11px] text-gray-500">
                Routes to: <strong className="text-gray-300">{feedbackTargetDept === 'both' ? 'Operation & Sales' : feedbackTargetDept === 'operation-officer' ? 'Operation Officer' : 'Sales Executive'}</strong>
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseFeedbackModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !problemDescription.trim()}
                className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? 'Sending...' 
                    : feedbackTargetDept === 'both' 
                    ? 'Send to Ops & Sales' 
                    : feedbackTargetDept === 'operation-officer' 
                    ? 'Send to Operation Officer' 
                    : 'Send to Sales Executive'}
                </span>
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* --- POPUP MODAL: DOWNLOAD SOLVED FEEDBACK BY DATE RANGE --- */}
      {downloadModalOpen && (
        <ModalWrapper 
          title="Download Solved Customer Feedback Report" 
          onClose={() => setDownloadModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-300 leading-relaxed">
              Export all customer feedback tickets that have been investigated and marked <strong className="text-emerald-400">Solved</strong> by Operation Officers and Sales Executives across your chosen date range.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-900/80 p-3.5 rounded-xl border border-gray-700">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={downloadStartDate}
                  onChange={(e) => setDownloadStartDate(e.target.value)}
                  className="w-full bg-gray-800 text-white text-xs sm:text-sm p-2.5 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={downloadEndDate}
                  onChange={(e) => setDownloadEndDate(e.target.value)}
                  className="w-full bg-gray-800 text-white text-xs sm:text-sm p-2.5 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Filter by Department
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Departments' },
                  { id: 'operation-officer', label: 'Operation Officer' },
                  { id: 'sales-officer', label: 'Sales Executive' },
                ].map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setDownloadDeptFilter(dept.id as any)}
                    className={`text-xs py-2 px-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      downloadDeptFilter === dept.id
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-750 hover:text-gray-200'
                    }`}
                  >
                    {dept.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Solved Matches Summary */}
            {(() => {
              const start = downloadStartDate <= downloadEndDate ? downloadStartDate : downloadEndDate;
              const end = downloadStartDate <= downloadEndDate ? downloadEndDate : downloadStartDate;
              const matchingCount = cxTickets.filter(t => {
                if (t.status !== 'solved') return false;
                const tDate = t.date || (t.reportedAt ? t.reportedAt.slice(0, 10) : '');
                if (tDate < start || tDate > end) return false;
                if (downloadDeptFilter !== 'all') {
                  const dept = t.targetDepartment || 'both';
                  if (dept !== 'both' && dept !== downloadDeptFilter) return false;
                }
                return true;
              }).length;

              return (
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Matching Solved Records in Range:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300 text-sm bg-emerald-900/80 px-2.5 py-0.5 rounded-lg border border-emerald-700">
                    {matchingCount} tickets
                  </span>
                </div>
              );
            })()}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDownloadModalOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadSolvedCSV}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Solved CSV</span>
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Mobile QR Link & Pairing Modal */}
      {showMobileShare && (
        <ShareModal onClose={() => setShowMobileShare(false)} />
      )}
    </div>
  );
};

// --- Operation Officer Ride View ---
export interface OperationOfficerRideViewProps {
  rides: Ride[];
  dailyCounts: Record<string, Record<string | number, number>>;
  dailyPackageCounts?: Record<string, Record<string | number, number>>;
  dailyTicketCounts?: Record<string, Record<string | number, number>>;
  selectedDate: string;
  today: string;
  onCountChange: (rideId: number, count: number) => void;
  onIncrementCount: (rideId: number, delta: number) => void;
  onPackageCountChange?: (rideId: number, count: number) => void;
  onIncrementPackageCount?: (rideId: number, delta: number) => void;
  onTicketCountChange?: (rideId: number, count: number) => void;
  onIncrementTicketCount?: (rideId: number, delta: number) => void;
  role: string;
  onChangePicture?: (ride: Ride) => void;
  floors?: string[];
  maintenanceTickets?: Record<string, Record<string, MaintenanceTicket>> | Record<string, any>;
  currentUser?: any;
  onUpdateTicketStatus?: (
    ticket: MaintenanceTicket, 
    newStatus: 'in-progress' | 'solved' | 'reported', 
    technician?: any, 
    helpers?: any[], 
    notes?: string,
    solutionImageUrl?: string,
    isExplicitReopen?: boolean
  ) => void;
}

export const OperationOfficerRideView: React.FC<OperationOfficerRideViewProps> = ({
  rides,
  dailyCounts,
  dailyPackageCounts = {},
  dailyTicketCounts = {},
  selectedDate,
  today,
  onCountChange,
  onIncrementCount,
  onPackageCountChange,
  onIncrementPackageCount,
  onTicketCountChange,
  onIncrementTicketCount,
  role,
  onChangePicture,
  floors = [],
  maintenanceTickets = {},
  currentUser,
  onUpdateTicketStatus
}) => {
  const [activeOpsTab, setActiveOpsTab] = useState<'rides' | 'cx-feedback'>('rides');
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(selectedDate);
  const [exportEndDate, setExportEndDate] = useState(selectedDate);

  // CX Feedback Management State
  const [cxFilter, setCxFilter] = useState<'all' | 'reported' | 'in-progress' | 'solved'>('all');
  const [solvingTicket, setSolvingTicket] = useState<MaintenanceTicket | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [isSolving, setIsSolving] = useState(false);

  // Extract all CX feedback tickets routed to Operation Officer (or both)
  const opsCxTickets = useMemo(() => {
    if (!maintenanceTickets) return [];
    const flat: MaintenanceTicket[] = [];
    Object.entries(maintenanceTickets).forEach(([dKey, byId]) => {
      if (byId && typeof byId === 'object') {
        Object.values(byId).forEach((ticket: any) => {
          if (ticket && typeof ticket === 'object') {
            const isCX = ticket.source === 'cx' || 
              (ticket.reportedByRole || '').toLowerCase().includes('cx') ||
              (ticket.reportedByRole || '').toLowerCase().includes('customer experience') ||
              (ticket.reportedByName || '').toLowerCase().includes('customer experience');
            if (isCX) {
              const target = ticket.targetDepartment || 'both';
              if (target === 'both' || target === 'operation-officer') {
                flat.push({ ...ticket, date: ticket.date || dKey });
              }
            }
          }
        });
      }
    });
    return flat.sort((a, b) => new Date(b.reportedAt || 0).getTime() - new Date(a.reportedAt || 0).getTime());
  }, [maintenanceTickets]);

  const displayedOpsCxTickets = useMemo(() => {
    if (cxFilter === 'all') return opsCxTickets;
    return opsCxTickets.filter(t => t.status === cxFilter);
  }, [opsCxTickets, cxFilter]);

  const pendingOpsCxCount = opsCxTickets.filter(t => t.status !== 'solved').length;
  const inProgressOpsCxCount = opsCxTickets.filter(t => t.status === 'in-progress').length;
  const solvedOpsCxCount = opsCxTickets.filter(t => t.status === 'solved').length;

  const handleMarkInProgress = (ticket: MaintenanceTicket) => {
    if (!onUpdateTicketStatus) return;
    onUpdateTicketStatus(
      ticket,
      'in-progress',
      { id: currentUser?.id || 901, name: currentUser?.name || 'Operation Officer', role: 'Operation Officer' },
      [],
      'Operation Officer initiated investigation & action'
    );
  };

  const handleConfirmSolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solvingTicket || !onUpdateTicketStatus) return;
    setIsSolving(true);
    try {
      onUpdateTicketStatus(
        solvingTicket,
        'solved',
        { id: currentUser?.id || 901, name: currentUser?.name || 'Operation Officer', role: 'Operation Officer' },
        [],
        resolutionRemarks.trim() || 'Attraction inspected and customer feedback resolved by Operation Officer'
      );
      setSolvingTicket(null);
      setResolutionRemarks('');
    } finally {
      setIsSolving(false);
    }
  };

  // Active day's data dictionaries
  const currentPackageCounts = dailyPackageCounts[selectedDate] || {};
  const currentTicketCounts = dailyTicketCounts[selectedDate] || {};
  const currentCounts = dailyCounts[selectedDate] || {};

  // Filter rides based on particular game, search text, and floor
  const filteredRides = useMemo(() => {
    return rides.filter((ride) => {
      if (selectedGameId !== 'all' && String(ride.id) !== selectedGameId) return false;
      if (selectedFloor !== 'all' && ride.floor !== selectedFloor) return false;
      if (searchTerm.trim() && !ride.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
      return true;
    });
  }, [rides, selectedGameId, selectedFloor, searchTerm]);

  // Aggregate totals for the filtered set on the selected date
  const { totalFilteredPackage, totalFilteredTicket, totalFilteredOverall } = useMemo(() => {
    let pkgSum = 0;
    let tktSum = 0;
    let overallSum = 0;

    filteredRides.forEach((ride) => {
      const p = Number(currentPackageCounts[ride.id] ?? currentPackageCounts[String(ride.id)] ?? 0);
      const t = Number(currentTicketCounts[ride.id] ?? currentTicketCounts[String(ride.id)] ?? 0);
      const c = currentCounts[ride.id] ?? currentCounts[String(ride.id)];
      const tot = c !== undefined ? Number(c) : (p + t);

      pkgSum += p;
      tktSum += t;
      overallSum += tot;
    });

    return {
      totalFilteredPackage: pkgSum,
      totalFilteredTicket: tktSum,
      totalFilteredOverall: overallSum
    };
  }, [filteredRides, currentPackageCounts, currentTicketCounts, currentCounts]);

  // Download Date-Range CSV
  const handleDownloadDateRangeCSV = () => {
    const start = exportStartDate <= exportEndDate ? exportStartDate : exportEndDate;
    const end = exportStartDate <= exportEndDate ? exportEndDate : exportStartDate;

    const dateList: string[] = [];
    const cur = new Date(start);
    const stop = new Date(end);
    while (cur <= stop) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const targetRides = selectedGameId !== 'all'
      ? rides.filter(r => String(r.id) === selectedGameId)
      : (selectedFloor !== 'all' ? rides.filter(r => r.floor === selectedFloor) : rides);

    const headers = [
      'Date',
      'Game / Ride ID',
      'Game / Ride Name',
      'Floor',
      'Guest Count (Package)',
      'Guest Count (Ticket)',
      'Total Guest Count (Sum)'
    ];

    const rows: (string | number)[][] = [];

    // Grand accumulators across date range
    let grandRangePkg = 0;
    let grandRangeTkt = 0;
    let grandRangeTot = 0;

    const gameTotalsMap: Record<number | string, { id: number; name: string; floor: string; pkg: number; tkt: number; total: number }> = {};
    targetRides.forEach(r => {
      gameTotalsMap[r.id] = { id: r.id, name: r.name, floor: r.floor || 'N/A', pkg: 0, tkt: 0, total: 0 };
    });

    dateList.forEach((d) => {
      const pCounts = dailyPackageCounts[d] || {};
      const tCounts = dailyTicketCounts[d] || {};
      const cCounts = dailyCounts[d] || {};

      let dayPkg = 0;
      let dayTkt = 0;
      let dayTot = 0;

      targetRides.forEach((r) => {
        const p = Number(pCounts[r.id] ?? pCounts[String(r.id)] ?? 0);
        const t = Number(tCounts[r.id] ?? tCounts[String(r.id)] ?? 0);
        const c = cCounts[r.id] ?? cCounts[String(r.id)];
        const tot = (p + t) > 0 ? (p + t) : (c !== undefined ? Number(c) : 0);

        dayPkg += p;
        dayTkt += t;
        dayTot += tot;

        if (gameTotalsMap[r.id]) {
          gameTotalsMap[r.id].pkg += p;
          gameTotalsMap[r.id].tkt += t;
          gameTotalsMap[r.id].total += tot;
        }

        rows.push([
          d,
          r.id,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.floor || 'N/A'}"`,
          p,
          t,
          tot
        ]);
      });

      grandRangePkg += dayPkg;
      grandRangeTkt += dayTkt;
      grandRangeTot += dayTot;

      // Add day subtotal if multiple rides are exported
      if (targetRides.length > 1) {
        rows.push([
          `${d} Subtotal`,
          '--',
          `"ALL SELECTED GAMES (${targetRides.length})"`,
          '--',
          dayPkg,
          dayTkt,
          dayTot
        ]);
      }
    });

    // Grand Totals across all dates
    rows.push([
      `TOTAL RANGE SUMMARY (${start} to ${end})`,
      '--',
      `"ALL SELECTED GAMES (${targetRides.length})"`,
      '--',
      grandRangePkg,
      grandRangeTkt,
      grandRangeTot
    ]);

    // Dedicated Game-wise Breakdown section
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['"=== GAME-WISE TOTAL GUEST COUNT BREAKDOWN ==="', '', '', '', '', '', '']);
    rows.push(['Game / Ride ID', 'Game / Ride Name', 'Floor', 'Total Package Count', 'Total Ticket Count', 'Total Guest Count', '']);
    targetRides.forEach(r => {
      const stats = gameTotalsMap[r.id];
      if (stats) {
        rows.push([
          stats.id,
          `"${stats.name.replace(/"/g, '""')}"`,
          `"${stats.floor}"`,
          stats.pkg,
          stats.tkt,
          stats.total,
          ''
        ]);
      }
    });

    rows.push([
      'ALL',
      '"ALL GAMES COMBINED"',
      '--',
      grandRangePkg,
      grandRangeTkt,
      grandRangeTot,
      ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const gameSuffix = selectedGameId !== 'all' ? `_${targetRides[0]?.name.replace(/[^a-zA-Z0-9]/g, '_')}` : '_All_Games';
    link.setAttribute('download', `Guest_Count_Report${gameSuffix}_${start}_to_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const selectedGameObj = rides.find(r => String(r.id) === selectedGameId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveOpsTab('rides')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeOpsTab === 'rides'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>🎮 Games & Rides Guest Count</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveOpsTab('cx-feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeOpsTab === 'cx-feedback'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Customer Feedback (from CX)</span>
          {pendingOpsCxCount > 0 ? (
            <span className="ml-1 bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              {pendingOpsCxCount} Pending
            </span>
          ) : (
            <span className="ml-1 bg-gray-700 text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {opsCxTickets.length}
            </span>
          )}
        </button>
      </div>

      {activeOpsTab === 'rides' && (
        <>
          {/* Top Header & Filter Bar */}
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-900/50 text-indigo-400 rounded-xl border border-indigo-700/50">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Rides & Games Management</span>
                  <span className="text-xs font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                    {selectedDate === today ? 'Today' : selectedDate}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-time Guest Count (Package & Ticket) monitoring, date range downloads, and single game inspection.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Date Range Download Button */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Guest Count (Date Range)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-750">
          {/* 1. Particular Game Search & Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>Particular Game Count Filter</span>
            </label>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-xl p-2.5 text-xs sm:text-sm border border-gray-700 outline-none focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">🎮 All Games & Rides ({rides.length})</option>
              {rides.map(r => (
                <option key={r.id} value={String(r.id)}>
                  {r.name} — Floor {r.floor}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Text Search */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search By Name</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type ride or game name..."
                className="w-full bg-gray-900 text-white rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm border border-gray-700 outline-none focus:border-indigo-500"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 3. Floor Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Floor Level</span>
            </label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-xl p-2.5 text-xs sm:text-sm border border-gray-700 outline-none focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">🏢 All Floors</option>
              {floors.map(fl => (
                <option key={fl} value={fl}>{fl}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Game Quick Banner if specific game filtered */}
        {selectedGameObj && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span className="text-xs text-indigo-200">
                Currently focusing on: <strong className="text-white text-sm">{selectedGameObj.name}</strong> ({selectedGameObj.floor})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGameId('all')}
              className="text-xs text-indigo-300 hover:text-white underline font-semibold cursor-pointer"
            >
              Reset to All Games
            </button>
          </div>
        )}

        {/* Total Guests (Today's Sum) - Consolidated & Itemized Metrics */}
        <div className="pt-2">
          <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-purple-950/80 border border-purple-500/40 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                    Operation Guest Attendance ({selectedDate})
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  Formula: Total Package ({totalFilteredPackage.toLocaleString()}) + Total Ticket ({totalFilteredTicket.toLocaleString()}) = Total Guests
                </p>
              </div>
            </div>

            {/* 3 Metric Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-gray-900/80 px-3.5 py-1.5 rounded-xl border border-blue-500/40 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-blue-300">
                  {totalFilteredPackage.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold uppercase text-blue-400">Package</span>
              </div>
              <div className="text-gray-500 font-bold">+</div>
              <div className="bg-gray-900/80 px-3.5 py-1.5 rounded-xl border border-teal-500/40 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-teal-300">
                  {totalFilteredTicket.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold uppercase text-teal-400">Ticket</span>
              </div>
              <div className="text-purple-400 font-bold">=</div>
              <div className="bg-gray-900/90 px-4 py-2 rounded-xl border-2 border-purple-500/60 flex items-baseline gap-2 shadow-lg">
                <span className="text-2xl sm:text-3xl font-black font-mono text-purple-200">
                  {totalFilteredOverall.toLocaleString()}
                </span>
                <span className="text-[10px] font-black uppercase text-purple-300">Total Guests</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rides Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredRides.map((ride) => {
          let pkgVal = Number(currentPackageCounts[ride.id] ?? currentPackageCounts[String(ride.id)] ?? 0);
          let tktVal = Number(currentTicketCounts[ride.id] ?? currentTicketCounts[String(ride.id)] ?? 0);
          const rawTotal = currentCounts[ride.id] ?? currentCounts[String(ride.id)];
          const rawNum = rawTotal !== undefined ? Number(rawTotal) : 0;
          if (pkgVal === 0 && tktVal === 0 && rawNum > 0) {
            pkgVal = rawNum;
          }
          const totalVal = pkgVal + tktVal;

          return (
            <div
              key={ride.id}
              className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-lg hover:border-indigo-500/50 transition-all flex flex-col justify-between"
            >
              {/* Image & Header */}
              <div>
                <div className="relative h-44 bg-gray-900 group overflow-hidden">
                  <img
                    src={ride.imageUrl}
                    alt={ride.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="bg-black/75 backdrop-blur-sm text-indigo-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                      {ride.floor}
                    </span>
                  </div>
                  {role === 'admin' && onChangePicture && (
                    <button
                      type="button"
                      onClick={() => onChangePicture(ride)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-indigo-600 text-white p-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Change image"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent p-3 pt-8">
                    <h3 className="font-bold text-white text-base leading-tight drop-shadow">{ride.name}</h3>
                  </div>
                </div>

                {/* Counts Section: Package + Ticket = Total Guests */}
                <div className="p-4 space-y-3">
                  {/* 1. Guest Count (Package) */}
                  <div className="bg-blue-950/20 border border-blue-500/30 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-blue-400" />
                        <span>Guest Count (Package)</span>
                      </label>
                      <span className="text-xs font-mono text-blue-200 font-black px-1.5 py-0.2 rounded bg-blue-900/60 border border-blue-700/50">
                        {pkgVal}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, pkgVal - 5);
                          if (onPackageCountChange) onPackageCountChange(ride.id, next);
                          onCountChange(ride.id, next + tktVal);
                        }}
                        className="px-2 py-1 bg-gray-900 hover:bg-gray-700 text-gray-300 rounded text-xs font-mono font-bold cursor-pointer"
                        title="Minus 5"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, pkgVal - 1);
                          if (onPackageCountChange) onPackageCountChange(ride.id, next);
                          onCountChange(ride.id, next + tktVal);
                        }}
                        className="px-2 py-1 bg-gray-900 hover:bg-gray-700 text-gray-300 rounded text-xs font-mono font-bold cursor-pointer"
                        title="Minus 1"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={pkgVal}
                        onChange={(e) => {
                          const next = Math.max(0, parseInt(e.target.value) || 0);
                          if (onPackageCountChange) onPackageCountChange(ride.id, next);
                          onCountChange(ride.id, next + tktVal);
                        }}
                        className="flex-1 bg-gray-900 text-blue-200 text-center font-mono font-black text-sm py-1 rounded border border-blue-500/40 outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = pkgVal + 1;
                          if (onPackageCountChange) onPackageCountChange(ride.id, next);
                          onCountChange(ride.id, next + tktVal);
                        }}
                        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-mono font-bold cursor-pointer"
                        title="Plus 1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = pkgVal + 5;
                          if (onPackageCountChange) onPackageCountChange(ride.id, next);
                          onCountChange(ride.id, next + tktVal);
                        }}
                        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-mono font-bold cursor-pointer"
                        title="Plus 5"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* 2. Guest Count (Ticket) */}
                  <div className="bg-teal-950/20 border border-teal-500/30 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-teal-400" />
                        <span>Guest Count (Ticket)</span>
                      </label>
                      <span className="text-xs font-mono text-teal-200 font-black px-1.5 py-0.2 rounded bg-teal-900/60 border border-teal-700/50">
                        {tktVal}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, tktVal - 5);
                          if (onTicketCountChange) onTicketCountChange(ride.id, next);
                          onCountChange(ride.id, pkgVal + next);
                        }}
                        className="px-2 py-1 bg-gray-900 hover:bg-gray-700 text-gray-300 rounded text-xs font-mono font-bold cursor-pointer"
                        title="Minus 5"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, tktVal - 1);
                          if (onTicketCountChange) onTicketCountChange(ride.id, next);
                          onCountChange(ride.id, pkgVal + next);
                        }}
                        className="px-2 py-1 bg-gray-900 hover:bg-gray-700 text-gray-300 rounded text-xs font-mono font-bold cursor-pointer"
                        title="Minus 1"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={tktVal}
                        onChange={(e) => {
                          const next = Math.max(0, parseInt(e.target.value) || 0);
                          if (onTicketCountChange) onTicketCountChange(ride.id, next);
                          onCountChange(ride.id, pkgVal + next);
                        }}
                        className="flex-1 bg-gray-900 text-teal-200 text-center font-mono font-black text-sm py-1 rounded border border-teal-500/40 outline-none focus:border-teal-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = tktVal + 1;
                          if (onTicketCountChange) onTicketCountChange(ride.id, next);
                          onCountChange(ride.id, pkgVal + next);
                        }}
                        className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded text-xs font-mono font-bold cursor-pointer"
                        title="Plus 1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = tktVal + 5;
                          if (onTicketCountChange) onTicketCountChange(ride.id, next);
                          onCountChange(ride.id, pkgVal + next);
                        }}
                        className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded text-xs font-mono font-bold cursor-pointer"
                        title="Plus 5"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* 3. Total Guests (Today's Sum) = Package + Ticket */}
                  <div className="bg-purple-950/30 border border-purple-500/50 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                          <Users className="w-3 h-3 text-purple-400" />
                          <span>Total Guests (Today's Sum)</span>
                        </span>
                        <span className="text-[10px] text-purple-300/70 font-mono block">
                          Package ({pkgVal}) + Ticket ({tktVal})
                        </span>
                      </div>
                      <span className="text-base font-mono text-purple-200 font-black px-2.5 py-0.5 rounded bg-purple-900/80 border border-purple-600/60 shadow">
                        {totalVal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRides.length === 0 && (
        <div className="bg-gray-800 p-12 rounded-2xl border border-gray-700 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No games or rides match the filter</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing the game selection, or choosing "All Floors".
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedGameId('all');
              setSelectedFloor('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}
      </>
      )}

      {/* TAB 2: CUSTOMER FEEDBACK (CX) ROUTED TO OPERATION OFFICER */}
      {activeOpsTab === 'cx-feedback' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Routed to Operation</p>
                <p className="text-2xl font-black text-white font-mono mt-1">{opsCxTickets.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-900/40 text-purple-400 border border-purple-750 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pending Action</p>
                <p className="text-2xl font-black text-amber-300 font-mono mt-1">{pendingOpsCxCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-900/40 text-amber-400 border border-amber-750 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-black text-blue-300 font-mono mt-1">{inProgressOpsCxCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-900/40 text-blue-400 border border-blue-750 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Solved & Returned</p>
                <p className="text-2xl font-black text-emerald-300 font-mono mt-1">{solvedOpsCxCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-900/40 text-emerald-400 border border-emerald-750 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Feedback Feed Table */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-750">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-rose-400" />
                  <span>Customer Experience Feedbacks Assigned to Operation</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Action guest concerns, ride issues, and queue inquiries • Solved tickets immediately return to CX portal
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-900 p-1 rounded-xl border border-gray-750">
                {(['all', 'reported', 'in-progress', 'solved'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCxFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      cxFilter === f
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {f === 'all' ? `All (${opsCxTickets.length})` : f === 'reported' ? `Pending (${pendingOpsCxCount})` : f === 'in-progress' ? `In Progress (${inProgressOpsCxCount})` : `Solved (${solvedOpsCxCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-gray-300">
                <thead className="bg-gray-900 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5">Attraction & Time</th>
                    <th className="px-5 py-3.5">Category & Issue Details</th>
                    <th className="px-5 py-3.5">Priority</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Operation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {displayedOpsCxTickets.map(ticket => {
                    const isSolved = ticket.status === 'solved';
                    const isInProg = ticket.status === 'in-progress';

                    return (
                      <tr key={ticket.id} className="hover:bg-gray-750/50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-white text-sm">{ticket.rideName}</div>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span>{ticket.date} • {ticket.reportedAt ? new Date(ticket.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}</span>
                          </div>
                          <div className="text-[10px] text-rose-300 mt-1">
                            By {ticket.reportedByName || 'Customer Experience'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {ticket.feedbackCategory && (
                            <span className="inline-block bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-md mb-1">
                              {ticket.feedbackCategory}
                            </span>
                          )}
                          <p className="text-gray-200 text-xs sm:text-sm font-medium leading-relaxed max-w-md">
                            {ticket.problem}
                          </p>
                          {ticket.guestDetails && (
                            <p className="text-[11px] text-gray-400 italic mt-1 bg-gray-900/60 p-1.5 rounded border border-gray-750">
                              Guest note: "{ticket.guestDetails}"
                            </p>
                          )}
                          {isSolved && ticket.resolutionNotes && (
                            <div className="text-[11px] text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800/80 mt-2">
                              <strong>Solved Action:</strong> {ticket.resolutionNotes}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {ticket.priority === 'urgent' ? (
                            <span className="bg-red-950 text-red-300 border border-red-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                              Urgent
                            </span>
                          ) : ticket.priority === 'high' ? (
                            <span className="bg-amber-950 text-amber-300 border border-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                              High
                            </span>
                          ) : (
                            <span className="bg-gray-700 text-gray-300 text-[11px] px-2.5 py-1 rounded-lg">
                              Normal
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {isSolved ? (
                            <div>
                              <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-700/80 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Solved</span>
                              </span>
                              <div className="text-[10px] text-gray-500 mt-1">
                                {ticket.solvedAt ? new Date(ticket.solvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          ) : isInProg ? (
                            <span className="inline-flex items-center gap-1 bg-blue-950 text-blue-300 border border-blue-700/80 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                              <span>In Progress</span>
                            </span>
                          ) : (
                            <span className="inline-block bg-amber-950 text-amber-300 border border-amber-700/80 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                              Pending Review
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isSolved && !isInProg && (
                              <button
                                type="button"
                                onClick={() => handleMarkInProgress(ticket)}
                                className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-300 hover:text-white border border-blue-700/70 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Start Action
                              </button>
                            )}
                            {!isSolved ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSolvingTicket(ticket);
                                  setResolutionRemarks('');
                                }}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Solve Feedback</span>
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Completed</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {displayedOpsCxTickets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                        <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-400" />
                        No Customer Experience (CX) feedback records currently found under "{cxFilter}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL: SOLVE FEEDBACK (OPERATION OFFICER) --- */}
      {solvingTicket && (
        <ModalWrapper
          title={`Resolve Feedback for ${solvingTicket.rideName}`}
          onClose={() => setSolvingTicket(null)}
        >
          <form onSubmit={handleConfirmSolve} className="space-y-4">
            <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-700 text-xs text-gray-300 space-y-1">
              <p><strong>Feedback:</strong> {solvingTicket.problem}</p>
              {solvingTicket.feedbackCategory && (
                <p className="text-rose-300">Category: {solvingTicket.feedbackCategory}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Resolution Action Taken by Operation <span className="text-emerald-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={resolutionRemarks}
                onChange={(e) => setResolutionRemarks(e.target.value)}
                placeholder="Explain the corrective action taken (e.g., Checked safety harness & brakes, briefed ride operator, adjusted queue barricades)..."
                className="w-full bg-gray-900 text-white rounded-xl p-3 text-sm border border-gray-700 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Action Presets */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Quick Action Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Inspected ride restraints & cycle; normal operation verified',
                  'Briefed ride operator & corrected queue flow',
                  'Safety check completed with technical associate',
                  'Addressed guest inquiry and resolved on spot'
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setResolutionRemarks(preset)}
                    className="text-[11px] bg-gray-900 hover:bg-gray-750 text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSolvingTicket(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSolving || !resolutionRemarks.trim()}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSolving ? 'Resolving...' : 'Confirm Solved & Return to CX'}</span>
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* Date Range CSV Export Modal */}
      {showExportModal && (
        <ModalWrapper
          title="Download Guest Count (Date Range)"
          onClose={() => setShowExportModal(false)}
        >
          <div className="space-y-4">
            <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-700 text-xs text-gray-300 space-y-1">
              <p className="font-semibold text-emerald-300">
                Exporting: {selectedGameId !== 'all' ? `Particular Game: ${selectedGameObj?.name}` : `All Games & Rides (${rides.length})`}
              </p>
              <p className="text-[11px] text-gray-400">
                Includes Package Count, Ticket Count, and Sum total for each date in the selected range.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full bg-gray-900 text-white p-2.5 rounded-xl border border-gray-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full bg-gray-900 text-white p-2.5 rounded-xl border border-gray-700 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadDateRangeCSV}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV File</span>
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

