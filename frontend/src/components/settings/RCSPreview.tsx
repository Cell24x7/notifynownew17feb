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
} from "lucide-react";

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
    <div className="sticky top-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
        RCS Business Chat Preview
      </h3>

      {/* Phone mockup – slightly larger & cleaner */}
      <div className="mx-auto w-[300px] bg-black rounded-[3rem] p-3 shadow-2xl border border-gray-800">
        <div className="bg-gray-950 rounded-[2.4rem] overflow-hidden h-[580px] flex flex-col relative">

          {/* Dynamic notch / pill */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20 shadow-inner" />

          {/* Status bar */}
          <div className="h-9 flex items-center justify-between px-6 text-white text-xs z-10 relative">
            <span>9:41</span>
            <div className="flex items-center gap-2">
              <span>5G</span>
              <span>92%</span>
            </div>
          </div>

          {/* Chat header */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-4 py-3 flex items-center gap-3 border-b border-gray-800/70 z-10">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-md"
              style={{ backgroundColor: brandColor || "#6366f1" }}
            >
              {hasLogo ? (
                <img src={botLogo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                  {displayBotName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-base truncate">{displayBotName}</div>
              <div className="text-gray-400 text-xs">Business • Verified</div>
            </div>
            <Shield className="h-5 w-5 text-cyan-400" />
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </div>

          {/* Scrollable area */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-950 to-gray-900">

            {/* Banner + avatar overlap */}
            <div className="relative">
              <div
                className="h-40 bg-cover bg-center"
                style={{
                  backgroundImage: hasBanner ? `url(${bannerImage})` : undefined,
                  backgroundColor: brandColor ? brandColor + "22" : "#4f46e522",
                }}
              />
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div
                  className="w-20 h-20 rounded-full border-4 border-gray-950 overflow-hidden shadow-2xl"
                  style={{ backgroundColor: brandColor || "#6366f1" }}
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

            {/* Business name + desc */}
            <div className="pt-14 pb-6 px-5 text-center">
              <h4 className="text-white text-xl font-bold">{displayBrandName}</h4>
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed max-w-xs mx-auto">
                {displayDesc}
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex justify-center gap-10 py-5 border-t border-gray-800/50 bg-gray-950/50">
              {phoneNumber && (
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center mb-1.5">
                    <Phone className="h-5 w-5 text-gray-300" />
                  </div>
                  <span className="text-xs text-gray-400">Call</span>
                </div>
              )}
              {email && (
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center mb-1.5">
                    <Mail className="h-5 w-5 text-gray-300" />
                  </div>
                  <span className="text-xs text-gray-400">Email</span>
                </div>
              )}
            </div>

            {/* Sample rich message card */}
            <div className="px-5 py-6">
              <div className="bg-gray-800/70 rounded-2xl overflow-hidden border border-gray-700 max-w-[260px] mx-auto">
                <div
                  className="h-28 flex items-center justify-center"
                  style={{ backgroundColor: brandColor + "30" || "#6366f133" }}
                >
                  <span className="text-white/90 font-medium">{displayBrandName}</span>
                </div>
                <div className="p-4">
                  <p className="text-white text-sm font-medium">Hello! 👋</p>
                  <p className="text-gray-300 text-xs mt-1.5 leading-relaxed">
                    {displayDesc.length > 10 ? displayDesc : "Thank you for connecting with us."}
                  </p>
                  <button
                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{ backgroundColor: brandColor || "#6366f1" }}
                  >
                    Visit Website
                  </button>
                </div>
              </div>

              <p className="text-center text-gray-600 text-xs mt-4">10:42</p>
            </div>
          </div>

          {/* Input bar */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center gap-3">
            <Plus className="h-6 w-6 text-gray-400" />
            <div className="flex-1 bg-gray-800 rounded-full py-3 px-5">
              <span className="text-gray-500 text-sm">Message</span>
            </div>
            <Smile className="h-6 w-6 text-gray-400" />
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}