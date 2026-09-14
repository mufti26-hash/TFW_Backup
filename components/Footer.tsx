import React from 'react';

interface Props {
  title: string;
  count: number;
  formattedValue?: string;
  secondaryInfo?: string;
  showReset: boolean;
  onReset: () => void;
  gradient: string;
}

const Footer: React.FC<Props> = ({ title, count, formattedValue, secondaryInfo, showReset, onReset, gradient }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 ${gradient} text-white p-4 shadow-lg z-30`}>
      <div className="container mx-auto flex justify-between items-center">
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
        {showReset && (
            <button 
                onClick={onReset}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors text-sm font-semibold"
            >
                Reset Day
            </button>
        )}
      </div>
    </div>
  );
};

export default Footer;