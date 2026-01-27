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
} from "lucide-react";

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
  const displayBotName = botName || "Bot Name";
  const displayBrandName = brandName || "Brand Name";
  const displayDescription =
    shortDescription || "Short description";

  return (
    <div className="sticky top-0">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
        Preview of Business Info
      </h3>

      {/* Phone Frame */}
      <div className="mx-auto w-[270px] h-[560px] bg-gray-900 rounded-[2.3rem] p-2 shadow-2xl">
        <div className="relative h-full">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />

          {/* Screen */}
          <div className="bg-gray-950 rounded-[1.9rem] overflow-hidden h-full flex flex-col">

            {/* Status Bar */}
            <div className="h-7 flex items-center justify-between px-5 text-white text-[10px]">
              <span>10:00</span>
              <span>📶 🔋</span>
            </div>

            {/* Header */}
            <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 border-b border-gray-800">
              <ArrowLeft className="h-4 w-4 text-white" />
              <div
                className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                {botLogo ? (
                  <img
                    src={botLogo}
                    alt="Bot Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs font-bold">
                    {displayBotName.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-white text-sm font-medium flex-1 truncate">
                {displayBotName}
              </span>
              <Shield className="h-4 w-4 text-blue-400" />
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">

              {/* Info & Options */}
              <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="h-3 w-3 text-gray-400" />
                  <span className="text-white text-xs font-medium">
                    Info & Options
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-400" />
                  <MoreVertical className="h-3 w-3 text-gray-400" />
                </div>
              </div>

              {/* Banner */}
              <div
                className="h-24 relative flex items-end justify-center"
                style={{
                  backgroundImage: bannerImage
                    ? `url(${bannerImage})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor: brandColor + "30",
                }}
              >
                <div
                  className="absolute -bottom-6 w-14 h-14 rounded-full border-4 border-gray-950 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >
                  {botLogo ? (
                    <img
                      src={botLogo}
                      alt="Bot Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold">
                      {displayBotName.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Bot Info */}
              <div className="pt-8 pb-4 px-4 text-center">
                <h4 className="text-white text-sm font-semibold">
                  {displayBotName}
                </h4>
                <p className="text-gray-400 text-xs mt-1">
                  {displayDescription}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-8 py-3 border-t border-b border-gray-800">
                {phoneNumber && (
                  <div className="flex flex-col items-center">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1">
                      Call
                    </span>
                  </div>
                )}
                {website && (
                  <div className="flex flex-col items-center">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1">
                      Website
                    </span>
                  </div>
                )}
                {email && (
                  <div className="flex flex-col items-center">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1">
                      Email
                    </span>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex">
                <div className="flex-1 py-2 text-center border-b-2 border-blue-500">
                  <span className="text-blue-500 text-xs">Info</span>
                </div>
                <div className="flex-1 py-2 text-center border-b border-gray-700">
                  <span className="text-gray-400 text-xs">Options</span>
                </div>
              </div>

              {/* Message Preview */}
              <div className="px-3 py-4">
                <div className="bg-gray-800 rounded-xl max-w-[200px] overflow-hidden">
                  <div
                    className="h-16 flex items-center justify-center"
                    style={{ backgroundColor: brandColor + "40" }}
                  >
                    <span className="text-white text-xs font-medium">
                      {displayBrandName}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-white text-[10px] font-medium">
                      Welcome Message
                    </p>
                    <p className="text-gray-400 text-[9px] mt-1 line-clamp-2">
                      {displayDescription}
                    </p>
                  </div>
                </div>

                <p className="text-center text-gray-500 text-[10px] mt-2">
                  10:00
                </p>
              </div>
            </div>

            {/* Unsubscribe */}
            <div className="bg-amber-50 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-amber-800">
                <span className="underline cursor-pointer">Unsubscribe</span>{" "}
                to stop receiving messages
              </span>
              <X className="h-3 w-3 text-amber-600" />
            </div>

            {/* Input */}
            <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 border-t border-gray-800">
              <Plus className="h-4 w-4 text-gray-400" />
              <div className="flex-1 bg-gray-800 rounded-full px-3 py-1.5">
                <span className="text-gray-500 text-xs">RCS message</span>
              </div>
              <Smile className="h-4 w-4 text-gray-400" />
              <Image className="h-4 w-4 text-gray-400" />
              <Mic className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
