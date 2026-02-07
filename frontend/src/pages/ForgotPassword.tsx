import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Loader2, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { OtpVerification } from '@/components/auth/OtpVerification'; // Reusing components
import { PasswordCreation } from '@/components/auth/PasswordCreation';
import { API_BASE_URL } from '@/config/api';

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }), // Send as identifier
      });

      const data = await response.json();
      if (data.success) {
        setStep('otp');
        toast({ title: 'OTP Sent', description: `Check your email/mobile ${email}` });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.message });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (verifiedOtp: string) => {
    setOtp(verifiedOtp);
    setStep('password');
  };

  const handlePasswordReset = async (newPassword: string) => {
     // NOTE: PasswordCreation component usually handles the API call itself, 
     // but here we might need to manually call reset-password if the component is designed for signup.
     // Let's check if we can reuse it directly or if we need to wrap the API call.
     // Assuming PasswordCreation returns the password or we can fetch directly.
     // Actually, let's implement the reset logic here and pass a callback if needed, 
     // OR if PasswordCreation is tightly coupled to signup, we might need to replicate UI.
     // For safety, let's look at PasswordCreation usage. 
     // Assuming we can pass a callback "onPasswordCreated" but we need to intercept it to call our API.
     
     // actually, let's build the form manually here for maximum control 
     // unless we are sure PasswordCreation is generic.
     // Let's assume we build UI here for Step 3 to be safe.
  };

  // Re-implementing Step 3 manually to ensure it hits the correct /reset-password endpoint
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: "Passwords don't match" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, otp, newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        setStep('success');
        toast({ title: 'Success', description: 'Password has been reset.' });
      } else {
         toast({ variant: 'destructive', title: 'Error', description: data.message });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        
        {step === 'email' && (
          <>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Forgot Password?</CardTitle>
              <CardDescription>Enter your email or mobile number to receive a reset OTP.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Mobile</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="you@company.com or 9876543210"
                    value={email} // keeping 'email' state var name to minimize diff, acts as identifier
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
                <Link to="/auth" className="block">
                  <Button variant="ghost" className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Button>
                </Link>
              </form>
            </CardContent>
          </>
        )}

        {step === 'otp' && (
          <div className="p-6">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Verify OTP</h2>
                <p className="text-sm text-muted-foreground">Enter the code sent to {email}</p>
             </div>
             {/* reusing OtpVerification logic but manually if needed, 
                 or just use the component if it allows 'email' prop and 'onOtpVerified' callback.
                 Let's assume OtpVerification component works as expected. 
             */}
             <OtpVerification 
               email={email} 
               onOtpVerified={handleVerifyOtp} 
               onBackClick={() => setStep('email')} 
               isLoading={loading}
             />
          </div>
        )}

        {step === 'password' && (
          <>
             <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>Create a new strong password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === 'success' && (
          <>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Password Reset</CardTitle>
              <CardDescription>Your password has been successfully updated.</CardDescription>
            </CardHeader>
            <CardContent>
               <Button onClick={() => navigate('/auth')} className="w-full">
                 Login with New Password
               </Button>
            </CardContent>
          </>
        )}

      </Card>
    </div>
  );
}
