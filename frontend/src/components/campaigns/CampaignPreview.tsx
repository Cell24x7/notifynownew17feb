import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageTemplate } from '@/lib/mockData';
import { CampaignData } from './CampaignCreationStepper';
import { Shield, ChevronLeft, MoreVertical, Plus, Smile, Image as ImageIcon, Send, Link, Phone, FileText } from 'lucide-react';

interface CampaignPreviewProps {
  campaignData: CampaignData;
  template: MessageTemplate | undefined;
  variables: string[];
}

export function CampaignPreview({ campaignData, template, variables }: CampaignPreviewProps) {
  const resolvedBody = React.useMemo(() => {
    if (!template) return '';
    let text = template.body || '';
    if (variables && variables.length > 0) {
      variables.forEach(v => {
        const mapping = campaignData.fieldMapping?.[v];
        if (mapping && mapping.value) {
          const replacement = mapping.type === 'custom' ? mapping.value : `[${mapping.value}]`;
          text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), replacement);
        }
      });
    }
    return text;
  }, [template, variables, campaignData.fieldMapping]);

  const channelColor = {
    whatsapp: 'bg-[#075E54]',
    sms: 'bg-[#007AFF]',
    rcs: 'bg-[#1A73E8]',
  }[campaignData.channel] || 'bg-slate-800';

  return (
    <div className="flex flex-col items-center justify-start h-full pb-10 overflow-y-auto no-scrollbar">
      <div 
        className="w-[300px] h-[600px] bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl relative border-[4px] border-[#333] transition-all duration-500 origin-top flex-shrink-0"
        style={{ 
          transform: 'scale(0.75)', // Scaled down more to ensure it fits completely
          marginBottom: '-100px' // Adjusted offset for 0.75 scale
        }}
      >
        {/* Phone Features */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 h-6 w-24 bg-black rounded-full z-20 shadow-inner flex items-center justify-end px-4">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-900/40" />
        </div>
        
        <div className="h-full w-full bg-[#f0f2f5] dark:bg-[#0b141a] rounded-[2.5rem] overflow-hidden flex flex-col relative z-10">
          {/* Header */}
          <div className={cn("px-4 pt-10 pb-3 text-white flex items-center gap-3 shadow-md border-b border-white/10", channelColor)}>
            <ChevronLeft className="h-5 w-5" />
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold border border-white/10">
              {campaignData.channel?.toUpperCase() || 'RCS'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold truncate">Business Profile</span>
                {campaignData.channel === 'rcs' && <Shield className="h-3 w-3 text-cyan-300 fill-cyan-300/20" />}
              </div>
              <p className="text-[10px] opacity-80">Verified Account</p>
            </div>
            <MoreVertical className="h-4 w-4 opacity-70" />
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Date Bubble */}
              <div className="flex justify-center">
                <span className="bg-black/10 dark:bg-white/10 text-[10px] px-3 py-1 rounded-full text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  Today
                </span>
              </div>

              {!template ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">No Template Selected</p>
                    <p className="text-xs text-muted-foreground">Select a template from the list to see how it looks on a real device.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[90%] bg-white dark:bg-[#1f2c33] rounded-2xl rounded-tl-sm shadow-md border border-black/5 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Header Media */}
                    {template.header?.type && template.header.type !== 'none' && (
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 min-h-[140px] flex items-center justify-center border-b border-black/5">
                          {template.header.type === 'image' && (
                            template.header.content ? (
                              <img src={template.header.content} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="py-10 text-center opacity-30">
                                <ImageIcon className="h-10 w-10 mx-auto" />
                                <span className="text-[10px] font-black uppercase">Image Placeholder</span>
                              </div>
                            )
                          )}
                          {template.header.type === 'text' && (
                            <div className="p-3 w-full bg-zinc-50 dark:bg-zinc-800 border-b">
                              <p className="font-bold text-sm text-[#000000] dark:text-white uppercase tracking-tighter">{template.header.content}</p>
                            </div>
                          )}
                          {/* Fallback for other header types */}
                          {['video', 'document', 'audio'].includes(template.header.type) && (
                            <div className="py-10 text-center opacity-30">
                               <FileText className="h-10 w-10 mx-auto" />
                               <span className="text-[10px] font-black uppercase">{template.header.type}</span>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Body Content */}
                    <div className="p-3">
                        <div className="text-[14px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[1.4] pb-5">
                          {resolvedBody || template.body || 'No template content available.'}
                        </div>
                        
                        {template.footer && (
                          <div className="text-[11px] text-[#667781] dark:text-[#8696a0] mb-2 font-medium">
                            {template.footer}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">10:45 AM</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    {template.buttons && template.buttons.length > 0 && (
                      <div className="border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 divide-y dark:divide-white/5">
                          {template.buttons.map((btn, i) => (
                            <div key={i} className="w-full py-2.5 text-center flex items-center justify-center gap-2 cursor-pointer hover:bg-black/5">
                                {btn.type === 'url' && <Link className="h-3.5 w-3.5 text-[#00a884]" />}
                                {btn.type === 'phone' && <Phone className="h-3.5 w-3.5 text-[#00a884]" />}
                                <span className="text-[#00a884] dark:text-[#53bdeb] text-[13px] font-bold">
                                  {btn.label}
                                </span>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-[#202c33] flex items-center gap-2 border-t dark:border-white/5">
              <Plus className="h-6 w-6 text-[#8696a0]" />
              <div className="flex-1 h-10 rounded-full bg-[#f0f2f5] dark:bg-[#2a3942] px-4 flex items-center text-[#8696a0] text-sm">
                Type a message
              </div>
              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-md">
                <Send className="h-5 w-5 text-white -rotate-12" />
              </div>
          </div>

          {/* Home Indicator */}
          <div className="h-6 pb-2 flex justify-center items-end">
            <div className="w-28 h-1 bg-zinc-400/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
