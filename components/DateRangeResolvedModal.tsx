import React, { useState, useMemo } from 'react';
import { MaintenanceTicket, Ride } from '../types';
import { 
  Calendar, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Search, 
  AlertTriangle,
  Sparkles,
  CalendarRange,
  ArrowRightLeft
} from 'lucide-react';
import { getDhakaDateString } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allTickets: MaintenanceTicket[];
  rides: Ride[];
  initialPortalType?: 'rides' | 'cx' | 'all';
  todayStr: string;
}

/**
 * Calculates YYYY-MM-DD offset relative to a base YYYY-MM-DD string
 */
const getDhakaDateOffset = (baseYmd: string, daysAgo: number): string => {
  try {
    const [y, m, d] = (baseYmd || '').split('-').map(Number);
    if (!y || !m || !d) return baseYmd;
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() - daysAgo);
    return date.toISOString().slice(0, 10);
  } catch {
    return baseYmd;
  }
};

/**
 * Robust date extraction in Asia/Dhaka standard time
 */
const extractDhakaDate = (val?: string | number | Date): string => {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  try {
    return getDhakaDateString(val);
  } catch {
    const sub = String(val).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(sub) ? sub : '';
  }
};

/**
 * Extracts both solved and reported dates cleanly
 */
const getTicketDhakaDates = (t: MaintenanceTicket) => {
  let solvedDate = '';
  if (t.solvedAt) {
    solvedDate = extractDhakaDate(t.solvedAt);
  }
  let reportedDate = '';
  if (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
    reportedDate = t.date;
  } else if (t.reportedAt) {
    reportedDate = extractDhakaDate(t.reportedAt);
  }

  if (!solvedDate && reportedDate) solvedDate = reportedDate;
  if (!reportedDate && solvedDate) reportedDate = solvedDate;

  return { solvedDate, reportedDate };
};

