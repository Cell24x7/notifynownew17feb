import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Image as ImageIcon, Video, FileText,
    Smartphone, Phone, ExternalLink, ChevronLeft, MoreVertical, Shield
} from 'lucide-react';

interface WhatsAppPreviewProps {
    data: any;
}

export const WhatsAppPreview: React.FC<WhatsAppPreviewProps> = ({ data }) => {
    const getComponent = (type: string) => {
        return (data.components || []).find((c: any) => c.type === type);
    };

    const header = getComponent('HEADER');
    const body = getComponent('BODY');
    const footer = getComponent('FOOTER');
    const buttonsComp = getComponent('BUTTONS');

    return (
        <div className="flex flex-col h-full items-center justify-start overflow-hidden no-scrollbar w-full">
            {/* WhatsApp Screen Content Only - No Frame/Bezel */}
            <div className="h-full w-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden flex flex-col relative z-10 no-scrollbar shadow-sm">
                {/* WhatsApp Doodle Pattern */}
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none dark:opacity-[0.03]" style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundSize: '400px'
                }}></div>


                {/* WhatsApp Header - Premium - Increased Padding to clear notch */}
                <div className="px-4 pt-12 pb-3 bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] flex items-center gap-3 shadow-sm relative z-20">
                    <ChevronLeft className="h-6 w-6 text-[#008069] dark:text-[#00a884] -ml-1 cursor-pointer opacity-80" />
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#075E54] to-[#128C7E] relative flex items-center justify-center overflow-hidden shadow-md border border-white/10 shrink-0">
                        <span className="text-[12px] font-black text-white tracking-tighter">WA</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate leading-tight flex items-center gap-1.5">
                            Official Account
                            <div className="bg-[#00a884] rounded-full p-0.5">
                                <svg viewBox="0 0 18 18" width="10" height="10" className="text-white">
                                    <path fill="currentColor" d="M9,1.75L2.5,4.25V7.5C2.5,11.5 5.25,15.25 9,16.25C12.75,15.25 15.5,11.5 15.5,7.5V4.25L9,1.75M9,14.5C6.5,13.5 4.5,11 4.5,8V5.5L9,3.75L13.5,5.5V8C13.5,11 11.5,13.5 9,14.5M7,8.5L8.5,10L11.5,7L12.5,8L8.5,12L6,9.5L7,8.5Z"></path>
                                </svg>
                            </div>
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-[#667781] dark:text-[#8696a0] font-bold uppercase tracking-widest opacity-80">Business Account</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 text-[#54656f] dark:text-[#aebac1] opacity-80">
                        <Phone className="h-4 w-4" />
                        <MoreVertical className="h-4 w-4" />
                    </div>
                </div>


                {/* Chat Context */}
                <div className="flex-1 p-4 relative z-10 overflow-y-auto scrollbar-custom pt-6">
                    <div className="bg-white dark:bg-[#1f2c33] rounded-xl shadow-md overflow-hidden animate-in zoom-in-95 duration-500 origin-top-left max-w-[95%] border border-black/5">

                        {/* Template Header Preview */}
                        {header && header.format !== 'NONE' && (
                            <div className="bg-gray-100 dark:bg-black/10 relative min-h-[40px] flex items-center justify-center border-b border-gray-50 dark:border-white/5">
                                {header.format === 'TEXT' && (
                                    <div className="p-3 text-sm font-extrabold text-[#111b21] dark:text-[#e9edef] w-full">{header.text || 'Header Text'}</div>
                                )}
                                 {header.format === 'IMAGE' && (
                                    <div className="w-full h-auto min-h-[120px] max-h-[220px] flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 overflow-hidden">
                                        {header.previewUrl || (header.handle && header.handle.startsWith('http')) ? (
                                            <img src={header.previewUrl || header.handle} alt="Header" className="w-full h-full object-contain bg-black/5" />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-10 w-10 mb-2 opacity-30" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Image Header</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                {header.format === 'VIDEO' && (
                                    <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 overflow-hidden">
                                        {header.previewUrl || (header.handle && header.handle.startsWith('http')) ? (
                                            <video src={header.previewUrl || header.handle} className="w-full h-full object-cover" controls={false} autoPlay muted loop />
                                        ) : (
                                            <>
                                                <Video className="h-10 w-10 mb-2 opacity-30" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Video Header</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                {header.format === 'DOCUMENT' && (
                                    <div className="w-full h-20 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/10 text-blue-400">
                                        <FileText className="h-8 w-8 mb-1 opacity-50" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">{(header.example?.header_handle?.[0] || header.handle) ? 'Document Provided' : 'Document'}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Template Body Preview */}
                        <div className="p-3">
                            <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                                {body?.text || 'Message content will appear here...'}
                            </p>

                            {/* Template Footer Preview */}
                            {footer?.text && (
                                <p className="text-[11px] text-[#667781] dark:text-[#8696a0] mt-2 font-medium">
                                    {footer.text}
                                </p>
                            )}

                            <div className="flex justify-end mt-1 opacity-50">
                                <span className="text-[9px] text-gray-400">12:34 PM</span>
                            </div>
                        </div>

                        {/* Template Buttons Preview - CTAs */}
                        {buttonsComp?.buttons?.filter((b: any) => b.type !== 'QUICK_REPLY').length > 0 && (
                            <div className="border-t border-gray-100 dark:border-white/5 flex flex-col bg-gray-50/50 dark:bg-black/5">
                                {buttonsComp.buttons.filter((b: any) => b.type !== 'QUICK_REPLY').map((btn: any, i: number) => (
                                    <div key={i} className="py-3 px-3 border-b last:border-0 border-gray-100 dark:border-white/5 text-center flex items-center justify-center gap-2 text-[#008069] dark:text-[#53bdeb] font-semibold text-[13px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer active:bg-black/[0.1]">
                                        {btn.type === 'URL' && <ExternalLink className="h-3.5 w-3.5" />}
                                        {btn.type === 'PHONE_NUMBER' && <Phone className="h-3.5 w-3.5" />}
                                        {btn.text || 'Action Button'}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>


                    {/* Template Buttons Preview - Quick Replies */}
                    {buttonsComp?.buttons?.filter((b: any) => b.type === 'QUICK_REPLY').length > 0 && (
                        <div className="mt-2 space-y-1.5 flex flex-col items-center animate-in slide-in-from-bottom-2 duration-700">
                            {buttonsComp.buttons.filter((b: any) => b.type === 'QUICK_REPLY').map((btn: any, i: number) => (
                                <div key={i} className="w-full bg-white dark:bg-[#1f2c33] rounded-lg py-2.5 text-center shadow-sm text-[#00a884] dark:text-[#53bdeb] font-bold text-xs hover:bg-zinc-50 dark:hover:bg-white/5 transition-all cursor-pointer border border-black/5">
                                    {btn.text || 'Quick Reply'}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
