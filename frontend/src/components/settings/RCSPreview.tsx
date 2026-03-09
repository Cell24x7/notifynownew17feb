import {
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  ArrowLeft,
  MoreVertical,
  Shield,
  Plus,
  Smile,
  Image as ImageIcon,
  Mic,
  X,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RCSPreviewProps {
  botName?: string;
  brandName?: string;
  shortDescription?: string;
  brandColor?: string;
  botLogo?: string | null;
  bannerImage?: string | null;
  phoneNumber?: string;
  email?: string;
}

export function RCSPreview({
  botName = "",
  brandName = "",
  shortDescription = "",
  brandColor = "#7C3AED",
  botLogo = null,
  bannerImage = null,
  phoneNumber = "",
  email = "",
}: RCSPreviewProps) {
  const displayBotName = (botName || "").trim() || "Your Bot";
  const displayBrandName = (brandName || "").trim() || "Your Brand";
  const displayDesc = (shortDescription || "").trim() || "Welcome to our official RCS channel";

  const hasBanner = !!bannerImage;
  const hasLogo = !!botLogo;

  return (
    <div className="w-full max-w-[340px] mx-auto">
      {/* Phone container - Premium Light aesthetic */}
      <div className="relative p-3 bg-slate-100 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white ring-1 ring-slate-200">
        <div className="bg-white rounded-[2.8rem] overflow-hidden h-[620px] flex flex-col relative shadow-inner">
          
          {/* Top Notch Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-100 rounded-b-3xl z-30" />
          
          {/* Status Bar */}
          <div className="h-10 flex items-center justify-between px-8 text-slate-500 text-[11px] font-bold z-20 relative pt-2">
            <span>9:41</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-2.5 rounded-[2px] border border-slate-300 flex items-start p-[1px]">
                <div className="w-full h-full bg-slate-400 rounded-[0.5px]" />
              </div>
              <span>92%</span>
            </div>
          </div>

          {/* Chat Header */}
          <div className="bg-white/90 backdrop-blur-md px-5 py-4 flex items-center gap-4 border-b border-slate-100 z-20">
            <ArrowLeft className="h-5 w-5 text-slate-400 hover:text-primary transition-colors cursor-pointer" />
            <div 
              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm border-2 border-white ring-1 ring-slate-200"
              style={{ backgroundColor: brandColor || "#7C3AED" }}
            >
              {hasLogo ? (
                <img src={botLogo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                  {displayBotName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 font-bold text-sm truncate leading-none mb-1">{displayBotName}</div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 text-[10px] font-bold">Verified Business</span>
              </div>
            </div>
            <MoreVertical className="h-5 w-5 text-slate-300" />
          </div>

          {/* Scroll Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {/* Banner Area */}
            <div className="relative">
              <div 
                className="h-36 bg-cover bg-center"
                style={{ 
                  backgroundImage: hasBanner ? `url(${bannerImage})` : undefined,
                  backgroundColor: brandColor ? brandColor + "10" : "#7C3AED10"
                }}
              >
                {!hasBanner && (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Smartphone className="w-12 h-12 text-slate-900" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div 
                  className="w-20 h-20 rounded-full border-[5px] border-white overflow-hidden shadow-xl ring-1 ring-slate-100"
                  style={{ backgroundColor: brandColor || "#7C3AED" }}
                >
                  {hasLogo ? (
                    <img src={botLogo} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                      {displayBotName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Title Area */}
            <div className="pt-14 pb-8 px-6 text-center">
              <h4 className="text-slate-900 text-xl font-bold tracking-tight">{displayBrandName}</h4>
              <p className="text-slate-500 text-xs mt-3 leading-relaxed font-medium">
                {displayDesc}
              </p>
            </div>

            {/* Actions */}
            <div className="flex bg-white border-y border-slate-100">
              <button 
                className={cn(
                  "flex-1 py-5 border-r border-slate-50 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all",
                  !phoneNumber && "opacity-40"
                )}
                disabled={!phoneNumber}
              >
                <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Call</span>
              </button>
              <button 
                className={cn(
                  "flex-1 py-5 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all",
                  !email && "opacity-40"
                )}
                disabled={!email}
              >
                <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</span>
              </button>
            </div>

            {/* Preview Message */}
            <div className="px-6 py-8">
              <div className="bg-white rounded-2xl p-1 shadow-md border border-slate-100">
                <div className="rounded-xl overflow-hidden">
                   <div className="h-28 bg-slate-100 flex items-center justify-center">
                     {hasBanner ? (
                       <img src={bannerImage} className="w-full h-full object-cover" />
                     ) : (
                       <ImageIcon className="h-6 w-6 text-slate-300" />
                     )}
                   </div>
                   <div className="p-4 space-y-3">
                     <div className="flex items-center gap-2">
                       <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                       <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">{displayBrandName}</span>
                     </div>
                     <p className="text-slate-700 text-[12px] font-bold leading-tight">
                        Hello! We're live on RCS. Official updates and premium support are now just a message away.
                     </p>
                     <button 
                       className="w-full py-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg"
                       style={{ backgroundColor: brandColor || "#7C3AED", boxShadow: `0 8px 16px -4px ${brandColor}40` }}
                     >
                        Get Started
                     </button>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Input Mockup */}
          <div className="bg-white border-t border-slate-100 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-4">
                <span className="text-slate-400 text-xs font-bold">Message...</span>
              </div>
              <div className="text-slate-400">
                <Smile className="h-6 w-6" />
              </div>
            </div>
            {/* Bottom Bar Indicator */}
            <div className="flex justify-center pb-1">
              <div className="w-20 h-1.5 bg-slate-200 rounded-full" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}