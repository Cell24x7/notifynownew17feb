import React from 'react';
import { Mail, Shield, ChevronLeft, MoreVertical } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center w-full py-4 scale-95 origin-top">
      {/* Browser/Email Desktop Frame */}
      <div className="w-full max-w-[500px] aspect-[4/5] bg-white rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col">
        {/* Header/Subject Bar */}
        <div className="bg-slate-50 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {data.name?.[0]?.toUpperCase() || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate">{subject}</h3>
              <p className="text-[10px] text-slate-500">From: Your App &lt;noreply@notify.now&gt;</p>
            </div>
            <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-100 flex items-center gap-1 uppercase font-bold tracking-tighter">
              <Shield className="w-2.5 h-2.5" /> Verified
            </Badge>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6 no-scrollbar">
          <div 
            className="bg-white rounded-lg shadow-sm p-8 min-h-full prose prose-sm max-w-none email-content-preview"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
        
        {/* Branding Footer */}
        <div className="bg-slate-50 border-t border-border px-6 py-3 flex justify-between items-center text-[10px] text-slate-400">
          <span>Powered by NotifyNow</span>
          <div className="flex gap-4">
            <span>Unsubscribe</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
      
      {/* Device Toggle (Desktop/Mobile) - Placeholder for future */}
      <div className="mt-4 flex gap-2">
         <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Desktop Preview</div>
      </div>
    </div>
  );
};

// Simple Badge component if not using the UI library's version within the preview
const Badge = ({ children, className, variant }: any) => (
    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
        {children}
    </div>
);
