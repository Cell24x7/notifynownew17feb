import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MessageTemplate } from '@/lib/mockData';
import { CampaignData } from './CampaignCreationStepper';

interface CampaignPreviewProps {
  campaignData: CampaignData;
  template: MessageTemplate | undefined;
  variables: string[];
}

export function CampaignPreview({ campaignData, template, variables }: CampaignPreviewProps) {
  // Resolve body text with variables
  const resolvedBody = React.useMemo(() => {
    if (!template?.body) return '';
    let text = template.body;
    variables.forEach(v => {
      const mapping = campaignData.fieldMapping[v];
      if (mapping && mapping.value) {
        // Show sample value or placeholder
        const replacement = mapping.type === 'custom' 
          ? mapping.value 
          : `[${mapping.value}]`;
        text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), replacement);
      }
    });
    return text;
  }, [template, variables, campaignData.fieldMapping]);

  const channelColor = {
    whatsapp: 'bg-[#075E54]',
    sms: 'bg-blue-600',
    rcs: 'bg-blue-700',
  }[campaignData.channel] || 'bg-gray-800';

  if (!template && !campaignData.channel) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-muted/20 rounded-xl border-2 border-dashed">
        <p>Select a channel and template to see preview</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[280px] h-[550px] bg-black rounded-[2.5rem] p-3 shadow-2xl relative border-4 border-gray-800 scale-90 origin-top">
      {/* Phone Notch/Status Bar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-black rounded-b-xl z-20"></div>
      
      <div className="h-full w-full bg-background rounded-[2.5rem] overflow-hidden flex flex-col relative z-10">
        {/* Header */}
        <div className={cn("px-4 py-3 text-white flex items-center gap-3 shadow-sm z-10", channelColor)}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {campaignData.channel === 'rcs' ? 'RCS' : campaignData.channel === 'whatsapp' ? 'WA' : 'SMS'}
          </div>
          <div>
            <p className="text-sm font-semibold">Business Name</p>
            <p className="text-[10px] opacity-80">Verified Business</p>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 bg-[#e5ddd5] dark:bg-zinc-900 p-4 overflow-y-auto bg-opacity-50">
           {template ? (
             <div className="flex flex-col gap-2">
                {/* Date Bubble */}
                <div className="flex justify-center mb-2">
                  <span className="bg-black/10 dark:bg-white/10 text-[10px] px-2 py-1 rounded-full text-foreground/60 font-medium">
                    Today
                  </span>
                </div>

                {/* Message Bubble */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg rounded-tl-none shadow-sm max-w-[85%] overflow-hidden">
                   {/* Header Media */}
                   {template.header?.type !== 'none' && (
                     <div className="bg-muted h-32 flex items-center justify-center text-muted-foreground">
                        {template.header?.type === 'image' && <span className="text-xs">Image Header</span>}
                        {template.header?.type === 'video' && <span className="text-xs">Video Header</span>}
                        {template.header?.type === 'document' && <span className="text-xs">Document Header</span>}
                        {template.header?.type === 'text' && (
                             <div className="p-3 w-full">
                                <p className="font-bold text-sm">{template.header?.content || 'Header Text'}</p>
                             </div>
                        )}
                     </div>
                   )}

                   {/* Body */}
                   <div className="p-3">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {resolvedBody || template.body}
                      </p>
                      
                      {/* Footer */}
                      {template.footer && (
                        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                          {template.footer}
                        </p>
                      )}
                   </div>

                   {/* Buttons */}
                   {template.buttons && template.buttons.length > 0 && (
                     <div className="border-t border-border/50 divide-y divide-border/50">
                        {template.buttons.map((btn, i) => (
                          <div key={i} className="p-2.5 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                             <span className="text-blue-500 text-sm font-medium flex items-center justify-center gap-1">
                                {btn.type === 'url' && '🔗 '}
                                {btn.type === 'phone' && '📞 '}
                                {btn.label}
                             </span>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
                
                <span className="text-[10px] text-muted-foreground ml-1">Just now</span>
             </div>
           ) : (
             <div className="flex h-full items-center justify-center text-muted-foreground/50 text-sm p-8 text-center">
                Select a template to preview content
             </div>
           )}
        </div>

        {/* Input Area (Mock) */}
        <div className="p-2 border-t bg-background flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted"></div>
            <div className="flex-1 h-8 rounded-full bg-muted/50 border"></div>
            <div className="w-8 h-8 rounded-full bg-primary/20"></div>
        </div>
      </div>
    </div>
  );
}
