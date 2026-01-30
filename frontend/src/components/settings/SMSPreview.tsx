import { Card, CardContent } from '@/components/ui/card';

interface SMSPreviewProps {
  senderId?: string;
  companyName?: string;
  logo?: string | null;
  sampleMessage?: string;
  header?: string;
  footer?: string;
}

export function SMSPreview({ 
  senderId = '', 
  companyName = '', 
  logo = null, 
  sampleMessage = '', 
  header = '', 
  footer = '' 
}: SMSPreviewProps) {
  const displaySender = (senderId || '').trim() || 'SENDERID';
  const displayMessage = (header || '') + (sampleMessage || 'Your sample message preview...') + '\n' + (footer || '') + '\n-' + (companyName || 'Your Brand');

  return (
    <Card className="overflow-hidden shadow-md sticky top-4">
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3">
        {logo ? (
          <img 
            src={logo} 
            alt="Company Logo" 
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
            {(companyName?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-medium">{companyName || 'Your Brand'}</div>
          <div className="text-xs opacity-90">via {displaySender}</div>
        </div>
      </div>
      <CardContent className="p-5 bg-gray-50 min-h-[220px] whitespace-pre-wrap text-sm leading-relaxed">
        {displayMessage || 'Preview appears here once you fill the form...'}
      </CardContent>
      <div className="px-4 py-3 bg-gray-100 text-xs text-center text-muted-foreground">
        SMS simulation — actual delivery depends on operator & DLT approval
      </div>
    </Card>
  );
}