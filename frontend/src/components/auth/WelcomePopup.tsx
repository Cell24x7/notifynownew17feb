import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Rocket } from 'lucide-react';

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  role?: string;
}

export function WelcomePopup({ isOpen, onClose, userName, role }: WelcomePopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
             {role === 'admin' ? (
                <Rocket className="h-10 w-10 text-green-600" />
             ) : (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
             )}
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome Back, {userName || 'User'}!
          </h2>
          
          <p className="text-muted-foreground">
            {role === 'admin' 
              ? 'Taking you to the Command Center...' 
              : 'Redirecting you to your Dashboard...'}
          </p>

          <div className="w-full pt-4">
             <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress-indeterminate rounded-full" />
             </div>
          </div>
          
          {/* Optional: Manual close/continue button if auto-redirect is slow */}
          {/* <Button onClick={onClose} className="w-full mt-4">
            Continue to Dashboard
          </Button> */}
        </div>
      </div>
    </div>
  );
}
