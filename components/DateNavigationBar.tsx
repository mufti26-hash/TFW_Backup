import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, History, Copy, CheckCircle2, AlertCircle, Radio, RefreshCw } from 'lucide-react';
import { getLocalDateString, getDhakaDateString, formatDhakaTime } from '../constants';

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
  today: string;
  latestRecordedDate: string | null;
  hasDataForSelectedDate: boolean;
  hasDataForToday: boolean;
  onCopyAssignmentsFromPrevious?: () => void;
  canCopyAssignments?: boolean;
  role: string;
  onBroadcastSync?: () => void;
  isBroadcastingSync?: boolean;
}

export const DateNavigationBar: React.FC<Props> = ({
  selectedDate,
  onDateChange,
  today,
  latestRecordedDate,
  hasDataForSelectedDate,
  hasDataForToday,
  onCopyAssignmentsFromPrevious,
  canCopyAssignments,
  role,
  onBroadcastSync,
  isBroadcastingSync
}) => {
  const isToday = selectedDate === today;

  // Live ticking clock in Bangladesh Standard Time (BST, UTC+6)
  const [liveDhakaTime, setLiveDhakaTime] = useState(() => formatDhakaTime(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDhakaTime(formatDhakaTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate Yesterday in Dhaka time
  const getYesterdayDate = () => {
    const parts = today.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() - 1);
      return getDhakaDateString(d);
    }
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getDhakaDateString(d);
  };
  const yesterday = getYesterdayDate();
  const isYesterday = selectedDate === yesterday;

  // Step one day back / forward
  const handleShiftDay = (delta: number) => {
    const parts = selectedDate.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + delta);
      onDateChange(getDhakaDateString(d));
    }
  };

  // Format nice human-readable date
  const formatReadableDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-gray-850 border-b border-gray-750/80 shadow-md">
      <div className="container mx-auto px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Left: Active Date & Steppers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-900/90 rounded-xl border border-gray-700/80 p-1 shadow-inner">
            <button
              onClick={() => handleShiftDay(-1)}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 px-2.5 py-0.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="bg-transparent text-white text-xs sm:text-sm font-semibold outline-none cursor-pointer focus:text-indigo-300"
              />
            </div>

            <button
              onClick={() => handleShiftDay(1)}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-750">
            <button
              onClick={() => onDateChange(today)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                isToday 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Today</span>
              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-pulse"></span>}
            </button>

            <button
              onClick={() => onDateChange(yesterday)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isYesterday 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              Yesterday
            </button>

            {latestRecordedDate && latestRecordedDate !== today && latestRecordedDate !== yesterday && (
              <button
                onClick={() => onDateChange(latestRecordedDate)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  selectedDate === latestRecordedDate 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-purple-300 hover:text-purple-200 hover:bg-purple-900/30'
                }`}
                title={`Jump to latest recorded operational data (${latestRecordedDate})`}
              >
                <History className="w-3 h-3" />
                <span>Last Active ({latestRecordedDate.slice(5)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Date Status & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 text-xs">
          {/* Live Bangladesh Standard Time Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-900/90 border border-emerald-800/70 text-emerald-300 font-mono text-xs shadow-inner" title="Live synchronized Bangladesh Standard Time (BST, UTC+6)">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-gray-300">BST:</span>
            <span className="font-bold text-emerald-300">{liveDhakaTime}</span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-900/80 border border-gray-750 text-gray-300">
            {hasDataForSelectedDate ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Data Fixed & Saved ({formatReadableDate(selectedDate)})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No counts yet for {formatReadableDate(selectedDate)}</span>
              </span>
            )}
          </div>

          {/* If today has no data and there is a previous recorded date, offer 1-click jump */}
          {isToday && !hasDataForToday && latestRecordedDate && latestRecordedDate !== today && (
            <button
              onClick={() => onDateChange(latestRecordedDate)}
              className="bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/80 px-2.5 py-1 rounded-xl font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>View Last Data ({latestRecordedDate})</span>
            </button>
          )}

          {/* Copy assignments button for managers when viewing an empty day */}
          {(role === 'admin' || role === 'operation-officer') && canCopyAssignments && onCopyAssignmentsFromPrevious && (
            <button
              onClick={onCopyAssignmentsFromPrevious}
              className="bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/80 px-2.5 py-1 rounded-xl font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy staff roster assignments from the previous active date"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copy Roster from Previous</span>
            </button>
          )}

          {/* Sync View Everywhere Button */}
          {onBroadcastSync && (
            <button
              onClick={onBroadcastSync}
              disabled={isBroadcastingSync}
              className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/80 px-2.5 py-1 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Broadcast current view, operational date, and data to make all other devices identical"
            >
              <Radio className={`w-3.5 h-3.5 text-emerald-400 ${isBroadcastingSync ? 'animate-ping' : ''}`} />
              <span>{isBroadcastingSync ? 'Syncing...' : 'Sync View Everywhere'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