export const DateRangeResolvedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  allTickets,
  rides,
  initialPortalType = 'all',
  todayStr
}) => {
  // State
  const [startDate, setStartDate] = useState<string>(() => getDhakaDateOffset(todayStr, 6)); // Default to last 7 days
  const [endDate, setEndDate] = useState<string>(() => todayStr);
  const [dateFilterBasis, setDateFilterBasis] = useState<'solved' | 'reported' | 'either'>('solved');
  const [scope, setScope] = useState<'all' | 'rides' | 'cx'>(initialPortalType);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'high' | 'urgent'>('all');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Identify CX tickets - strictly sent by Customer Experience role
  const isCxTicket = (t: MaintenanceTicket) => {
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
  };

  // Calculate turnaround duration
  const getTurnaroundMinutes = (reportedAt?: string, solvedAt?: string): number | null => {
    if (!reportedAt || !solvedAt) return null;
    const start = new Date(reportedAt).getTime();
    const end = new Date(solvedAt).getTime();
    const diffMs = end - start;
    if (diffMs <= 0 || isNaN(diffMs)) return null;
    return Math.floor(diffMs / (1000 * 60));
  };

  const formatTurnaround = (reportedAt?: string, solvedAt?: string): string => {
    const totalMinutes = getTurnaroundMinutes(reportedAt, solvedAt);
    if (totalMinutes === null) return 'N/A';
    if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
    return `${hours}h ${mins}m`;
  };

  // Filter resolved records with deduplication
  const filteredResolvedTickets = useMemo(() => {
    // 1. Deduplicate by unique ticket ID or key
    const ticketMap = new Map<string, MaintenanceTicket>();
    allTickets.forEach(ticket => {
      if (!ticket || ticket.status !== 'solved') return;
      const id = ticket.id || (ticket as any)._key;
      if (!id) return;
      const existing = ticketMap.get(id);
      // Prefer ticket record with later solvedAt timestamp
      if (!existing || (ticket.solvedAt && !existing.solvedAt)) {
        ticketMap.set(id, ticket);
      }
    });

    const uniqueTickets = Array.from(ticketMap.values());

    return uniqueTickets.filter(ticket => {
      // Must be solved status
      if (ticket.status !== 'solved') return false;

      // Extract accurate dates
      const { solvedDate, reportedDate } = getTicketDhakaDates(ticket);

      let targetDate = solvedDate;
      if (dateFilterBasis === 'reported') targetDate = reportedDate;

      if (dateFilterBasis === 'either') {
        const solvedInRange = (!startDate || (solvedDate && solvedDate >= startDate)) &&
                              (!endDate || (solvedDate && solvedDate <= endDate));
        const reportedInRange = (!startDate || (reportedDate && reportedDate >= startDate)) &&
                                (!endDate || (reportedDate && reportedDate <= endDate));
        if (!solvedInRange && !reportedInRange) return false;
      } else {
        if (startDate && targetDate && targetDate < startDate) return false;
        if (endDate && targetDate && targetDate > endDate) return false;
        if (startDate && !targetDate) return false;
      }

      // Scope filter
      const isCx = isCxTicket(ticket);
      if (scope === 'rides' && isCx) return false;
      if (scope === 'cx' && !isCx) return false;

      // Priority filter
      if (priorityFilter !== 'all' && (ticket.priority || 'normal') !== priorityFilter) return false;

      // Photo filter
      if (onlyWithPhotos && !(ticket.solutionImageUrl || ticket.photoUrl)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const rideObj = rides.find(r => r.id === ticket.rideId);
        const matchText = [
          ticket.rideName,
          rideObj?.floor,
          ticket.problem,
          ticket.feedbackCategory,
          ticket.assignedToName,
          ticket.reportedByName,
          ticket.resolutionNotes,
          ...(ticket.helperNames || [])
        ].filter(Boolean).join(' ').toLowerCase();

        if (!matchText.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeB = new Date(b.solvedAt || b.reportedAt || 0).getTime();
      const timeA = new Date(a.solvedAt || a.reportedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [allTickets, startDate, endDate, dateFilterBasis, scope, priorityFilter, onlyWithPhotos, searchQuery, rides]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredResolvedTickets.length;
    const withPhotos = filteredResolvedTickets.filter(t => Boolean(t.solutionImageUrl || t.photoUrl)).length;
    const urgentCount = filteredResolvedTickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
    
    // Average turnaround
    let validMinsCount = 0;
    let totalMins = 0;
    filteredResolvedTickets.forEach(t => {
      const mins = getTurnaroundMinutes(t.reportedAt, t.solvedAt);
      if (mins !== null) {
        totalMins += mins;
        validMinsCount++;
      }
    });

    let avgTurnaroundStr = 'N/A';
    if (validMinsCount > 0) {
      const avgMins = Math.round(totalMins / validMinsCount);
      if (avgMins < 60) {
        avgTurnaroundStr = `${avgMins} min${avgMins === 1 ? '' : 's'}`;
      } else {
        const hrs = Math.floor(avgMins / 60);
        const rm = avgMins % 60;
        avgTurnaroundStr = rm === 0 ? `${hrs}h` : `${hrs}h ${rm}m`;
      }
    }

    return { total, withPhotos, urgentCount, avgTurnaroundStr };
  }, [filteredResolvedTickets]);

  // Quick preset handler
  const handlePreset = (preset: 'today' | 'yesterday' | '7days' | '14days' | '30days' | 'thisMonth' | 'lastMonth' | 'allTime') => {
    const today = todayStr;
    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday': {
        const y = getDhakaDateOffset(today, 1);
        setStartDate(y);
        setEndDate(y);
        break;
      }
      case '7days':
        setStartDate(getDhakaDateOffset(today, 6));
        setEndDate(today);
        break;
      case '14days':
        setStartDate(getDhakaDateOffset(today, 13));
        setEndDate(today);
        break;
      case '30days':
        setStartDate(getDhakaDateOffset(today, 29));
        setEndDate(today);
        break;
      case 'thisMonth':
        setStartDate(`${today.slice(0, 7)}-01`);
        setEndDate(today);
        break;
      case 'lastMonth': {
        try {
          const [y, m] = today.split('-').map(Number);
          const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
          const lastDayOfPrevMonth = new Date(Date.UTC(y, m - 1, 0));
          setStartDate(prevMonthDate.toISOString().slice(0, 10));
          setEndDate(lastDayOfPrevMonth.toISOString().slice(0, 10));
        } catch {
          setStartDate(getDhakaDateOffset(today, 30));
          setEndDate(today);
        }
        break;
      }
      case 'allTime':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // CSV Export
  const handleDownloadCSV = () => {
    if (filteredResolvedTickets.length === 0) {
      setStatusNotice('No resolved records match the chosen date range to download.');
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    const headers = [
      'Ticket ID',
      'Resolved Date',
      'Reported Date',
      'Source Portal',
      'Ride / Attraction',
      'Floor / Location',
      'Category',
      'Priority',
      'Reported Problem / Description',
      'Guest / Cabin Details',
      'Status',
      'Reported By',
      'Reported Role',
      'Reported Timestamp',
      'Resolved Timestamp',
      'Turnaround Duration',
      'Primary Technician',
      'Helper Technicians',
      'Resolution Notes / Action Taken',
      'Proof Photo Attached'
    ];

    const rows = filteredResolvedTickets.map(t => {
      const isFromCX = isCxTicket(t);
      const helpers = (t.helperNames && Array.isArray(t.helperNames)) ? t.helperNames.join('; ') : '';
      const turnaround = formatTurnaround(t.reportedAt, t.solvedAt);
      const hasPhoto = Boolean(t.solutionImageUrl || t.photoUrl) ? 'YES' : 'NO';
      const { solvedDate, reportedDate } = getTicketDhakaDates(t);

      const rideObj = rides.find(r => r.id === t.rideId);
      const floorStr = rideObj?.floor || (t as any).floor || '';

      return [
        t.id || '',
        solvedDate,
        reportedDate,
        isFromCX ? 'Customer Experience (CX)' : 'Games & Ride Associate',
        t.rideName || '',
        floorStr,
        t.feedbackCategory || (isFromCX ? 'Guest Feedback' : 'Operational Issue'),
        (t.priority || 'normal').toUpperCase(),
        t.problem || '',
        t.guestDetails || '',
        (t.status || 'solved').toUpperCase(),
        t.reportedByName || '',
        t.reportedByRole || (isFromCX ? 'Customer Experience' : 'Associate'),
        t.reportedAt ? new Date(t.reportedAt).toLocaleString('en-GB') : '',
        t.solvedAt ? new Date(t.solvedAt).toLocaleString('en-GB') : '',
        turnaround,
        t.assignedToName || '',
        helpers,
        t.resolutionNotes || '',
        hasPhoto
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const rangeTag = startDate && endDate ? `${startDate}_to_${endDate}` : (startDate ? `from_${startDate}` : (endDate ? `until_${endDate}` : 'All_Time'));
    const scopeTag = scope === 'all' ? 'All_Resolved' : (scope === 'rides' ? 'Maintenance_Resolved' : 'CX_Resolved');
    link.setAttribute('download', `TFW_${scopeTag}_${rangeTag}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusNotice(`Successfully downloaded ${filteredResolvedTickets.length} resolved records as CSV.`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Printable Audit Report
  const handlePrintReport = () => {
    if (filteredResolvedTickets.length === 0) {
      setStatusNotice('No resolved records match the chosen date range to print.');
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    const rangeTitle = startDate && endDate 
      ? `Date Range: ${startDate} to ${endDate}`
      : (startDate ? `From Date: ${startDate}` : (endDate ? `Through Date: ${endDate}` : 'All Historical Solved Records'));

    const scopeTitle = scope === 'all' 
      ? 'All Operations Resolved Issues (Maintenance & CX)'
      : (scope === 'rides' ? 'Games & Rides Maintenance Resolved Records' : 'Customer Experience (CX) Resolved Feedbacks');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>TFW Solved Issues Audit - ${startDate || 'Start'} to ${endDate || 'End'}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #1F2937; margin: 0; padding: 15px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 15px; }
            .brand { font-size: 13px; font-weight: 800; color: #065F46; text-transform: uppercase; letter-spacing: 0.5px; }
            .title { font-size: 18px; font-weight: 900; color: #111827; margin: 4px 0 2px; }
            .subtitle { font-size: 11px; color: #4B5563; font-weight: 600; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
            .stat-card { background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 12px; text-align: center; }
            .stat-num { font-size: 16px; font-weight: 900; color: #111827; }
            .stat-lbl { font-size: 9px; text-transform: uppercase; color: #6B7280; font-weight: bold; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #F3F4F6; color: #374151; font-weight: 800; text-transform: uppercase; padding: 7px 6px; border: 1px solid #E5E7EB; text-align: left; }
            td { padding: 6px; border: 1px solid #E5E7EB; vertical-align: top; }
            tr:nth-child(even) { background-color: #F9FAFB; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-solved { background-color: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
            .badge-urgent { background-color: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
            .badge-high { background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
            .badge-normal { background-color: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE; }
            .badge-cx { background-color: #FCE7F3; color: #9D174D; border: 1px solid #FBCFE8; }
            .badge-maint { background-color: #CCFBF1; color: #115E59; border: 1px solid #99F6E4; }
            .footer { margin-top: 25px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 10px; color: #6B7280; display: flex; justify-content: space-between; }
            .signatures { margin-top: 35px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 10px; }
            .sign-line { border-top: 1px solid #9CA3AF; padding-top: 5px; margin-top: 30px; font-weight: bold; color: #374151; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Toggi Fun World • Operations Audit System</div>
              <h1 class="title">${scopeTitle}</h1>
              <p class="subtitle">${rangeTitle} • Verified Resolved Issues Log</p>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; color: #374151;">Generated: ${new Date().toLocaleString('en-GB')}</div>
              <div style="color: #059669; font-weight: bold; font-size: 11px;">Total Solved: ${stats.total} Records</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-num">${stats.total}</div>
              <div class="stat-lbl">Resolved Issues</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color: #047857;">${stats.withPhotos}</div>
              <div class="stat-lbl">Photo Proof Verified</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color: #D97706;">${stats.urgentCount}</div>
              <div class="stat-lbl">High / Urgent Priority</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color: #2563EB;">${stats.avgTurnaroundStr}</div>
              <div class="stat-lbl">Avg Turnaround</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 65px;">Resolved Date</th>
                <th style="width: 65px;">Reported Date</th>
                <th style="width: 50px;">Portal</th>
                <th style="width: 120px;">Ride / Attraction</th>
                <th style="width: 75px;">Category</th>
                <th style="width: 55px;">Priority</th>
                <th>Reported Issue / Problem</th>
                <th style="width: 120px;">Engineers & Helpers</th>
                <th style="width: 60px;">Turnaround</th>
                <th>Resolution Notes / Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredResolvedTickets.map(t => {
                const isFromCX = isCxTicket(t);
                const rideObj = rides.find(r => r.id === t.rideId);
                const floorStr = rideObj?.floor || (t as any).floor || '';
                const helpers = (t.helperNames && Array.isArray(t.helperNames)) ? t.helperNames.join(', ') : '';
                const techTeam = [t.assignedToName, helpers].filter(Boolean).join(' + ') || 'Unassigned';
                const turnaround = formatTurnaround(t.reportedAt, t.solvedAt);
                const priorityClass = t.priority === 'urgent' ? 'badge-urgent' : (t.priority === 'high' ? 'badge-high' : 'badge-normal');
                const { solvedDate, reportedDate } = getTicketDhakaDates(t);
                
                return `
                  <tr>
                    <td><strong>${solvedDate || '—'}</strong></td>
                    <td>${reportedDate || '—'}</td>
                    <td><span class="badge ${isFromCX ? 'badge-cx' : 'badge-maint'}">${isFromCX ? 'CX' : 'Maint'}</span></td>
                    <td>
                      <strong>${t.rideName || 'General Facility'}</strong>
                      ${floorStr ? `<div style="color: #6B7280; font-size: 9px;">${floorStr}</div>` : ''}
                    </td>
                    <td>${t.feedbackCategory || (isFromCX ? 'Guest Comfort' : 'Operational')}</td>
                    <td><span class="badge ${priorityClass}">${(t.priority || 'normal').toUpperCase()}</span></td>
                    <td>${t.problem || '—'}</td>
                    <td><strong>${techTeam}</strong></td>
                    <td style="font-weight: bold; color: #047857;">${turnaround}</td>
                    <td>${t.resolutionNotes || '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="sign-line">Shift Maintenance Engineer</div>
            </div>
            <div>
              <div class="sign-line">Customer Experience In-Charge</div>
            </div>
            <div>
              <div class="sign-line">AGM / In-Charge (Operations)</div>
            </div>
          </div>

          <div class="footer">
            <span>Toggi Fun World Management Information System</span>
            <span>Confidential Audit Record • Bashundhara City Development Ltd</span>
          </div>
        </body>
      </html>
    `;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error:', e);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }, 400);
        return;
      }
    } catch (e) {
      console.warn('Iframe print failed, falling back to window:', e);
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-850 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-700/80 bg-gradient-to-r from-emerald-950/80 via-gray-900 to-teal-950/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 rounded-xl text-emerald-300 shadow-md">
              <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Download Solved Issues by Date Range
                </h3>
                <span className="bg-emerald-800/80 text-emerald-200 border border-emerald-500/60 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Solved
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Filter and export resolved maintenance tickets &amp; CX issues between custom start and end dates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner if needed */}
        {statusNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-700 text-emerald-200 px-4 py-2 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
          
          {/* Quick Date Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Range Presets:
              </span>
              <span className="text-[11px] text-gray-400">Click to instantly populate date range</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '14days', label: 'Last 14 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' },
                { id: 'allTime', label: 'All Historical Solved' }
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePreset(preset.id as any)}
                  className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-gray-800 hover:bg-emerald-900/60 text-gray-300 hover:text-emerald-200 border border-gray-700 hover:border-emerald-600 transition-all active:scale-95 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers & Filter Basis Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/80">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                From Date:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-750 text-white rounded-lg px-3 py-2 text-xs sm:text-sm border border-gray-650 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                To Date:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-750 text-white rounded-lg px-3 py-2 text-xs sm:text-sm border border-gray-650 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
              />
            </div>

            {/* Filter Basis (Solved Date vs Reported Date vs Either) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Filter Basis:
              </label>
              <select
                value={dateFilterBasis}
                onChange={(e) => setDateFilterBasis(e.target.value as any)}
                className="w-full bg-gray-750 text-white rounded-lg px-3 py-2 text-xs sm:text-sm border border-gray-650 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
              >
                <option value="solved">Resolved Date (When Fixed)</option>
                <option value="reported">Reported Date (When Logged)</option>
                <option value="either">Either (Resolved or Reported)</option>
              </select>
            </div>

            {/* Scope Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Source Portal:
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full bg-gray-750 text-white rounded-lg px-3 py-2 text-xs sm:text-sm border border-gray-650 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
              >
                <option value="all">All Solved (Rides + CX)</option>
                <option value="rides">Rides &amp; Maintenance Only</option>
                <option value="cx">Customer Experience (CX) Only</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Priority:
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="w-full bg-gray-750 text-white rounded-lg px-3 py-2 text-xs sm:text-sm border border-gray-650 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent Only</option>
                <option value="high">High Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </div>
          </div>

          {/* Search and Checkbox Filter Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-800/40 p-2.5 rounded-xl border border-gray-700/60">
            <div className="relative flex-grow max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ride name, problem keyword, technician, floor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-750 text-xs text-white rounded-lg border border-gray-650 focus:border-emerald-500 focus:outline-none placeholder-gray-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={onlyWithPhotos}
                onChange={(e) => setOnlyWithPhotos(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Only records with photo proof</span>
              </span>
            </label>
          </div>

          {/* Live Summary Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-emerald-950/50 border border-emerald-700/60 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Matching Solved Issues
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-200 mt-0.5">
                {stats.total}
              </span>
              <span className="text-[10px] text-emerald-300/80 mt-auto">
                {startDate && endDate ? `${startDate} to ${endDate}` : 'Filtered range'}
              </span>
            </div>

            <div className="bg-teal-950/50 border border-teal-700/60 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Proof Photos Attached
              </span>
              <span className="text-xl sm:text-2xl font-black text-teal-200 mt-0.5">
                {stats.withPhotos}
              </span>
              <span className="text-[10px] text-teal-300/80 mt-auto">
                {stats.total > 0 ? `${Math.round((stats.withPhotos / stats.total) * 100)}% verified` : '0%'}
              </span>
            </div>

            <div className="bg-amber-950/50 border border-amber-700/60 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                High / Urgent Issues
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-200 mt-0.5">
                {stats.urgentCount}
              </span>
              <span className="text-[10px] text-amber-300/80 mt-auto">
                Priority breakdown
              </span>
            </div>

            <div className="bg-blue-950/50 border border-blue-700/60 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Avg Turnaround Time
              </span>
              <span className="text-xl sm:text-2xl font-black text-blue-200 mt-0.5">
                {stats.avgTurnaroundStr}
              </span>
              <span className="text-[10px] text-blue-300/80 mt-auto">
                From report to solved
              </span>
            </div>
          </div>

          {/* Record List Preview Table */}
          <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-gray-700/80 bg-gray-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Resolved Records Preview ({filteredResolvedTickets.length})
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                Sorted newest solved first
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {filteredResolvedTickets.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-300">No solved records found for this date range</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try expanding the date range (e.g. click "All Historical Solved" or "Last 30 Days") to view issues.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900/80 text-gray-400 text-[10px] uppercase font-bold sticky top-0 border-b border-gray-700">
                    <tr>
                      <th className="p-2.5">Resolved Date</th>
                      <th className="p-2.5">Source</th>
                      <th className="p-2.5">Ride / Floor</th>
                      <th className="p-2.5">Issue Description</th>
                      <th className="p-2.5">Engineer / Technician</th>
                      <th className="p-2.5">Turnaround</th>
                      <th className="p-2.5 text-center">Proof Photo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60 text-gray-300">
                    {filteredResolvedTickets.map(ticket => {
                      const isFromCX = isCxTicket(ticket);
                      const rideObj = rides.find(r => r.id === ticket.rideId);
                      const floorStr = rideObj?.floor || (ticket as any).floor || '';
                      const turnaround = formatTurnaround(ticket.reportedAt, ticket.solvedAt);
                      const photoUrl = ticket.solutionImageUrl || ticket.photoUrl;
                      const { solvedDate, reportedDate } = getTicketDhakaDates(ticket);

                      return (
                        <tr key={ticket.id} className="hover:bg-gray-750/70 transition-colors">
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="font-bold text-emerald-400">{solvedDate || '—'}</div>
                            {reportedDate && reportedDate !== solvedDate && (
                              <div className="text-[10px] text-gray-400">Rep: {reportedDate}</div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFromCX ? 'bg-pink-900/60 text-pink-300 border border-pink-700/60' : 'bg-teal-900/60 text-teal-300 border border-teal-700/60'
                            }`}>
                              {isFromCX ? 'CX' : 'Maint'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-gray-100">{ticket.rideName || 'General'}</div>
                            {floorStr && <div className="text-[10px] text-gray-400">{floorStr}</div>}
                          </td>
                          <td className="p-2.5 max-w-xs">
                            <div className="line-clamp-2 text-gray-200">{ticket.problem}</div>
                            {ticket.resolutionNotes && (
                              <div className="text-[10px] text-emerald-400 line-clamp-1 mt-0.5">
                                Fix: {ticket.resolutionNotes}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="font-semibold text-gray-200">
                              {ticket.assignedToName || 'Unassigned'}
                            </div>
                            {ticket.helperNames && ticket.helperNames.length > 0 && (
                              <div className="text-[10px] text-gray-400">
                                + {ticket.helperNames.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-medium text-emerald-300">
                            {turnaround}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {photoUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl(photoUrl)}
                                className="p-1 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-600/80 transition-colors inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                title="View verification proof photo"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Proof</span>
                              </button>
                            ) : (
                              <span className="text-gray-500 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-gray-700/80 bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-400 text-center sm:text-left">
            <span>Ready to export </span>
            <strong className="text-emerald-400 font-black">{filteredResolvedTickets.length}</strong>
            <span> resolved records</span>
            {startDate && endDate && (
              <span> ({startDate} to {endDate})</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Download CSV */}
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={filteredResolvedTickets.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
              <span className="bg-emerald-800/80 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {filteredResolvedTickets.length}
              </span>
            </button>

            {/* Print / Save PDF */}
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={filteredResolvedTickets.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF Report</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs sm:text-sm font-bold border border-gray-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      {/* Lightbox photo preview */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-gray-900 p-2 rounded-2xl border border-gray-700 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={previewPhotoUrl} 
              alt="Resolved fix proof" 
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="mt-3 flex items-center justify-between w-full px-2">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Proof of Resolution
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DateRangeResolvedModal;
