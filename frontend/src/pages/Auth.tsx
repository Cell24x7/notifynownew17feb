import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Smartphone, Loader2, Star } from 'lucide-react';
import { EmailSignup } from '@/components/auth/EmailSignup';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { PasswordCreation } from '@/components/auth/PasswordCreation';
import { WelcomePopup } from '@/components/auth/WelcomePopup';
import { useBranding } from '@/contexts/BrandingContext';
import { FeedbackDialog } from '@/components/auth/FeedbackDialog';
import { FeedbackMarquee } from '@/components/auth/FeedbackMarquee';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useBranding();

  // New signup flow states
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'password' | 'done'>('email');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showWelcome, setShowWelcome] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);


  if (isAuthenticated && !showWelcome) {
    if (user?.role === 'admin' || user?.role === 'reseller') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobileOrEmail = (identifier: string) => {
    if (validateEmail(identifier)) return true;
    const mobileRegex = /^\d{10,13}$/;
    return mobileRegex.test(identifier);
  };

  const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginEmail(value);
    if (!value) {
      setLoginEmailError('Email or Mobile is required');
    } else if (!validateMobileOrEmail(value)) {
      setLoginEmailError('Please enter a valid email or mobile number');
    } else {
      setLoginEmailError('');
    }
  };

  const handleLoginPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setLoginPassword(password);
    if (!password) {
      setLoginPasswordError('Password is required');
    } else {
      setLoginPasswordError('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmailError || loginPasswordError) return;
    if (!loginEmail || !loginPassword) {
      if (!loginEmail) setLoginEmailError('Email or Mobile is required');
      if (!loginPassword) setLoginPasswordError('Password is required');
      return;
    }
    setLoading(true);
    try {
      const success = await login(loginEmail, loginPassword);
      if (success) {
        setShowWelcome(true);
        setTimeout(() => {
          const currentUser = JSON.parse(atob(localStorage.getItem('authToken')?.split('.')[1] || '{}'));
          if (currentUser.role === 'admin' || currentUser.role === 'reseller') {
            navigate('/super-admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 2000);
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupOtpSent = (identifier: string) => {
    setSignupEmail(identifier);
    setSignupStep('otp');
  };

  const handleOtpVerified = (otp: string) => {
    setSignupOtp(otp);
    setSignupStep('password');
  };

  const handlePasswordCreated = () => {
    setSignupStep('done');
    navigate('/dashboard');
  };

  const handleBackToEmail = () => {
    setSignupStep('email');
    setSignupEmail('');
    setSignupOtp('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <FeedbackMarquee key={refreshKey} />
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:h-[calc(100vh-40px)] lg:overflow-hidden">
        {/* Left Section */}
        <div className="hidden lg:block h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] bg-gradient-to-br from-primary/15 via-background to-emerald-500/10">
          <div className="min-h-full flex flex-col px-10 py-12">
            <div className="w-full max-w-xl mx-auto my-auto">
              <div className="flex items-center gap-3 mb-10">
                <img src={settings?.logo_url || "/logo.svg"} alt={settings?.brand_name || "NotifyNow"} className="w-12 h-12 rounded-xl shadow-lg" />
                <span className="text-2xl font-bold">{settings?.brand_name || "NotifyNow"}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Go Live Today . FREE WhatsApp Business API
              </div>

              <h1 className="text-4xl lg:text-4xl font-extrabold leading-tight tracking-tight text-foreground mb-6">
                <span className="block mb-1">Intelligent Messaging Across</span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl lg:text-3xl">
                  <span className="text-blue-500">SMS</span>
                  <span className="text-muted-foreground/30 font-light px-1">|</span>
                  <span className="text-green-500">WhatsApp</span>
                  <span className="text-muted-foreground/30 font-light px-1">|</span>
                  <span className="text-purple-500">RCS</span>
                </div>
              </h1>

              <p className="text-base lg:text-lg font-medium text-muted-foreground mb-8 max-w-lg">
                Drive Business Growth with{" "}
                <span className="text-primary font-bold">AI-Powered</span> Conversations
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed mb-7">
                Launch in minutes. Engage customers faster with official WhatsApp API, bulk campaigns,
                smart automation and seamless integrations{" "}
                <span className="font-semibold text-foreground">in one secure platform</span>.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="tel:+919892975484"
                  className="px-5 py-2.5 text-sm rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>

                <a
                  href="mailto:notify@notifynow.in"
                  className="px-5 py-2.5 text-sm rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Email Now
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col items-center px-6 py-12 lg:px-10 bg-background min-h-screen lg:min-h-0 lg:h-full lg:overflow-y-auto">
          <div className="w-full max-w-md my-auto">
            <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
              <img src={settings?.logo_url || "/logo.svg"} alt={settings?.brand_name || "NotifyNow"} className="w-10 h-10 rounded-xl shadow-sm" />
              <span className="text-xl font-bold tracking-tight">{settings?.brand_name || "NotifyNow"}</span>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-xl p-6 lg:p-8">
              {/* Give Feedback Button - Moved to Top Center of Card */}
              <div className="flex justify-center mb-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsFeedbackOpen(true)}
                  className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 transition-all gap-2"
                >
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  Give Feedback
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                </Button>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-extrabold tracking-tight text-blue-600">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Login to continue or create a new account.
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1 mb-8">
                  <TabsTrigger value="login" className="rounded-lg">
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg">
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="animate-fade-in">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email or Mobile</Label>
                      <Input
                        id="login-email"
                        type="text"
                        placeholder="Enter your email or mobile number"
                        value={loginEmail}
                        onChange={handleLoginEmailChange}
                        required
                        className={`h-11 rounded-xl ${loginEmailError ? 'border-red-500' : ''}`}
                      />
                      {loginEmailError && <p className="text-sm text-red-500">{loginEmailError}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your secure password"
                        value={loginPassword}
                        onChange={handleLoginPasswordChange}
                        required
                        className={`h-11 rounded-xl ${loginPasswordError ? 'border-red-500' : ''}`}
                      />
                      {loginPasswordError && <p className="text-sm text-red-500">{loginPasswordError}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                          Remember me
                        </Label>
                      </div>

                      <a href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                        Forgot password?
                      </a>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-bold shadow-lg gradient-primary text-primary-foreground"
                      disabled={loading || !agreedToTerms}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Log In
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Secure login • Encrypted session
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="animate-fade-in">
                  <div className="space-y-4">
                    {signupStep === 'email' && (
                      <EmailSignup onOtpSent={handleSignupOtpSent} isLoading={loading} />
                    )}

                    {signupStep === 'otp' && (
                      <OtpVerification
                        email={signupEmail}
                        onOtpVerified={handleOtpVerified}
                        onBackClick={handleBackToEmail}
                        isLoading={loading}
                      />
                    )}

                    {signupStep === 'password' && (
                      <PasswordCreation
                        email={signupEmail}
                        otp={signupOtp}
                        onPasswordCreated={handlePasswordCreated}
                        isLoading={loading}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="terms-check" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    className="h-4 w-4 rounded border-primary/30"
                  />
                  <Label 
                    htmlFor="terms-check" 
                    className="text-[10px] sm:text-xs text-muted-foreground font-normal leading-none cursor-pointer select-none"
                  >
                    I agree to the Terms and Privacy Policy
                  </Label>
                </div>
                
                <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed max-w-[250px]">
                  By continuing, you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary/70 font-medium hover:underline">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary/70 font-medium hover:underline">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WelcomePopup
        isOpen={showWelcome}
        onClose={() => { }}
        userName={user?.name}
        role={user?.role}
      />

      <FeedbackDialog 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
}