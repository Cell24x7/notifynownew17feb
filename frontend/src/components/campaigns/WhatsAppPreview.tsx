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
        <div className="flex flex-col h-full items-center justify-start py-2 overflow-y-auto max-h-[750px] no-scrollbar">
            <div
                className="w-[340px] h-[680px] bg-[#000a14] rounded-[3.5rem] p-3 shadow-2xl relative transition-all duration-500 flex flex-col shrink-0"
                style={{
                    boxShadow: '0 0 40px rgba(7, 94, 84, 0.2), inset 0 0 20px rgba(7, 94, 84, 0.1)',
                    border: '4px solid transparent',
                    backgroundImage: 'linear-gradient(#000a14, #000a14), linear-gradient(to right, #075E54, #128C7E, #25D366)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                }}
            >
                {/* Phone Notch/Features */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 h-8 w-32 bg-black rounded-full z-20 shadow-inner flex items-center justify-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-900/40" />
                    <div className="w-12 h-1.5 rounded-full bg-zinc-800/60" />
                </div>

                <div className="h-full w-full bg-[#E5DDD5] dark:bg-[#0b141a] rounded-[2.5rem] overflow-hidden flex flex-col relative z-10 no-scrollbar">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

                    {/* WhatsApp Header */}
                    <div className="px-4 pt-10 pb-3 bg-[#075E54] text-white flex items-center gap-3 shadow-md border-b border-white/5 relative z-10">
                        <ChevronLeft className="h-5 w-5" />
                        <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white/20 relative flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full bg-[#128C7E] flex items-center justify-center text-[10px] font-bold">WA</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate tracking-tight">Official Account</p>
                            <p className="text-[9px] opacity-70 flex items-center gap-0.5">
                                <Shield className="h-2.5 w-2.5" /> Business Account
                            </p>
                        </div>
                        <MoreVertical className="h-4 w-4 opacity-70" />
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
                                        <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-400">
                                            <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Image Header</span>
                                        </div>
                                    )}
                                    {header.format === 'VIDEO' && (
                                        <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-800 text-zinc-400">
                                            <Video className="h-10 w-10 mb-2 opacity-50" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Video Header</span>
                                        </div>
                                    )}
                                    {header.format === 'DOCUMENT' && (
                                        <div className="w-full h-20 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/10 text-blue-400">
                                            <FileText className="h-8 w-8 mb-1 opacity-50" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Document</span>
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
                                <div className="border-t border-gray-50 dark:border-white/5 flex flex-col">
                                    {buttonsComp.buttons.filter((b: any) => b.type !== 'QUICK_REPLY').map((btn: any, i: number) => (
                                        <div key={i} className="py-2.5 px-3 border-b last:border-0 border-gray-50 dark:border-white/5 text-center flex items-center justify-center gap-2 text-[#00a884] dark:text-[#53bdeb] font-bold text-xs uppercase tracking-tight hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                            {btn.type === 'URL' && <ExternalLink className="h-3 w-3" />}
                                            {btn.type === 'PHONE_NUMBER' && <Phone className="h-3 w-3" />}
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
