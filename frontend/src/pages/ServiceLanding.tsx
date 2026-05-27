import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useBranding } from "../contexts/BrandingContext";
import { 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  Check, 
  MessageSquare, 
  Phone, 
  Grid, 
  MessageCircle, 
  Bot, 
  Users, 
  Code, 
  Clock, 
  Headphones, 
  Globe,
  Database,
  TrendingUp,
  User,
  ArrowUpRight,
  Layers,
  ShieldCheck,
  Zap
} from "lucide-react";

// Fallback logo URL if branding settings are not loaded
const DEFAULT_LOGO = "https://notifynow.in/assets/logo-full-BihHi4aR.png";

const ServiceLanding: React.FC = () => {
  const { settings } = useBranding();
  const brandName = settings?.brand_name || "NotifyNow";
  const logoUrl = settings?.logo_url || DEFAULT_LOGO;

  // Custom slow bobbing float animation for hero cards
  const floatAnimation = (delay: number) => ({
    y: [0, -10, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
      delay: delay
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans select-none">
      
      {/* ── BACKGROUND GLOW DECORATIONS ── */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-100/50 via-purple-50/30 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[200px] left-[-200px] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[100px] right-[-200px] w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── NAVIGATION NAVBAR ── */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain max-w-[180px]" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#home" className="hover:text-indigo-600 transition-colors">Home</a>
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#services" className="hover:text-indigo-600 transition-colors">Services</a>
          <a href="#developers" className="hover:text-indigo-600 transition-colors">Developers</a>
          <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/auth" className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
            Login
          </Link>
          <Link to="/auth" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30">
            Get Started
          </Link>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section id="home" className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Info Column */}
        <div className="lg:col-span-6 space-y-6 text-left">
          {/* Sparkle Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Channels. One Platform. Infinite Possibilities.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 leading-[1.15]">
            Connect. Automate. <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Grow with {brandName}
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
            Your all-in-one communication platform for Business Messaging, Customer Engagement, CRM, and more. Simplify conversations across RCS, WhatsApp, SMS, Voice and beyond.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/35 transition-all duration-300">
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all duration-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Book a Demo</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Easy Integration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Reliable & Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Scalable Platform</span>
            </div>
          </div>
        </div>

        {/* Right Circular Orbital Column */}
        <div className="lg:col-span-6 flex justify-center items-center relative h-[450px] sm:h-[500px]">
          
          {/* Concentric Orbital Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[380px] h-[380px] rounded-full border border-indigo-100/60 dark:border-indigo-900/10 flex items-center justify-center animate-[spin_50s_linear_infinite]" />
            <div className="absolute w-[260px] h-[260px] rounded-full border border-indigo-100/40 dark:border-indigo-900/10 flex items-center justify-center animate-[spin_35s_linear_infinite_reverse]" />
            <div className="absolute w-[140px] h-[140px] rounded-full border border-indigo-100/20 dark:border-indigo-900/10" />
          </div>

          {/* Central Logo Core */}
          <div className="absolute z-10 w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white ring-8 ring-white">
            <MessageSquare className="w-10 h-10 fill-current" />
          </div>

          {/* Floating Badges */}
          
          {/* Top: RCS Messaging */}
          <motion.div 
            className="absolute top-2 w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20"
            animate={floatAnimation(0)}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">RCS Messaging</div>
              <div className="text-[10px] text-slate-500 leading-tight">Rich Communication</div>
            </div>
          </motion.div>

          {/* Left: WhatsApp */}
          <motion.div 
            className="absolute left-[-15px] top-[150px] w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20"
            animate={floatAnimation(1)}
          >
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-500 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">WhatsApp</div>
              <div className="text-[10px] text-slate-500 leading-tight">Official & Unofficial API</div>
            </div>
          </motion.div>

          {/* Right: SMS */}
          <motion.div 
            className="absolute right-[-15px] top-[150px] w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20"
            animate={floatAnimation(2)}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">SMS</div>
              <div className="text-[10px] text-slate-500 leading-tight">Global SMS Messaging</div>
            </div>
          </motion.div>

          {/* Bottom Left: Voice */}
          <motion.div 
            className="absolute left-4 bottom-4 w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20"
            animate={floatAnimation(1.5)}
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Voice</div>
              <div className="text-[10px] text-slate-500 leading-tight">Voice Calls & IVR</div>
            </div>
          </motion.div>

          {/* Bottom Right: More Services */}
          <motion.div 
            className="absolute right-4 bottom-4 w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20"
            animate={floatAnimation(0.5)}
          >
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">More Services</div>
              <div className="text-[10px] text-slate-500 leading-tight">Email, Push, OTT</div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── OUR SERVICES SECTION ── */}
      <section id="services" className="relative z-10 bg-white border-y border-slate-100 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Our Services</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Everything You Need to Build Better Conversations
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Powerful multi-channel communication combined with smart automation for real, measurable results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* RCS Messaging */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center transition-colors group-hover:bg-emerald-500 group-hover:text-white duration-300">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">RCS Messaging</h3>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">✔ Rich Cards & Carousels</li>
                  <li className="flex items-center gap-2">✔ Verified Sender Brand Logo</li>
                  <li className="flex items-center gap-2">✔ Ultra High User Engagement</li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* WhatsApp Solutions */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center transition-colors group-hover:bg-green-500 group-hover:text-white duration-300">
                <MessageSquare className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">WhatsApp Solutions</h3>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">✔ Official Cloud API Settings</li>
                  <li className="flex items-center gap-2">✔ Unofficial QR Rotation API</li>
                  <li className="flex items-center gap-2">✔ Custom Chatbots & Workflows</li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* SMS Messaging */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center transition-colors group-hover:bg-blue-500 group-hover:text-white duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">SMS Messaging</h3>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">✔ Promotional Bulk Marketing</li>
                  <li className="flex items-center gap-2">✔ Transactional System Triggers</li>
                  <li className="flex items-center gap-2">✔ Swift OTP Alerts & Gateways</li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Voice Services */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center transition-colors group-hover:bg-purple-500 group-hover:text-white duration-300">
                <Phone className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Voice Services</h3>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">✔ Cloud Outbound Dialers</li>
                  <li className="flex items-center gap-2">✔ Smart IVR Menu Configurator</li>
                  <li className="flex items-center gap-2">✔ Automated Voice Broadcasting</li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* CRM Solutions */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center transition-colors group-hover:bg-orange-500 group-hover:text-white duration-300">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">CRM Solutions</h3>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">✔ Lead Flow Management</li>
                  <li className="flex items-center gap-2">✔ Demographics Segmentation</li>
                  <li className="flex items-center gap-2">✔ Conversions Analytics Reports</li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Web Development */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center transition-colors group-hover:bg-blue-500 group-hover:text-white duration-300">
                <Code className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Web Development</h3>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">✔ Custom Business Websites</li>
                  <li className="flex items-center gap-2">✔ Responsive SPA Web Apps</li>
                  <li className="flex items-center gap-2">✔ Dedicated REST API Integration</li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTEGRATED DASHBOARD PREVIEW SECTION ── */}
      <section id="features" className="relative z-10 py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {brandName.toUpperCase()} PLATFORM
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-snug">
              One Platform. <br />Unlimited Connections.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Simplify communication operations. {brandName} helps businesses of all sizes connect with customers on the right channel with the right message at the right time.
            </p>

            <ul className="space-y-3.5">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm font-medium">Unified Inbox for All Channels</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm font-medium">Automation & Chatbot Builder</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm font-medium">Real-time Analytics & Reporting</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm font-medium">Developer Friendly APIs & Hooks</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all duration-300">
                <span>Explore Platform</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Dashboard Mockup Column */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row h-[420px]">
            
            {/* Sidebar Mockup */}
            <div className="hidden md:flex flex-col bg-slate-900 text-slate-400 w-44 p-4 border-r border-slate-800 shrink-0 text-left">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-black">N</div>
                <span className="text-white text-xs font-bold">{brandName}</span>
              </div>
              <div className="space-y-3.5 text-[10px] font-semibold">
                <div className="flex items-center gap-2 text-white bg-slate-800/80 p-1.5 rounded-lg"><Layers className="w-3.5 h-3.5" /><span>Dashboard</span></div>
                <div className="flex items-center gap-2 hover:text-white p-1.5 rounded-lg transition-colors"><MessageCircle className="w-3.5 h-3.5" /><span>Conversations</span></div>
                <div className="flex items-center gap-2 hover:text-white p-1.5 rounded-lg transition-colors"><Sparkles className="w-3.5 h-3.5" /><span>Campaigns</span></div>
                <div className="flex items-center gap-2 hover:text-white p-1.5 rounded-lg transition-colors"><Users className="w-3.5 h-3.5" /><span>Contacts</span></div>
                <div className="flex items-center gap-2 hover:text-white p-1.5 rounded-lg transition-colors"><Bot className="w-3.5 h-3.5" /><span>Automation</span></div>
                <div className="flex items-center gap-2 hover:text-white p-1.5 rounded-lg transition-colors"><TrendingUp className="w-3.5 h-3.5" /><span>Analytics</span></div>
                <div className="flex items-center gap-2 hover:text-white p-1.5 rounded-lg transition-colors"><Grid className="w-3.5 h-3.5" /><span>Integrations</span></div>
              </div>
            </div>

            {/* Main Area Mockup */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
              
              {/* Mock Topbar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Overview Dashboard</h4>
                  <p className="text-[10px] text-slate-400">Live analytics performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600"><User className="w-3.5 h-3.5" /></div>
                  <span className="text-[10px] font-bold text-slate-700">Admin</span>
                </div>
              </div>

              {/* Stats Widgets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-left">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-semibold">Total Messages</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">125,680</div>
                  <div className="text-[8px] text-emerald-500 font-bold mt-0.5">▲ +12.5%</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-semibold">Delivered</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">118,560</div>
                  <div className="text-[8px] text-emerald-500 font-bold mt-0.5">▲ +10.2%</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-semibold">Read Rate</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">85,420</div>
                  <div className="text-[8px] text-emerald-500 font-bold mt-0.5">▲ +8.7%</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-semibold">Replies</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">32,450</div>
                  <div className="text-[8px] text-emerald-500 font-bold mt-0.5">▲ +15.3%</div>
                </div>
              </div>

              {/* Lower Section (Chart + Logs) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch h-full">
                
                {/* SVG Donut Chart */}
                <div className="sm:col-span-5 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-2">
                  <div className="text-[9px] text-slate-500 font-bold text-left w-full">Channel Overview</div>
                  <div className="relative flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-18 h-18 sm:w-20 sm:h-20 transform -rotate-90">
                      {/* WhatsApp (45%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#22c55e" strokeWidth="12" strokeDasharray="107.4 238.7" strokeDashoffset="0" />
                      {/* SMS (25%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="12" strokeDasharray="59.7 238.7" strokeDashoffset="-107.4" />
                      {/* RCS (15%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="35.8 238.7" strokeDashoffset="-167.1" />
                      {/* Voice (10%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="23.9 238.7" strokeDashoffset="-202.9" />
                      {/* Others (5%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="12" strokeDasharray="11.9 238.7" strokeDashoffset="-226.8" />
                    </svg>
                    <div className="absolute text-[8px] font-bold text-slate-700">125K total</div>
                  </div>
                </div>

                {/* Recent Logs list */}
                <div className="sm:col-span-7 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between text-left">
                  <div className="text-[9px] text-slate-500 font-bold mb-2">Recent Conversations</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] border-b border-slate-50 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="font-semibold text-slate-700">+91 98765 43210</span>
                      </div>
                      <span className="text-[8px] text-slate-400">2m ago</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] border-b border-slate-50 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="font-semibold text-slate-700">+91 81234 56789</span>
                      </div>
                      <span className="text-[8px] text-slate-400">5m ago</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-700">+91 87654 32109</span>
                      </div>
                      <span className="text-[8px] text-slate-400">10m ago</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ── TRUSTED BY SECTION ── */}
      <section className="relative z-10 py-12 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Trusted by Businesses Across Industries
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300">
            <span className="text-base font-bold text-slate-600 tracking-tight">🛒 EcomKart</span>
            <span className="text-base font-bold text-slate-600 tracking-tight">✈️ TRAVELGO</span>
            <span className="text-base font-bold text-slate-600 tracking-tight">🎓 EduSmart</span>
            <span className="text-base font-bold text-slate-600 tracking-tight">🏥 HealthCare+</span>
            <span className="text-base font-bold text-slate-600 tracking-tight">🛍️ RetailHub</span>
            <span className="text-base font-bold text-slate-600 tracking-tight">📈 FinServe</span>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS STATS SECTION ── */}
      <section className="relative z-10 py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          
          <div className="space-y-1 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">10,000+</div>
            <div className="text-xs text-slate-500 font-semibold">Active Businesses</div>
          </div>

          <div className="space-y-1 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">50M+</div>
            <div className="text-xs text-slate-500 font-semibold">Messages Delivered</div>
          </div>

          <div className="space-y-1 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">99.9%</div>
            <div className="text-xs text-slate-500 font-semibold">Gateway Uptime</div>
          </div>

          <div className="space-y-1 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">24/7</div>
            <div className="text-xs text-slate-500 font-semibold">Customer Support</div>
          </div>

        </div>
      </section>

      {/* ── CTA BANNER FOOTER SECTION ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-indigo-500/10 flex flex-col lg:flex-row items-center justify-between gap-8 text-left relative overflow-hidden">
          
          {/* Subtle background glow bubbles inside CTA */}
          <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

          <div className="space-y-4 max-w-xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight">
                Ready to Transform Your Customer Communication?
              </h3>
            </div>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Join thousands of fast-growing businesses who trust {brandName} to power their daily communications across the globe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto shrink-0 z-10">
            <Link to="/auth" className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 rounded-xl shadow-md transition-all duration-300">
              Get Started Free
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-300">
              Contact Sales
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
};

export default ServiceLanding;
