import { Phone, CheckCircle2 } from 'lucide-react';


interface SMSPreviewProps {
  channelName?: string;
  senderId?: string;
  messageType?: string;
  brandColor?: string;
}

export function SMSPreview({
  channelName = 'SMS Channel',
  senderId = 'MYBRAND',
  messageType = 'gsm',
  brandColor = '#3B82F6', // Default blue for SMS
}: SMSPreviewProps) {
  const currentDate = new Date();
  const timeString = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
      <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
      <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
      <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
      
      <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-slate-950 flex flex-col relative">
        {/* Status Bar */}
        <div className="h-12 bg-gray-100 dark:bg-slate-900 flex items-center justify-between px-6 pt-2 select-none">
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{timeString}</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-end gap-0.5 h-3">
              <div className="w-0.5 h-1.5 bg-gray-900 dark:bg-gray-100 rounded-sm"></div>
              <div className="w-0.5 h-2 bg-gray-900 dark:bg-gray-100 rounded-sm"></div>
              <div className="w-0.5 h-2.5 bg-gray-900 dark:bg-gray-100 rounded-sm"></div>
              <div className="w-0.5 h-3 bg-gray-900 dark:bg-gray-100 rounded-sm"></div>
            </div>
            <div className="w-5 h-2.5 border border-gray-900 dark:border-gray-100 rounded-sm relative">
              <div className="absolute inset-0.5 bg-gray-900 dark:bg-gray-100 rounded-[1px] w-[70%]"></div>
            </div>
          </div>
        </div>

        {/* Message Header */}
        <div className="bg-gray-100 dark:bg-slate-900 px-4 pb-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
             <Phone className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
             <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
               {senderId || 'Sender ID'}
             </h3>
             <p className="text-xs text-muted-foreground truncate">
                {channelName || 'SMS Channel'}
             </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white dark:bg-slate-950 p-4 space-y-4 overflow-y-auto">
           <div className="text-center text-xs text-gray-400 my-4">Today</div>
           
           {/* Incoming Message Bubble */}
           <div className="flex flex-col gap-1 items-start max-w-[85%]">
              <div 
                className="rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm relative"
                style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}
              >
                <p>Hello! Your verification code is 123456. Do not share this code with anyone.</p>
                
                <div className="mt-1 flex justify-end">
                    <span className="text-[10px] text-gray-500">{timeString}</span>
                </div>
              </div>
           </div>

            {/* Outgoing Message Bubble (Reply) */}
           <div className="flex flex-col gap-1 items-end max-w-[85%] ml-auto">
             <div 
                className="rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-sm relative text-white"
                style={{ backgroundColor: brandColor }}
             >
                <p>{messageType === 'gsm' ? 'STOP' : '🛑'}</p>
                 <div className="mt-1 flex justify-end gap-1 items-center">
                    <span className="text-[10px] text-blue-100 opacity-80">{timeString}</span>
                     <CheckCircle2 className="w-3 h-3 text-blue-100 opacity-80" />
                </div>
             </div>
           </div>
        </div>

        {/* Input Area (Mock) */}
        <div className="p-3 bg-gray-100 dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800">
          <div className="h-9 bg-white dark:bg-slate-800 rounded-full border border-gray-300 dark:border-gray-700 w-full flex items-center px-4">
            <span className="text-sm text-gray-400">Text message</span>
          </div>
        </div>

      </div>
    </div>
  );
}