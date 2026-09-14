import React, { useState } from 'react';
import { Copy, ExternalLink, QrCode, Check, Smartphone, Monitor, ShieldCheck, Share2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  appName?: string;
}

export const ShareModal: React.FC<Props> = ({ onClose, appName = 'TFW OPS Manager' }) => {
  const [copied, setCopied] = useState(false);
  // Determine the best direct public app URL for phones and staff
  const getDirectAppUrl = () => {
    if (typeof window === 'undefined') return '';
    const loc = window.location;
    let host = loc.host;
    // Replace private developer dev-container domain (ais-dev-...) with the public shared domain (ais-pre-...)
    // ais-dev-* requires developer Google account login and returns 404/Page Not Found on other devices.
    // ais-pre-* is publicly open to any phone or tablet browser.
    if (host.includes('ais-dev-')) {
      host = host.replace('ais-dev-', 'ais-pre-');
    }
    return `${loc.protocol}//${host}`;
  };

  const currentUrl = getDirectAppUrl();

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&bgcolor=1f2937&color=60a5fa&margin=1`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Live Web Access</h2>
              <p className="text-xs text-gray-400">Open on any phone, tablet, or PC without login errors</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Public Access Notice */}
          <div className="bg-amber-900/25 border border-amber-500/40 p-4 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <div className="text-amber-400 font-bold text-base mt-0.5">⚠️</div>
            <div className="space-y-1.5">
              <span className="font-bold block text-amber-300 text-sm">Seeing "Remix App" or login prompt on another phone?</span>
              <p className="text-amber-200/90 leading-relaxed">
                This happens if you copy the URL from your computer's browser address bar (<code>aistudio.google.com/...</code>). Google AI Studio treats other devices as viewers and prompts them to remix the project.
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                👉 <strong>Solution:</strong> Use the <strong>Direct Standalone App Link</strong> below, or click <strong>Share</strong> in the top-right toolbar of Google AI Studio to share the live application.
              </p>
            </div>
          </div>

          {/* Quick Copy Link Box */}
          <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Direct Application URL (Share with staff)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={currentUrl} 
                className="flex-grow bg-gray-800 text-blue-300 text-sm font-mono p-2.5 rounded-lg border border-gray-700 outline-none select-all"
              />
              <button 
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-md ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* QR Code Section for Instant Phone Scanning */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-gradient-to-br from-gray-900 to-gray-850 p-5 rounded-xl border border-gray-700">
            <div className="p-2 bg-gray-900 rounded-xl border border-gray-700 shadow-inner flex-shrink-0">
              <img 
                src={qrCodeUrl} 
                alt="Scan QR code to open app" 
                className="w-32 h-32 rounded-lg object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800 text-xs font-medium">
                <Smartphone className="w-3.5 h-3.5" /> Direct Mobile Scan
              </div>
              <h3 className="text-base font-bold text-white">Scan with Phone Camera</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Scan this QR code from any operator or technician mobile phone to open the app directly.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a 
              href={currentUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors border border-gray-600"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Window
            </a>
            <div className="bg-emerald-900/20 border border-emerald-800/50 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>Multi-device sync active. All inputs update instantly.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
