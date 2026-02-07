import { useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailSignupProps {
  onOtpSent: (identifier: string, type: 'email' | 'mobile') => void;
  isLoading: boolean;
}

export function EmailSignup({ onOtpSent, isLoading }: EmailSignupProps) {
  const [tab, setTab] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile: string) => {
    const mobileRegex = /^[0-9]{10,13}$/;
    return mobileRegex.test(mobile);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (!value) {
      setEmailError('Email is required');
    } else if (!validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setMobile(value);
    if (!value) {
      setMobileError('Mobile number is required');
    } else if (!validateMobile(value)) {
      setMobileError('Please enter a valid mobile number (10-13 digits)');
    } else {
      setMobileError('');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === 'email') {
      if (!email || emailError) {
        setEmailError(email ? emailError : 'Email is required');
        return;
      }
    } else {
      if (!mobile || mobileError) {
        setMobileError(mobile ? mobileError : 'Mobile number is required');
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: tab === 'email' ? email : undefined,
          mobile: tab === 'mobile' ? mobile : undefined,
          is_signup: true 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to send OTP',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'OTP Sent',
        description: `We've sent an OTP to ${tab === 'email' ? email : mobile}`,
      });

      onOtpSent(tab === 'email' ? email : mobile, tab);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSendOtp} className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'email' | 'mobile')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={handleEmailChange}
              disabled={isLoading}
              className={`py-6 text-base ${emailError ? 'border-red-500' : ''}`}
            />
            {emailError && <p className="text-sm text-red-500">{emailError}</p>}
          </div>
          <p className="text-sm text-muted-foreground">
            We'll send you a verification code to confirm your email address.
          </p>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-base font-medium">
              Mobile Number
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center px-3 border rounded-md bg-muted text-muted-foreground">
                +91
              </div>
              <Input
                id="mobile"
                type="tel"
                placeholder="9876543210"
                value={mobile}
                onChange={handleMobileChange}
                disabled={isLoading}
                className={`py-6 text-base ${mobileError ? 'border-red-500' : ''}`}
              />
            </div>
            {mobileError && <p className="text-sm text-red-500">{mobileError}</p>}
          </div>
          <p className="text-sm text-muted-foreground">
            We'll send you a verification code to confirm your mobile number via SMS/WhatsApp.
          </p>
        </TabsContent>
      </Tabs>

      <Button
        type="submit"
        className="w-full gradient-primary text-primary-foreground py-6 text-base"
        disabled={isLoading || (tab === 'email' ? !!emailError : !!mobileError)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending OTP...
          </>
        ) : (
          'Get Verification Code'
        )}
      </Button>
    </form>
  );
}
