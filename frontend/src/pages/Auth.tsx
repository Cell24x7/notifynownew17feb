import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Loader2, Star, Mail, Eye, EyeOff } from 'lucide-react';
import { EmailSignup } from '@/components/auth/EmailSignup';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { PasswordCreation } from '@/components/auth/PasswordCreation';
import { WelcomePopup } from '@/components/auth/WelcomePopup';
import { useBranding } from '@/contexts/BrandingContext';
import { FeedbackDialog } from '@/components/auth/FeedbackDialog';
import { TestimonialSlider } from '@/components/auth/TestimonialSlider';
import logo from '@/assets/logo-full.png';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user, authenticateWithToken } = useAuth();
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
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);



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

  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Initialize Facebook SDK
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID || '911577051771273';
    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({
        appId: fbAppId,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (data.success && data.token) {
          // Use the new authenticateWithToken function to set state correctly
          authenticateWithToken(data.token, data.user);
          
          setShowWelcome(true);
          
          // Small delay for the welcome popup before redirecting
          setTimeout(() => {
            if (data.user.role === 'admin' || data.user.role === 'reseller') {
              navigate('/super-admin/dashboard', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }, 2000);
        } else {
          toast({
            title: 'Google Login Failed',
            description: data.message || 'Something went wrong',
            variant: 'destructive',
          });
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Could not connect to server',
          variant: 'destructive',
        });
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast({
        title: 'Google Login Cancelled',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const handleLinkedInLogin = () => {
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID || '786x0ghymovi1f';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/linkedin/callback');
    const scope = encodeURIComponent('openid profile email');
    const state = Math.random().toString(36).substring(7);

    const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    window.location.href = linkedinUrl;
  };

  const handleFacebookLogin = () => {
    if (!(window as any).FB) return;
    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        processFacebookLogin(response.authResponse.accessToken);
      } else {
        toast({
          title: 'Facebook Login Cancelled',
          description: 'Login process was interrupted',
          variant: 'destructive',
        });
      }
    }, { scope: 'public_profile,email' });
  };

  const processFacebookLogin = async (accessToken: string) => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        authenticateWithToken(data.token, data.user);
        setShowWelcome(true);
        setTimeout(() => {
          if (data.user.role === 'admin' || data.user.role === 'reseller') {
            navigate('/super-admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 2000);
      } else {
        throw new Error(data.message || 'Facebook verification failed');
      }
    } catch (err: any) {
      toast({
        title: 'Facebook Login Failed',
        description: err.message,
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

  if (isAuthenticated && !showWelcome) {
    if (user?.role === 'admin' || user?.role === 'reseller' || user?.role === 'superadmin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-[#f8faff] flex items-center justify-center p-0 font-['Inter',_sans-serif] overflow-y-auto py-0">
      {/* Decorative Circles Background with Heavy Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[-5%] w-[400px] h-[400px] bg-[#0052cc]/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-[#0052cc]/15 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[450px] h-[450px] bg-[#0052cc]/10 rounded-full blur-[90px]"></div>
        <div className="absolute top-[-5%] right-[15%] w-[350px] h-[350px] bg-[#0052cc]/10 rounded-full blur-[70px]"></div>
      </div>

      {/* Main Container - Optimized for 100% Zoom & Mobile */}
      <div className="relative z-10 w-full lg:max-w-none lg:min-h-screen bg-white overflow-hidden flex flex-col lg:flex-row shadow-none border-none">
        
        {/* Left Interactive Section */}
        <div className="w-full lg:w-[50%] bg-[#0052cc] p-8 lg:p-12 flex flex-col relative overflow-hidden shrink-0 min-h-[500px] lg:min-h-screen">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:mb-8">
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
            <span className="text-lg font-black text-white tracking-tight">{settings?.brand_name || "NotifyNow"}</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34D399]/20 border border-[#34D399]/30 text-[#34D399] font-bold text-[9px] mb-2 w-fit uppercase tracking-wider">
            <div className="relative w-1 h-1">
              <span className="absolute inset-0 bg-[#34D399] rounded-full animate-ping"></span>
              <span className="relative block w-1 h-1 bg-[#34D399] rounded-full"></span>
            </div>
            Go Live Today : FREE WhatsApp Business API
          </div>

          {/* Main Titles */}
          <div className="flex-grow flex flex-col justify-center">
            <h1 className="text-xl lg:text-3xl font-extrabold text-white leading-tight mb-2">
              Intelligent Messaging Across<br />
              <span className="text-white">SMS | </span>
              <span className="text-[#34D399]">WhatsApp</span>
              <span className="text-white"> | RCS</span>
            </h1>

            <p className="text-sm lg:text-base font-bold text-white mb-2">
              Drive Business Growth with <span className="text-[#34D399]">AI-Powered</span> Conversations
            </p>

            <p className="text-[11px] lg:text-xs text-blue-50/80 max-w-sm mb-4 leading-relaxed">
              Engage customers faster with official WhatsApp API, 
              bulk campaigns, and seamless automations in one powerful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-2.5 mb-4">
              <a
                href="tel:+919892975484"
                className="px-5 py-2.5 rounded-xl bg-[#00C853] text-white font-black text-[12px] shadow-[0_8px_20px_-6px_rgba(0,200,83,0.4)] hover:bg-[#00B248] transition-all flex items-center gap-2"
              >
                <Phone className="w-3.5 h-3.5 fill-white text-white" />
                Call Now
              </a>

              <a
                href="mailto:notify@notifynow.in"
                className="px-5 py-2.5 rounded-xl bg-white text-[#0052cc] font-black text-[12px] shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                Email Now
              </a>
            </div>
          </div>

          {/* Testimonial Box */}
          <div className="mt-auto">
            <TestimonialSlider />
          </div>

          {/* Decorative Elements inside Panel */}
          <div className="absolute bottom-[-100px] right-[-80px] w-[280px] h-[280px] bg-white/5 rounded-full pointer-events-none"></div>
        </div>

        {/* Right Form Section */}
        <div className="w-full lg:w-[50%] bg-white p-6 lg:p-12 flex flex-col items-center justify-center relative shrink-0 min-h-screen">
          
          <div className="w-full max-w-[420px] flex flex-col justify-center">
            
            {/* Form Header */}
              <div className="absolute top-4 right-5">
                <button 
                  onClick={() => setIsFeedbackOpen(true)}
                  className="flex items-center gap-1 text-[7px] font-black text-white/90 uppercase tracking-widest hover:text-white transition-all bg-white/10 px-2 py-0.5 rounded-full"
                >
                  <Star className="w-2 h-2 fill-yellow-400 text-yellow-400" />
                  Give Feedback
                </button>
              </div>

              <h2 className="text-lg font-black text-white mb-0.5 leading-tight tracking-tight">Welcome Back!</h2>
              <p className="text-blue-100/70 text-[8px] font-bold uppercase tracking-wide">Login to continue or sign up</p>
              
              <div className="absolute bottom-[-20px] left-0 right-0 h-10 bg-white rounded-t-[32px] hidden lg:block"></div>
            </div>

            {/* Form Body Wrap */}
            <div className="bg-white rounded-[24px] px-5 pb-5 pt-10 lg:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-slate-50 relative z-10">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-slate-50 p-1 mb-5 h-9">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-full text-[11px] font-black h-7 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-full text-[11px] font-black h-7 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0 space-y-3.5">
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="login-email" className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Email / Mobile</Label>
                      <Input
                        id="login-email"
                        type="text"
                        placeholder="Enter email or mobile"
                        value={loginEmail}
                        onChange={handleLoginEmailChange}
                        required
                        className={`h-9 px-4 text-[12px] font-normal rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-[#0052cc]/10 focus:border-[#0052cc] transition-all ${loginEmailError ? 'border-red-400' : ''}`}
                      />
                    </div>

                    <div className="space-y-1">
                       <div className="flex items-center justify-between px-1">
                         <Label htmlFor="login-password" className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Password</Label>
                         <a href="/forgot-password" d-id="forgot-password" className="text-[8px] text-[#0052cc] font-black hover:underline uppercase tracking-tighter">
                           Forgot?
                         </a>
                       </div>
                       <div className="relative">
                         <Input
                           id="login-password"
                           type={showPassword ? "text" : "password"}
                           placeholder="Enter your password"
                           value={loginPassword}
                           onChange={handleLoginPasswordChange}
                           required
                           className={`h-9 pl-4 pr-10 text-[12px] font-normal rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-[#0052cc]/10 focus:border-[#0052cc] transition-all ${loginPasswordError ? 'border-red-400' : ''}`}
                         />
                         <button
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                         >
                           {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                         </button>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 py-0">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="w-4 h-4 rounded-full border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <Label htmlFor="remember" className="text-[10px] font-black text-slate-500 cursor-pointer">
                        Remember Me
                      </Label>
                    </div>

                    <div className="flex items-start gap-3 pt-4 border-t border-slate-50">
                      <Checkbox
                        id="terms-check"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        className="w-4 h-4 mt-0.5 rounded border-2 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all"
                      />
                      <Label htmlFor="terms-check" className="text-[11px] text-slate-500 font-medium leading-relaxed cursor-pointer select-none">
                        By signing in, I agree to the <a href="/terms" className="text-[#0052cc] font-bold hover:underline">Terms of Service</a> and <a href="/privacy" className="text-[#0052cc] font-bold hover:underline">Privacy Policy</a>
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-black text-xs bg-[#00C853] hover:bg-[#00B248] shadow-[0_10px_20px_-5px_rgba(0,200,83,0.3)] text-white transition-all transform active:scale-[0.98] mt-2"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In"}
                    </Button>

                    <div className="flex items-center justify-center gap-2 pt-1 pb-2">
                      <div className="w-1 h-1 rounded-full bg-[#34D399] animate-pulse"></div>
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Secure & Encrypted Session</span>
                    </div>

                    {/* Social Auth - Uniform & Centered */}
                    <div className="pt-4 border-t border-slate-50">
                      <div className="grid grid-cols-3 gap-3">
                        <button type="button" onClick={() => handleGoogleLogin()} disabled={googleLoading} className="flex items-center justify-center h-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm group disabled:opacity-50">
                           {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (
                           <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                             <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                             <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                             <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                             <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                           </svg>
                           )}
                         </button>

                        <button type="button" onClick={handleFacebookLogin} className="flex items-center justify-center h-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm group">
                          <svg className="w-5 h-5 fill-[#1877f2] transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </button>

                        <button type="button" onClick={handleLinkedInLogin} className="flex items-center justify-center h-10 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm group">
                          <svg className="w-5 h-5 fill-[#0077b5] transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                            <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <div className="space-y-3">
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