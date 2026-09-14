import React, { useState, useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  ClipboardPaste, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Ticket, 
  Users, 
  Wrench, 
  Info,
  ChevronRight,
  RefreshCw,
  HeartHandshake
} from 'lucide-react';
import { Ride, Counter, Operator } from '../types';
import { 
  BulkEntityType, 
  ParsedBulkData, 
  parseUploadedFile, 
  parseRawTextTable, 
  downloadExcelTemplate 
} from '../utils/excelImport';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  initialEntity?: BulkEntityType;
  defaultEntity?: BulkEntityType;
  rides?: Ride[];
  existingRides?: Ride[];
  counters?: Counter[];
  existingCounters?: Counter[];
  operators?: Operator[];
  existingOperators?: Operator[];
  salesPersonnel?: Operator[];
  existingSalesPersonnel?: Operator[];
  maintenancePersonnel?: Operator[];
  existingMaintenancePersonnel?: Operator[];
  cxPersonnel?: Operator[];
  existingCxPersonnel?: Operator[];
  floors?: string[];
  existingFloors?: string[];
  onImport?: (data: {
    rides?: Ride[];
    counters?: Counter[];
    operators?: Operator[];
    salesPersonnel?: Operator[];
    maintenancePersonnel?: Operator[];
    cxPersonnel?: Operator[];
    newFloors?: string[];
    importMode: 'merge' | 'replace' | 'append';
  }) => void;
  onCommitImport?: (data: {
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

export const BulkImportModal: React.FC<Props> = ({
  onClose,
  initialEntity,
  defaultEntity = 'all',
  rides,
  existingRides,
  counters,
  existingCounters,
  operators,
  existingOperators,
  salesPersonnel,
  existingSalesPersonnel,
  maintenancePersonnel,
  existingMaintenancePersonnel,
  cxPersonnel,
  existingCxPersonnel,
  floors,
  existingFloors,
  onImport,
  onCommitImport
}) => {
  const [selectedEntity, setSelectedEntity] = useState<BulkEntityType>(initialEntity || defaultEntity || 'all');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedBulkData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace' | 'append'>('merge');
  const [activePreviewTab, setActivePreviewTab] = useState<'rides' | 'counters' | 'operators' | 'sales' | 'technicians' | 'cx'>('rides');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveRides = existingRides || rides || [];
  const effectiveCounters = existingCounters || counters || [];
  const effectiveOperators = existingOperators || operators || [];
  const effectiveSales = existingSalesPersonnel || salesPersonnel || [];
  const effectiveMaintenance = existingMaintenancePersonnel || maintenancePersonnel || [];
  const effectiveCx = existingCxPersonnel || cxPersonnel || [];
  const effectiveFloors = existingFloors || floors || [];

  const existingData = {
    rides: effectiveRides,
    counters: effectiveCounters,
    operators: effectiveOperators,
    salesPersonnel: effectiveSales,
    maintenancePersonnel: effectiveMaintenance,
    cxPersonnel: effectiveCx,
    floors: effectiveFloors
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setSelectedFileName(file.name);
    setIsProcessing(true);
    setUploadError(null);
    try {
      const result = await parseUploadedFile(file, selectedEntity, existingData);
      setParsedResult(result);
      // Auto-set preview tab to first populated entity
      if (result.rides?.length) setActivePreviewTab('rides');
      else if (result.counters?.length) setActivePreviewTab('counters');
      else if (result.operators?.length) setActivePreviewTab('operators');
      else if (result.salesPersonnel?.length) setActivePreviewTab('sales');
      else if (result.maintenancePersonnel?.length) setActivePreviewTab('technicians');
      else if (result.cxPersonnel?.length) setActivePreviewTab('cx');
    } catch (err: any) {
      setUploadError('Error reading file: ' + (err?.message || 'Invalid format'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setUploadError(null);
    try {
      const result = parseRawTextTable(pastedText, selectedEntity, existingData);
      setParsedResult(result);
      if (result.rides?.length) setActivePreviewTab('rides');
      else if (result.counters?.length) setActivePreviewTab('counters');
      else if (result.operators?.length) setActivePreviewTab('operators');
      else if (result.salesPersonnel?.length) setActivePreviewTab('sales');
      else if (result.maintenancePersonnel?.length) setActivePreviewTab('technicians');
      else if (result.cxPersonnel?.length) setActivePreviewTab('cx');
    } catch (err: any) {
      setUploadError('Error parsing pasted data: ' + (err?.message || 'Invalid format'));
    } finally {
      setIsProcessing(false);
    }
  };

  const totalImportCount = parsedResult 
    ? (parsedResult.summary.ridesCount + 
       parsedResult.summary.countersCount + 
       parsedResult.summary.operatorsCount + 
       parsedResult.summary.salesCount + 
       parsedResult.summary.techsCount +
       (parsedResult.summary.cxCount || 0))
    : 0;

  const handleConfirm = () => {
    if (!parsedResult || totalImportCount === 0) return;
    const importPayload = {
      rides: parsedResult.rides,
      counters: parsedResult.counters,
      operators: parsedResult.operators,
      salesPersonnel: parsedResult.salesPersonnel,
      maintenancePersonnel: parsedResult.maintenancePersonnel,
      cxPersonnel: parsedResult.cxPersonnel,
      newFloors: parsedResult.newFloors,
      importMode
    };

    if (onImport) {
      onImport(importPayload);
    } else if (onCommitImport) {
      onCommitImport(importPayload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-gray-850 border border-gray-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-gray-800 via-gray-850 to-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Bulk Excel / CSV Importer
              </h2>
              <p className="text-xs text-gray-400">
                Import Rides, Counters, Games & Ride Associates, Sales Staff, and Technicians via Excel or spreadsheet copy-paste
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/60 rounded-xl transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-grow">
          
          {/* Step 1: Entity Target & Template download */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-gray-900/60 p-4 rounded-xl border border-gray-750">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                1. Select Import Scope
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Master (All-in-One)', icon: <Sparkles className="w-3.5 h-3.5" /> },
                  { id: 'rides', label: 'Rides & Attractions', icon: <Layers className="w-3.5 h-3.5 text-blue-400" /> },
                  { id: 'counters', label: 'Counters', icon: <Ticket className="w-3.5 h-3.5 text-emerald-400" /> },
                  { id: 'operators', label: 'Games & Ride Associates', icon: <Users className="w-3.5 h-3.5 text-purple-400" /> },
                  { id: 'sales', label: 'Sales Staff', icon: <Users className="w-3.5 h-3.5 text-amber-400" /> },
                  { id: 'technicians', label: 'Technicians', icon: <Wrench className="w-3.5 h-3.5 text-red-400" /> },
                  { id: 'cx', label: 'Customer Experience (CX)', icon: <HeartHandshake className="w-3.5 h-3.5 text-rose-400" /> }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedEntity(item.id as BulkEntityType);
                      setParsedResult(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedEntity === item.id 
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Download Box */}
            <div className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-700 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Ready-to-Use Template
                </span>
                <p className="text-[11px] text-gray-400 leading-tight">
                  Download official Excel sheet with pre-configured headers & samples.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadExcelTemplate(selectedEntity)}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .xlsx Template</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload or Paste Choice */}
          <div className="space-y-3">
            {uploadError && (
              <div className="bg-red-950/70 border border-red-700/80 rounded-xl p-3.5 flex items-center justify-between text-red-200 text-xs">
                <span>{uploadError}</span>
                <button 
                  type="button" 
                  onClick={() => setUploadError(null)}
                  className="text-red-400 hover:text-white ml-2 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                2. Input Method
              </label>
              <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-750 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    inputMode === 'upload' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> File Upload (.xlsx, .csv)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    inputMode === 'paste' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" /> Copy & Paste Text
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? 'border-purple-400 bg-purple-950/20' 
                    : 'border-gray-700 hover:border-gray-600 bg-gray-900/40 hover:bg-gray-900/60'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv, .tsv" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-gray-800 rounded-full border border-gray-700 text-purple-400 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedFileName ? `Selected: ${selectedFileName}` : 'Drag & drop Excel or CSV file here'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Supports .xlsx, .xls, .csv files with auto column & sheet detection
                    </p>
                  </div>
                  <span className="inline-block text-[11px] bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">
                    Browse File
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste rows copied directly from Excel or Google Sheets (e.g. Name [Tab] Floor [Tab] Capacity)...`}
                  rows={6}
                  className="w-full bg-gray-900 text-white rounded-xl p-3 text-xs font-mono border border-gray-700 outline-none focus:border-purple-500"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-gray-500">
                    Tip: Copy directly from your spreadsheet including or excluding column headers.
                  </span>
                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    disabled={!pastedText.trim() || isProcessing}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Parse & Preview Table
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Parsed Data Preview & Summary */}
          {parsedResult && (
            <div className="space-y-4 pt-2 border-t border-gray-750 animate-fade-in-up">
              
              {/* Summary Stats Badges */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {totalImportCount} Records Detected
                    </h4>
                    <p className="text-xs text-gray-400">
                      Review parsed items below before applying changes to database
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {parsedResult.summary.ridesCount > 0 && (
                    <span className="text-xs bg-blue-950/80 border border-blue-800 text-blue-300 px-2.5 py-1 rounded-lg font-semibold">
                      {parsedResult.summary.ridesCount} Rides
                    </span>
                  )}
                  {parsedResult.summary.countersCount > 0 && (
                    <span className="text-xs bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-lg font-semibold">
                      {parsedResult.summary.countersCount} Counters
                    </span>
                  )}
                  {parsedResult.summary.operatorsCount > 0 && (
                    <span className="text-xs bg-purple-950/80 border border-purple-800 text-purple-300 px-2.5 py-1 rounded-lg font-semibold">
                      {parsedResult.summary.operatorsCount} Associates
                    </span>
                  )}
                  {parsedResult.summary.salesCount > 0 && (
                    <span className="text-xs bg-amber-950/80 border border-amber-800 text-amber-300 px-2.5 py-1 rounded-lg font-semibold">
                      {parsedResult.summary.salesCount} Sales Staff
                    </span>
                  )}
                  {parsedResult.summary.techsCount > 0 && (
                    <span className="text-xs bg-red-950/80 border border-red-800 text-red-300 px-2.5 py-1 rounded-lg font-semibold">
                      {parsedResult.summary.techsCount} Technicians
                    </span>
                  )}
                </div>
              </div>

              {/* Import Mode Selector */}
              <div className="bg-gray-900/80 p-3.5 rounded-xl border border-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Import Action Strategy:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                      importMode === 'merge' 
                        ? 'bg-purple-600 border-purple-500 text-white' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    Merge & Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                      importMode === 'append' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    Append Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                      importMode === 'replace' 
                        ? 'bg-red-600 border-red-500 text-white' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    Replace Existing
                  </button>
                </div>
              </div>

              {/* Entity Preview Sub-tabs */}
              <div className="flex gap-1.5 border-b border-gray-750 pb-2 overflow-x-auto">
                {parsedResult.summary.ridesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('rides')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activePreviewTab === 'rides' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Rides ({parsedResult.summary.ridesCount})
                  </button>
                )}
                {parsedResult.summary.countersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('counters')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activePreviewTab === 'counters' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Counters ({parsedResult.summary.countersCount})
                  </button>
                )}
                {parsedResult.summary.operatorsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('operators')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activePreviewTab === 'operators' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Associates ({parsedResult.summary.operatorsCount})
                  </button>
                )}
                {parsedResult.summary.salesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('sales')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activePreviewTab === 'sales' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Sales Staff ({parsedResult.summary.salesCount})
                  </button>
                )}
                {parsedResult.summary.techsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('technicians')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activePreviewTab === 'technicians' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Technicians ({parsedResult.summary.techsCount})
                  </button>
                )}
                {(parsedResult.summary.cxCount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('cx')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activePreviewTab === 'cx' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    CX Team ({parsedResult.summary.cxCount})
                  </button>
                )}
              </div>

              {/* Table Preview */}
              <div className="max-h-60 overflow-y-auto border border-gray-750 rounded-xl bg-gray-900 text-xs">
                {activePreviewTab === 'rides' && parsedResult.rides && (
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Ride Name</th>
                        <th className="p-2.5">Floor</th>
                        <th className="p-2.5">Capacity</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-200">
                      {parsedResult.rides.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40">
                          <td className="p-2.5 font-mono text-gray-400">{r.id}</td>
                          <td className="p-2.5 font-semibold text-white">{r.name}</td>
                          <td className="p-2.5">{r.floor}</td>
                          <td className="p-2.5">{r.capacity || '—'}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                            }`}>
                              {r.status || 'active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activePreviewTab === 'counters' && parsedResult.counters && (
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Counter Name</th>
                        <th className="p-2.5">Location</th>
                        <th className="p-2.5">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-200">
                      {parsedResult.counters.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40">
                          <td className="p-2.5 font-mono text-gray-400">{c.id}</td>
                          <td className="p-2.5 font-semibold text-white">{c.name}</td>
                          <td className="p-2.5">{c.location || '—'}</td>
                          <td className="p-2.5">{c.type || 'Standard'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {(activePreviewTab === 'operators' || activePreviewTab === 'sales' || activePreviewTab === 'technicians' || activePreviewTab === 'cx') && (
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Staff Name</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-200">
                      {(activePreviewTab === 'operators' 
                        ? parsedResult.operators 
                        : activePreviewTab === 'sales' 
                        ? parsedResult.salesPersonnel 
                        : activePreviewTab === 'technicians'
                        ? parsedResult.maintenancePersonnel
                        : parsedResult.cxPersonnel)?.map((staff, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40">
                          <td className="p-2.5 font-mono text-gray-400">{staff.id}</td>
                          <td className="p-2.5 font-semibold text-white">{staff.name}</td>
                          <td className="p-2.5">{staff.role || '—'}</td>
                          <td className="p-2.5 font-mono text-gray-400">{staff.phone || '—'}</td>
                          <td className="p-2.5 text-gray-400">{staff.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {parsedResult.newFloors && parsedResult.newFloors.length > 0 && (
                <div className="bg-purple-950/40 border border-purple-800/60 p-3 rounded-xl flex items-center gap-2 text-xs text-purple-300">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>
                    New floors/zones detected and will be automatically registered: <strong>{parsedResult.newFloors.join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-700/80 bg-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {parsedResult ? (
              <span>Ready to import <strong className="text-white">{totalImportCount} items</strong></span>
            ) : (
              <span>Select or drop a file above to begin</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 bg-gray-750 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!parsedResult || totalImportCount === 0 || isProcessing}
              className="w-1/2 sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Apply Import ({totalImportCount})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
