import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageTemplate } from '@/lib/mockData';
import { CampaignData } from './CampaignCreationStepper';
import { Shield, ChevronLeft, MoreVertical, Plus, Smile, Image as ImageIcon, Send, Link, Phone, FileText, Bot, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CampaignPreviewProps {
  campaignData: CampaignData;
  template: MessageTemplate | undefined;
  variables: string[];
  csvPreview?: string[][];
  detectedColumns?: string[];
}

export function CampaignPreview({ campaignData, template, variables, csvPreview, detectedColumns }: CampaignPreviewProps) {
  const resolvedBody = React.useMemo(() => {
    if (!template) return '';
    let text = template.body || '';
    if (variables && variables.length > 0) {
      variables.forEach(v => {
        const mapping = campaignData.fieldMapping?.[v];
        if (mapping && mapping.value) {
          let replacement = `[${v}]`;

          if (mapping.type === 'custom') {
            replacement = mapping.value;
          } else if (mapping.type === 'field') {
            // Try to get value from first row of CSV preview if available
            if (csvPreview && csvPreview.length > 0 && detectedColumns) {
              const colIndex = detectedColumns.indexOf(mapping.value);
              if (colIndex !== -1 && csvPreview[0][colIndex]) {
                replacement = csvPreview[0][colIndex];
              } else {
                replacement = `[${mapping.value}]`;
              }
            } else {
              replacement = `[${mapping.value}]`;
            }
          }

          // Case-insensitive replacement for both {{var}} and [var] patterns
          const escapedVar = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\{\\{${escapedVar}\\}\\}|\\[${escapedVar}\\]`, 'gi');
          text = text.replace(regex, replacement);
        }
      });
    }
    return text;
  }, [template, variables, campaignData.fieldMapping, csvPreview, detectedColumns]);

  const { user } = useAuth();
  
  const channelColor = {
    whatsapp: 'bg-[#075E54]',
    sms: 'bg-[#007AFF]',
    rcs: 'bg-[#1A73E8]',
    email: 'bg-orange-600',
  }[campaignData.channel] || 'bg-slate-800';

  const meta = (template as any)?.metadata || {};
  const botName = meta.bot_name || meta.brand_name || meta.sender || user?.name || 'Business Account';
  const botLogo = meta.bot_logo || meta.bot_image || null;

  if (campaignData.channel === 'email') {
    return (
      <div className="flex flex-col items-center justify-start min-h-full pt-2 sm:pt-4 pb-16 sm:pb-24 overflow-y-auto no-scrollbar w-full px-2 sm:px-4">
        <div className="w-full max-w-[320px] sm:max-w-[420px] md:max-w-[500px] bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col mx-auto">
          {/* Email Subject Bar */}
          <div className="bg-slate-50 border-b border-border px-3 sm:px-6 py-2.5 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-base">
                {user?.name?.[0]?.toUpperCase() || 'E'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] sm:text-sm font-bold text-slate-800 truncate">{meta.subject || 'No Subject'}</h3>
                <p className="text-[8px] sm:text-[10px] text-slate-500 truncate">From: {user?.name || 'Your Business'} &lt;noreply@notify.now&gt;</p>
              </div>
              <div className="px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] bg-green-50 text-green-600 border border-green-100 flex items-center gap-0.5 sm:gap-1 uppercase font-bold tracking-tighter shrink-0">
                <Shield className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Verified
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100 p-2 sm:p-4 min-h-[250px] sm:min-h-[400px]">
            <div 
              className="bg-white rounded-md sm:rounded-lg shadow-sm p-3 sm:p-6 min-h-full prose prose-sm max-w-none email-content-preview text-[11px] sm:text-sm"
              dangerouslySetInnerHTML={{ __html: resolvedBody || template?.body || '<p class="text-slate-400 italic">No content yet...</p>' }}
            />
          </div>

          <div className="bg-slate-50 border-t border-border px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center text-[8px] sm:text-[9px] text-slate-400">
            <span>Powered by NotifyNow</span>
            <div className="flex gap-2 sm:gap-4 font-medium uppercase tracking-tighter">
              <span>Unsubscribe</span>
              <span className="hidden sm:inline">Privacy Policy</span>
            </div>
          </div>
        </div>
        <div className="mt-2 sm:mt-4 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">
           Desktop Preview
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-full pt-2 sm:pt-4 pb-16 sm:pb-24 overflow-y-auto no-scrollbar w-full">
      <div
        className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[300px] aspect-[9/19] h-auto bg-[#000a14] rounded-[2rem] sm:rounded-[2.5rem] p-1.5 sm:p-2.5 shadow-2xl relative transition-all duration-500 origin-top flex-shrink-0 flex flex-col mx-auto"
        style={{
          transform: 'scale(1)',
          boxShadow: '0 0 30px rgba(0, 114, 255, 0.3), inset 0 0 15px rgba(0, 114, 255, 0.1)',
          border: '4px solid transparent',
          backgroundImage: 'linear-gradient(#000a14, #000a14), linear-gradient(to right, #0072FF, #00C6FF, #D81B60)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        {/* Hotstar Gradient Border Glow */}
        <div className="absolute inset-0 rounded-[2.5rem] sm:rounded-[3rem] border border-blue-500/20 pointer-events-none" />

        {/* Phone Features */}
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 h-4 sm:h-6 w-16 sm:w-24 bg-black rounded-full z-20 shadow-inner flex items-center justify-end px-3 sm:px-4">
          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-900/40" />
        </div>

        <div className="h-full w-full bg-[#f0f2f5] dark:bg-[#060d15] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col relative z-10">
          {/* Header */}
          <div 
            className={cn("px-3 sm:px-4 pt-7 sm:pt-10 pb-2 sm:pb-3 text-white flex items-center gap-2 sm:gap-3 shadow-md border-b border-white/5", !meta.bot_color && channelColor)}
            style={meta.bot_color ? { backgroundColor: meta.bot_color } : {}}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            
            {botLogo ? (
              <img src={botLogo} alt="Bot DP" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-white/20 shadow-sm bg-white shrink-0" />
            ) : (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/20 flex items-center justify-center border border-white/20 shadow-sm shrink-0">
                {campaignData.channel === 'whatsapp' ? <Store className="h-3 w-3 sm:h-4 sm:w-4 text-white/90" /> : <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white/90" />}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] sm:text-sm font-bold truncate tracking-tight">{botName}</span>
                {campaignData.channel === 'rcs' && <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-100 fill-blue-100/20" />}
              </div>
              <p className="text-[8px] sm:text-[10px] opacity-90 font-medium tracking-wide">
                {campaignData.channel === 'rcs' ? 'Verified Application' : campaignData.channel === 'whatsapp' ? 'Verified Official Business' : 'SMS Sender'}
              </p>
            </div>
            <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
            {/* Date Bubble */}
            <div className="flex justify-center">
              <span className="bg-black/5 dark:bg-white/5 text-[9px] px-2.5 py-0.5 rounded-md text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
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
                {/* RCS Specific Layouts */}
                {template.type === 'rich_card' || template.type === 'rich-card' ? (
                  <div className="flex flex-col">
                    {template.mediaUrl && (
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-40 flex items-center justify-center overflow-hidden">
                        <img src={template.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="text-[13px] font-bold text-[#111b21] dark:text-[#e9edef] mb-1">{template.title || template.name}</h4>
                      <p className="text-[11px] text-[#667781] dark:text-[#8696a0] leading-[1.3]">{resolvedBody || template.body}</p>
                    </div>
                  </div>
                ) : template.type === 'carousel' ? (
                  <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar">
                    {/* Simple carousel rendering */}
                    <div className="min-w-[180px] bg-zinc-50 dark:bg-[#1f2c33] rounded-xl border border-black/5 overflow-hidden">
                      <div className="h-24 bg-zinc-200" />
                      <div className="p-2">
                        <p className="text-[10px] font-bold truncate">Item 1</p>
                        <p className="text-[9px] opacity-70 line-clamp-1">Description here...</p>
                      </div>
                    </div>
                    <div className="min-w-[180px] bg-zinc-50 dark:bg-[#1f2c33] rounded-xl border border-black/5 overflow-hidden">
                      <div className="h-24 bg-zinc-200" />
                      <div className="p-2">
                        <p className="text-[10px] font-bold truncate">Item 2</p>
                        <p className="text-[9px] opacity-70 line-clamp-1">Description here...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                {/* Buttons / Suggestions */}
                {template.buttons && template.buttons.length > 0 && (
                  <div className="border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 divide-y dark:divide-white/5">
                    {template.buttons.map((btn, i) => (
                      <div key={i} className="w-full py-2.5 text-center flex items-center justify-center gap-2 cursor-pointer hover:bg-black/5">
                        {btn.type === 'url' && <Link className="h-3.5 w-3.5 text-[#00a884]" />}
                        {btn.type === 'phone' && <Phone className="h-3.5 w-3.5 text-[#00a884]" />}
                        <span className="text-[#00a884] dark:text-[#53bdeb] text-[13px] font-bold">
                          {btn.label || btn.displayText}
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
