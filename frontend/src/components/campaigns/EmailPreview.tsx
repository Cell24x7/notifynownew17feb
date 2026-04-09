import React from 'react';
import { Shield } from 'lucide-react';

interface EmailPreviewProps {
  data: {
    name?: string;
    subject?: string;
    body?: string;
    [key: string]: any;
  };
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({ data }) => {
  const subject = data.subject || 'No Subject';
  const body = data.body || '<p>Your email content will appear here...</p>';

  return (
    <div className="flex flex-col items-center justify-center w-full py-2 sm:py-4 scale-[0.85] sm:scale-95 origin-top">
      {/* Browser/Email Desktop Frame */}
      <div className="w-full max-w-[320px] sm:max-w-[420px] md:max-w-[500px] aspect-[4/5] bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col">
        {/* Header/Subject Bar */}
        <div className="bg-slate-50 border-b border-border px-3 sm:px-6 py-2.5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-base">
              {data.name?.[0]?.toUpperCase() || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[11px] sm:text-sm font-bold text-slate-800 truncate">{subject}</h3>
              <p className="text-[8px] sm:text-[10px] text-slate-500 truncate">From: Your App &lt;noreply@notify.now&gt;</p>
            </div>
            <div className="px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] bg-green-50 text-green-600 border border-green-100 flex items-center gap-0.5 sm:gap-1 uppercase font-bold tracking-tighter shrink-0">
              <Shield className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Verified
            </div>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-2 sm:p-4 md:p-6 no-scrollbar">
          <div 
            className="bg-white rounded-md sm:rounded-lg shadow-sm p-3 sm:p-6 md:p-8 min-h-full prose prose-sm max-w-none email-content-preview text-[11px] sm:text-sm"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
        
        {/* Branding Footer */}
        <div className="bg-slate-50 border-t border-border px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center text-[8px] sm:text-[10px] text-slate-400">
          <span>Powered by NotifyNow</span>
          <div className="flex gap-2 sm:gap-4">
            <span>Unsubscribe</span>
            <span className="hidden sm:inline">Privacy Policy</span>
          </div>
        </div>
      </div>
      
      {/* Device Toggle */}
      <div className="mt-2 sm:mt-4 flex gap-2">
         <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">Desktop Preview</div>
      </div>
    </div>
  );
};
