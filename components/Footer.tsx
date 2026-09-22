import React from 'react';

interface Props {
  title: string;
  count: number;
  packageCount?: number;
  ticketCount?: number;
  formattedValue?: string;
  secondaryInfo?: string;
  showReset: boolean;
  onReset: () => void;
  gradient: string;
}

const Footer: React.FC<Props> = ({ 
  title, 
  count, 
  packageCount, 
  ticketCount, 
  formattedValue, 
  secondaryInfo, 
  showReset, 
  onReset, 
  gradient 
}) => {
  const hasThreeCounts = packageCount !== undefined && ticketCount !== undefined;
  const sumCount = hasThreeCounts ? (packageCount + ticketCount) : count;

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${gradient} text-white p-3 sm:p-4 shadow-2xl z-30 border-t border-white/20 backdrop-blur-md`}>
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
        {hasThreeCounts ? (
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 w-full md:w-auto justify-center md:justify-start">
            {/* 1. Total Guest count (Package) */}
            <div className="bg-black/30 border border-white/20 rounded-xl px-3.5 py-1.5 shadow-sm">
              <p className="text-[10px] uppercase font-bold tracking-wider text-blue-200">
                Total Guest count (Package)
              </p>
              <p className="text-xl sm:text-2xl font-black text-blue-100 font-mono">
                {packageCount.toLocaleString()}
              </p>
            </div>

            <span className="text-xl font-bold text-white/60 hidden sm:inline">+</span>

            {/* 2. Total Guest count (Ticket) */}
            <div className="bg-black/30 border border-white/20 rounded-xl px-3.5 py-1.5 shadow-sm">
              <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">
                Total Guest count (Ticket)
              </p>
              <p className="text-xl sm:text-2xl font-black text-teal-100 font-mono">
                {ticketCount.toLocaleString()}
              </p>
            </div>

            <span className="text-xl font-bold text-white/60 hidden sm:inline">=</span>

            {/* 3. Total Guests Today (Today) */}
            <div className="bg-black/40 border border-white/30 rounded-xl px-4 py-1.5 shadow-md">
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-200">
                {title || 'Total Guests Today (Today)'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {sumCount.toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">{title}</p>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold">{formattedValue || count.toLocaleString()}</p>
              {secondaryInfo && (
                <span className="text-xs opacity-90 font-medium bg-black/25 px-2.5 py-1 rounded-full border border-white/15">
                  {secondaryInfo}
                </span>
              )}
            </div>
          </div>
        )}

        {showReset && (
          <button 
            onClick={onReset}
            className="bg-white/20 hover:bg-white/30 active:scale-95 text-white px-4 py-2 rounded-xl backdrop-blur-sm transition-all text-xs sm:text-sm font-semibold border border-white/20 shadow cursor-pointer whitespace-nowrap"
          >
            Reset Day
          </button>
        )}
      </div>
    </div>
  );
};

export default Footer;