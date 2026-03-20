import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');
  const { authenticateWithToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: 'LinkedIn Login Error',
        description: searchParams.get('error_description') || 'Authentication failed',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (code) {
      const handleCallback = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${apiUrl}/api/auth/linkedin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          const data = await res.json();

          if (data.success && data.token) {
            authenticateWithToken(data.token, data.user);
            setUserName(data.user.name);
            setShowWelcome(true);
            setProcessing(false);

            // 2 second delay before redirecting to match Google login feel
            setTimeout(() => {
              if (data.user.role === 'admin' || data.user.role === 'reseller') {
                navigate('/super-admin/dashboard', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }, 2000);
          } else {
            throw new Error(data.message || 'Verification failed');
          }
        } catch (err: any) {
          console.error('LinkedIn callback error:', err);
          toast({
            title: 'Authentication Failed',
            description: err.message || 'Could not verify LinkedIn account',
            variant: 'destructive',
          });
          navigate('/auth');
        }
      };

      handleCallback();
    } else {
      setProcessing(false);
      navigate('/auth');
    }
  }, [searchParams, authenticateWithToken, navigate, toast]);

  if (showWelcome) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-2xl animate-bounce">
              ✓
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back, {userName}!</h2>
          <p className="text-slate-500 text-lg">Successfully signed in with LinkedIn</p>
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Connecting to LinkedIn...</h2>
        <p className="text-slate-500">Please wait while we verify your account</p>
      </div>
    );
  }

  return null;
}
