import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';

interface OtpVerificationProps {
  email: string;
  onOtpVerified: (otp: string) => void;
  onBackClick: () => void;
  isLoading: boolean;
}

export function OtpVerification({ email, onOtpVerified, onBackClick, isLoading }: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();

  // Timer for OTP expiry
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    if (value && value.length === 6) {
      setOtpError('');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setOtpError(errorData.message || 'Invalid OTP');
        return;
      }

      toast({
        title: 'Success',
        description: 'Email verified! Now set your password.',
      });

      onOtpVerified(otp);
    } catch (err) {
      setOtpError('Failed to verify OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        toast({
          title: 'Error',
          description: 'Failed to resend OTP',
          variant: 'destructive',
        });
        return;
      }

      setOtp('');
      setOtpError('');
      setTimeLeft(60);
      setCanResend(false);

      toast({
        title: 'OTP Resent',
        description: `New OTP sent to ${email}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to resend OTP',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Verification code sent to</p>
        <p className="font-medium break-all">{email}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp" className="text-base font-medium">
          Verification Code
        </Label>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          placeholder="000000"
          value={otp}
          onChange={handleOtpChange}
          disabled={isLoading}
          maxLength={6}
          className={`py-6 text-2xl tracking-widest text-center ${otpError ? 'border-red-500' : ''}`}
        />
        {otpError && <p className="text-sm text-red-500">{otpError}</p>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={timeLeft < 60 ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
          Code expires in {formatTime(timeLeft)}
        </span>
        {canResend ? (
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-primary hover:underline font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Resend Code
          </button>
        ) : (
          <span className="text-muted-foreground">Resend in {formatTime(timeLeft)}</span>
        )}
      </div>

      <Button
        type="submit"
        className="w-full gradient-primary text-primary-foreground py-6 text-base"
        disabled={isLoading || otp.length !== 6}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Code'
        )}
      </Button>

      <button
        type="button"
        onClick={onBackClick}
        className="w-full text-center text-sm text-primary hover:underline py-2"
      >
        Change email address
      </button>
    </form>
  );
}
