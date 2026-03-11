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
        <div className="flex flex-col h-full items-center justify-start py-6 overflow-y-auto max-h-[850px] no-scrollbar">
            {/* iPhone 15 Pro Style Frame */}
            <div
                className="w-[325px] h-[660px] bg-zinc-900 rounded-[3rem] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative transition-all duration-500 flex flex-col shrink-0 border-[4px] border-zinc-800"
                style={{
                    boxShadow: '0 0 0 2px #222, 0 0 0 4px #444, 0 20px 50px rgba(0,0,0,0.4)',
                }}
            >
                {/* Side Buttons - Left (Volume) */}
                <div className="absolute left-[-6px] top-24 w-[3px] h-8 bg-zinc-700 rounded-l-md" />
                <div className="absolute left-[-6px] top-36 w-[3px] h-12 bg-zinc-700 rounded-l-md" />
                <div className="absolute left-[-6px] top-52 w-[3px] h-12 bg-zinc-700 rounded-l-md" />

                {/* Side Button - Right (Power) */}
                <div className="absolute right-[-6px] top-40 w-[3px] h-16 bg-zinc-700 rounded-r-md" />

                {/* Dynamic Island */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 h-6 w-24 bg-black rounded-full z-30 shadow-inner flex items-center justify-center pointer-events-none">
                    <div className="absolute right-4 w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800" />
                </div>

                <div className="h-full w-full bg-[#efeae2] dark:bg-[#0b141a] rounded-[2.5rem] overflow-hidden flex flex-col relative z-10 no-scrollbar shadow-inner">
                    {/* WhatsApp Doodle Pattern */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none dark:opacity-[0.03]" style={{
                        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                        backgroundSize: '400px'
                    }}></div>


                    {/* WhatsApp Header - Modern iOS Style */}
                    <div className="px-4 pt-12 pb-3 bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] flex items-center gap-3 shadow-sm relative z-20">
                        <ChevronLeft className="h-6 w-6 text-[#008069] dark:text-[#00a884] -ml-1 cursor-pointer" />
                        <div className="h-9 w-9 rounded-full bg-[#dfe5e7] dark:bg-[#6a7175] relative flex items-center justify-center overflow-hidden shadow-sm">
                            <div className="w-full h-full bg-[#075E54] flex items-center justify-center text-[10px] font-bold text-white">WA</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold truncate leading-tight flex items-center gap-1">
                                Official Account
                                <svg viewBox="0 0 18 18" width="14" height="14" className="text-[#00a884] shrink-0">
                                    <path fill="currentColor" d="M9,1.75L2.5,4.25V7.5C2.5,11.5 5.25,15.25 9,16.25C12.75,15.25 15.5,11.5 15.5,7.5V4.25L9,1.75M9,14.5C6.5,13.5 4.5,11 4.5,8V5.5L9,3.75L13.5,5.5V8C13.5,11 11.5,13.5 9,14.5M7,8.5L8.5,10L11.5,7L12.5,8L8.5,12L6,9.5L7,8.5Z"></path>
                                </svg>
                            </p>
                            <p className="text-[10px] text-[#667781] dark:text-[#8696a0] font-medium">Business Account</p>
                        </div>
                        <div className="flex items-center gap-3 text-[#54656f] dark:text-[#aebac1]">
                            <Phone className="h-4 w-4" />
                            <MoreVertical className="h-4 w-4" />
                        </div>
                    </div>


                    {/* Chat Context */}
                    <div className="flex-1 p-4 relative z-10 overflow-y-auto no-scrollbar pt-6">
                        <div className="bg-white dark:bg-[#1f2c33] rounded-xl shadow-md overflow-hidden animate-in zoom-in-95 duration-500 origin-top-left max-w-[95%] border border-black/5">

                            {/* Template Header Preview */}
                            {header && header.format !== 'NONE' && (
                                <div className="bg-gray-100 dark:bg-black/10 relative min-h-[40px] flex items-center justify-center border-b border-gray-50 dark:border-white/5">
                                    {header.format === 'TEXT' && (
                                        <div className="p-3 text-sm font-extrabold text-[#111b21] dark:text-[#e9edef] w-full">{header.text || 'Header Text'}</div>
                                    )}
                                    {header.format === 'IMAGE' && (
                                        <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 overflow-hidden">
                                            {header.previewUrl || (header.handle && header.handle.startsWith('http')) ? (
                                                <img src={header.previewUrl || header.handle} alt="Header" className="w-full h-full object-cover" />
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

                {/* Floating Info */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1f2c33]/95 backdrop-blur shadow-xl border border-gray-100 dark:border-white/10 rounded-full px-6 py-2 whitespace-nowrap z-30 transition-all duration-500 hover:scale-110">
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <Badge variant="outline" className="h-5 px-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            {data.category || 'UTILITY'}
                        </Badge>
                        <span>•</span>
                        <span className="uppercase">{data.language || 'en_US'}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
