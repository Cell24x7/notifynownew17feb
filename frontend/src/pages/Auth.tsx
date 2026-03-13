import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Loader2, Star, Mail } from 'lucide-react';
import { EmailSignup } from '@/components/auth/EmailSignup';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { PasswordCreation } from '@/components/auth/PasswordCreation';
import { WelcomePopup } from '@/components/auth/WelcomePopup';
import { useBranding } from '@/contexts/BrandingContext';
import { FeedbackDialog } from '@/components/auth/FeedbackDialog';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useBranding();

  // Signup flow states
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
          const token = localStorage.getItem('authToken');
          if (token) {
            const currentUser = JSON.parse(atob(token.split('.')[1] || '{}'));
            if (currentUser.role === 'admin' || currentUser.role === 'reseller') {
              navigate('/super-admin/dashboard', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
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
    <div className="h-screen w-full bg-[#f8faff] flex items-center justify-center p-2 lg:p-6 font-['Inter',_sans-serif] overflow-hidden lg:overflow-visible">
      {/* Decorative Circles Background with Heavy Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[-5%] w-[400px] h-[400px] bg-[#0052cc]/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-[#0052cc]/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[450px] h-[450px] bg-[#0052cc]/10 rounded-full blur-[110px]"></div>
        <div className="absolute top-[-5%] right-[15%] w-[350px] h-[350px] bg-[#0052cc]/10 rounded-full blur-[90px]"></div>
      </div>

      {/* Main Container - Optimized for 100% Zoom */}
      <div className="relative z-10 w-full max-w-[1080px] bg-white rounded-[32px] overflow-hidden flex flex-col lg:flex-row shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] border border-slate-100/50 max-h-[95vh] lg:max-h-[85vh]">
        
        {/* Left Interactive Section */}
        <div className="w-full lg:w-[58%] bg-[#0052cc] p-6 lg:p-10 flex flex-col relative overflow-hidden shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 lg:mb-10">
            <div className="w-9 h-9 bg-[#312E81] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
              <div className="flex gap-1.2">
                <div className="w-1.2 h-5 bg-white rounded-full"></div>
                <div className="w-1.2 h-5 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-xl font-black text-white tracking-tight">{settings?.brand_name || "NotifyNow"}</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#34D399]/20 border border-[#34D399]/30 text-[#34D399] font-bold text-[10px] mb-8 w-fit">
            <div className="relative w-1.2 h-1.2">
              <span className="absolute inset-0 bg-[#34D399] rounded-full animate-ping"></span>
              <span className="relative block w-1.2 h-1.2 bg-[#34D399] rounded-full"></span>
            </div>
            Go Live Today : FREE WhatsApp Business API
          </div>

          {/* Main Titles */}
          <div className="flex-grow flex flex-col justify-center">
            <h1 className="text-2xl lg:text-[34px] font-extrabold text-white leading-tight mb-6">
              Intelligent Messaging Across<br />
              <span className="text-white">SMS | </span>
              <span className="text-[#34D399]">WhatsApp</span>
              <span className="text-white"> | RCS</span>
            </h1>

            <p className="text-base lg:text-lg font-bold text-white mb-4">
              Drive Business Growth with <span className="text-[#34D399]">AI-Powered</span> Conversations
            </p>

            <p className="text-xs lg:text-sm text-blue-50/80 max-w-sm mb-10 leading-relaxed">
              Engage customers faster with official WhatsApp API, 
              bulk campaigns, and seamless automations in one powerful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mb-10">
              <a
                href="tel:+919892975484"
                className="px-6 py-3 rounded-2xl bg-[#00C853] text-white font-black text-[13px] shadow-[0_8px_20px_-6px_rgba(0,200,83,0.4)] hover:bg-[#00B248] transition-all flex items-center gap-2"
              >
                <Phone className="w-4 h-4 fill-white text-white" />
                Call Now
              </a>

              <a
                href="mailto:notify@notifynow.in"
                className="px-6 py-3 rounded-2xl bg-white text-[#0052cc] font-black text-[13px] shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Now
              </a>
            </div>
          </div>

          {/* Testimonial Box */}
          <div className="mt-auto pt-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-[24px] p-5 lg:p-6 max-w-xs shadow-xl border border-white/20">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-[#FFB300] text-[#FFB300]" />
                ))}
              </div>
              <p className="text-[#1E293B] text-[12px] font-bold italic leading-relaxed mb-4">
                "Excellent messaging platform with great support team. Campaign management is very easy to handle."
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[#059669] font-black text-[10px]">Amit Patel</span>
                <span className="text-slate-300 text-[10px]">|</span>
                <span className="text-slate-500 font-bold text-[10px]">GrowthEdge</span>
              </div>
            </div>
          </div>

          {/* Decorative Elements inside Panel */}
          <div className="absolute bottom-[-100px] right-[-80px] w-[280px] h-[280px] bg-white/5 rounded-full pointer-events-none"></div>
        </div>

        {/* Right Form Section */}
        <div className="w-full lg:w-[42%] bg-white p-4 lg:p-8 flex flex-col items-center justify-center relative shrink-0">
          
          <div className="w-full max-w-[340px] flex flex-col h-full justify-center">
            
            {/* Form Header */}
            <div className="bg-[#0052cc] rounded-[24px] p-6 lg:p-8 pt-8 pb-12 relative overflow-hidden shadow-lg border border-white/10 mb-[-40px] z-20">
              <div className="absolute top-4 right-5">
                <button 
                  onClick={() => setIsFeedbackOpen(true)}
                  className="flex items-center gap-1.5 text-[8px] font-black text-white/90 uppercase tracking-widest hover:text-white transition-all bg-white/10 px-2.5 py-1 rounded-full"
                >
                  <Star className="w-2 h-2 fill-yellow-400 text-yellow-400" />
                  Give Feedback
                </button>
              </div>

              <h2 className="text-2xl font-black text-white mb-1.5 leading-tight">Welcome Back!</h2>
              <p className="text-blue-100/80 text-[10px] font-bold">Login to continue or sign up for a new account.</p>
              
              <div className="absolute bottom-[-20px] left-0 right-0 h-10 bg-white rounded-t-[32px] hidden lg:block"></div>
            </div>

            {/* Form Body Wrap */}
            <div className="bg-white rounded-[24px] px-6 pb-6 pt-12 lg:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-slate-100 relative z-10 overflow-y-auto max-h-full scrollbar-hide">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-slate-100 p-1 mb-6 h-10">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-full text-[12px] font-black h-8 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-full text-[12px] font-black h-8 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0 space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="login-email" className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Email or Mobile</Label>
                      <Input
                        id="login-email"
                        type="text"
                        placeholder="demo@gmail.com"
                        value={loginEmail}
                        onChange={handleLoginEmailChange}
                        required
                        className={`h-10 px-4 text-[13px] font-bold rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] transition-all ${loginEmailError ? 'border-red-400' : ''}`}
                      />
                    </div>

                    <div className="space-y-1">
                       <div className="flex items-center justify-between px-1">
                         <Label htmlFor="login-password" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Password</Label>
                         <a href="/forgot-password" d-id="forgot-password" className="text-[9px] text-[#0052cc] font-black hover:underline">
                           Forgot?
                         </a>
                       </div>
                       <Input
                         id="login-password"
                         type="password"
                         placeholder="••••••••"
                         value={loginPassword}
                         onChange={handleLoginPasswordChange}
                         required
                         className={`h-10 px-4 text-[13px] font-bold rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] transition-all ${loginPasswordError ? 'border-red-400' : ''}`}
                       />
                    </div>

                    <div className="flex items-center gap-2 py-0.5">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="w-4 h-4 rounded-full border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-none"
                      />
                      <Label htmlFor="remember" className="text-[11px] font-black text-slate-600 cursor-pointer">
                        Remember Me
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-black text-sm bg-[#00C853] hover:bg-[#00B248] shadow-[0_10px_20px_-5px_rgba(0,200,83,0.3)] text-white transition-all transform active:scale-[0.98]"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In"}
                    </Button>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <div className="w-1.2 h-1.2 rounded-full bg-[#34D399] animate-pulse"></div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secure & Encrypted Session</span>
                    </div>

                    <div className="text-center pt-3 border-t border-slate-50">
                      <p className="text-[8px] text-slate-400 font-bold leading-relaxed px-4">
                        By signing in, you agree to our <a href="#" className="text-slate-600 hover:underline">Terms</a> & <a href="#" className="text-slate-600 hover:underline">Privacy Policy</a>
                      </p>
                    </div>

                    {/* Social Auth */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                       <button type="button" className="flex items-center justify-center h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </button>

                      <button type="button" className="flex items-center justify-center h-9 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] transition-all shadow-sm">
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978 1.62 0 3.33.193 3.33.193v2.537h-1.3c-2.01 0-2.636 1.228-2.636 2.484v2.344h3.357l-.536 3.667h-2.821v7.98h-4.3z"/>
                        </svg>
                      </button>

                      <button type="button" className="flex items-center justify-center h-9 rounded-xl bg-[#0077b5] hover:bg-[#006ca4] transition-all shadow-sm">
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                          <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                        </svg>
                      </button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
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