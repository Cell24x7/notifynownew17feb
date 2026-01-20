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
  Image,
  Mic,
  X
} from 'lucide-react';

interface RCSPreviewProps {
  botName: string;
  brandName: string;
  shortDescription: string;
  brandColor: string;
  botLogo: string | null;
  bannerImage: string | null;
  phoneNumber?: string;
  email?: string;
  website?: string;
}

export function RCSPreview({
  botName,
  brandName,
  shortDescription,
  brandColor,
  botLogo,
  bannerImage,
  phoneNumber,
  email,
  website,
}: RCSPreviewProps) {
  const displayBotName = botName || 'Bot Name';
  const displayBrandName = brandName || 'Brand Name';
  const displayDescription = shortDescription || 'Short description';

  return (
    <div className="sticky top-0">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
        Preview of Business Info
      </h3>
      
      {/* Phone Frame */}
      <div className="mx-auto w-[280px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        {/* Phone Notch */}
        <div className="relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
          
          {/* Screen */}
          <div className="bg-gray-950 rounded-[2rem] overflow-hidden">
            {/* Status Bar */}
            <div className="h-8 bg-gray-950 flex items-center justify-between px-6 pt-2">
              <span className="text-white text-xs">10:00</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 flex items-end gap-px">
                  <div className="w-0.5 h-1 bg-white rounded-sm" />
                  <div className="w-0.5 h-1.5 bg-white rounded-sm" />
                  <div className="w-0.5 h-2 bg-white rounded-sm" />
                  <div className="w-0.5 h-2 bg-white rounded-sm" />
                </div>
                <div className="w-5 h-2.5 border border-white rounded-sm relative">
                  <div className="absolute inset-0.5 bg-white rounded-sm" style={{ width: '70%' }} />
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="bg-gray-900 px-3 py-2 flex items-center gap-3 border-b border-gray-800">
              <ArrowLeft className="h-5 w-5 text-white" />
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: brandColor }}
              >
                {displayBotName.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-medium text-sm flex-1 truncate">{displayBotName}</span>
              <Shield className="h-5 w-5 text-blue-400" />
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </div>

            {/* Info & Options Header */}
            <div className="bg-gray-900 px-4 py-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 text-gray-400" />
                  <span className="text-white text-sm font-medium">Info & Options</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Banner Area */}
            <div 
              className="h-28 relative flex items-end justify-center"
              style={{ backgroundColor: brandColor + '30' }}
            >
              {/* Logo Circle */}
              <div 
                className="absolute -bottom-6 w-14 h-14 rounded-full border-4 border-gray-950 flex items-center justify-center text-white font-bold shadow-lg"
                style={{ backgroundColor: brandColor }}
              >
                {displayBotName.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Bot Info */}
            <div className="pt-8 pb-4 px-4 text-center bg-gray-950">
              <h4 className="text-white font-semibold text-base">{displayBotName}</h4>
              <p className="text-gray-400 text-xs mt-1">{displayDescription}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-8 py-3 border-t border-b border-gray-800 bg-gray-950">
              {phoneNumber && (
                <div className="flex flex-col items-center">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-400 text-[10px] mt-1">Call</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <Globe className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400 text-[10px] mt-1">Website</span>
              </div>
              <div className="flex flex-col items-center">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400 text-[10px] mt-1">Email</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-950">
              <div className="flex-1 py-2 text-center border-b-2 border-blue-500">
                <span className="text-blue-500 text-xs font-medium">Info</span>
              </div>
              <div className="flex-1 py-2 text-center border-b border-gray-700">
                <span className="text-gray-400 text-xs">Options</span>
              </div>
            </div>

            {/* Messages Preview */}
            <div className="bg-gray-950 px-3 py-4 min-h-[120px]">
              {/* Sample Rich Card */}
              <div className="bg-gray-800 rounded-xl overflow-hidden max-w-[200px]">
                <div 
                  className="h-20 flex items-center justify-center"
                  style={{ backgroundColor: brandColor + '40' }}
                >
                  <div className="text-center">
                    <div 
                      className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: brandColor }}
                    >
                      {displayBotName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-[10px] font-medium">{displayBrandName}</span>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-white text-[10px] font-medium">Welcome Message</p>
                  <p className="text-gray-400 text-[8px] mt-1 line-clamp-2">
                    {displayDescription || 'Thank you for connecting with us!'}
                  </p>
                  <button 
                    className="w-full mt-2 py-1.5 rounded-lg text-[10px] text-white font-medium flex items-center justify-center gap-1"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Globe className="h-3 w-3" />
                    Learn More
                  </button>
                </div>
              </div>
              
              {/* Time */}
              <div className="text-center mt-3">
                <span className="text-gray-500 text-[10px]">10:00</span>
              </div>
            </div>

            {/* Unsubscribe Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/30 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-amber-800 dark:text-amber-200">
                <span className="underline cursor-pointer">Unsubscribe</span> to stop receiving messages
              </span>
              <X className="h-3 w-3 text-amber-600" />
            </div>

            {/* Input Area */}
            <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 border-t border-gray-800">
              <Plus className="h-5 w-5 text-gray-400" />
              <div className="flex-1 bg-gray-800 rounded-full px-3 py-1.5">
                <span className="text-gray-500 text-xs">RCS message</span>
              </div>
              <Smile className="h-5 w-5 text-gray-400" />
              <Image className="h-5 w-5 text-gray-400" />
              <Mic className="h-5 w-5 text-gray-400" />
            </div>

            {/* Home Indicator */}
            <div className="h-6 bg-gray-950 flex items-center justify-center">
              <div className="w-24 h-1 bg-gray-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
