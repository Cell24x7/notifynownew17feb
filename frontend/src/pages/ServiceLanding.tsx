import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBranding } from "../contexts/BrandingContext";
import defaultLogo from "@/assets/logonotify.jpeg";
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
  Layers,
  ShieldCheck,
  Zap,
  Menu,
  X,
  User,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";

// Fallback logo if branding settings are not loaded
const DEFAULT_LOGO = defaultLogo;

const ServiceLanding: React.FC = () => {
  const { settings } = useBranding();
  const brandName = settings?.brand_name || "NotifyNow";
  const logoUrl = settings?.logo_url || DEFAULT_LOGO;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-[#fafbfe] text-slate-900 overflow-x-hidden font-sans select-none relative">
      
      {/* Injecting custom keyframes for premium background grid & float animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .tech-grid {
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(99, 102, 241, 0.04) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
        }
        .orbital-rotate-cw {
          animation: spin-cw 60s linear infinite;
        }
        .orbital-rotate-ccw {
          animation: spin-ccw 40s linear infinite;
        }
        @keyframes spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}} />

      {/* ── BACKGROUND ART & GRID ── */}
      <div className="absolute inset-0 tech-grid pointer-events-none z-0" />
      <div className="absolute top-0 inset-x-0 h-[700px] bg-gradient-to-b from-indigo-100/40 via-purple-50/20 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[15%] left-[-10%] w-[500px] h-[500px] bg-blue-300/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute top-[5%] right-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse" />

      {/* ── NAVIGATION NAVBAR (STICKY + GLASSMORPHISM) ── */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-95 transition-opacity">
            <img 
              src={logoUrl} 
              alt={brandName} 
              onError={(e) => {
                e.currentTarget.src = DEFAULT_LOGO;
              }}
              className="h-16 sm:h-20 md:h-24 w-auto object-contain max-w-[240px] -my-6" 
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#home" className="hover:text-blue-600 transition-colors">Home</a>
            <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#stats" className="hover:text-blue-600 transition-colors">Why Us</a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/auth" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link to="/auth" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300">
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200/50 bg-white/95 backdrop-blur-lg overflow-hidden"
            >
              <div className="px-4 py-5 space-y-4 text-left">
                <a 
                  href="#home" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-100"
                >
                  Home
                </a>
                <a 
                  href="#services" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-100"
                >
                  Services
                </a>
                <a 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-100"
                >
                  Features
                </a>
                <a 
                  href="#stats" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-100"
                >
                  Why Us
                </a>

                <div className="flex flex-col gap-3 pt-4">
                  <Link 
                    to="/auth" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-3 text-center text-sm font-bold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/auth" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-3 text-center text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO SECTION ── */}
      <section id="home" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        
        {/* Left Column (Hero Content) */}
        <div className="lg:col-span-6 space-y-6 text-left">
          
          {/* Sparkle Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>All Channels. One Platform. Infinite Possibilities.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black text-slate-900 leading-[1.12] tracking-tight">
            Connect. Automate. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Grow with {brandName}
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
            Your all-in-one communication platform for Business Messaging, Customer Engagement, CRM, and more. Simplify conversations across RCS, WhatsApp, SMS, Voice and beyond.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/35 transition-all duration-300">
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm transition-all duration-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Book a Demo</span>
            </Link>
          </div>

          {/* Checks Strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 text-xs font-bold text-slate-500 border-t border-slate-200/60 lg:border-none">
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
              <span>Easy Integration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
              <span>Reliable & Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
              <span>Scalable Platform</span>
            </div>
          </div>
        </div>

        {/* Right Column (Circular Orbital Illustration) */}
        <div className="lg:col-span-6 flex justify-center items-center relative h-[360px] sm:h-[450px] md:h-[500px] w-full max-w-[500px] mx-auto overflow-visible select-none">
          
          {/* Concentric Faint Orbital Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-75 sm:scale-100">
            <div className="w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-full border border-indigo-100/60 dark:border-indigo-900/10 flex items-center justify-center orbital-rotate-cw" />
            <div className="absolute w-[230px] h-[230px] sm:w-[260px] sm:h-[260px] rounded-full border border-indigo-100/40 dark:border-indigo-900/10 flex items-center justify-center orbital-rotate-ccw" />
            <div className="absolute w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full border border-indigo-100/20 dark:border-indigo-900/10" />
          </div>

          {/* Central Pulsing Logo Badge */}
          <div className="absolute z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-indigo-500/35 flex items-center justify-center text-white ring-8 ring-white transform hover:scale-105 transition-transform duration-300">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 fill-current animate-pulse" />
          </div>

          {/* Responsive Scaling Wrapper for Outer Badges */}
          <div className="absolute inset-0 scale-90 sm:scale-100">
            
            {/* Top: RCS Messaging */}
            <motion.div 
              className="absolute top-1 sm:top-2 left-1/2 transform -translate-x-1/2 w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20 hover:scale-[1.03] transition-all"
              animate={floatAnimation(0)}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">RCS Messaging</div>
                <div className="text-[10px] text-slate-500 leading-tight">Rich Communication</div>
              </div>
            </motion.div>

            {/* Middle Left: WhatsApp */}
            <motion.div 
              className="absolute left-1 sm:left-[-15px] top-[130px] sm:top-[150px] w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20 hover:scale-[1.03] transition-all"
              animate={floatAnimation(1.2)}
            >
              <div className="w-9 h-9 rounded-lg bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">WhatsApp</div>
                <div className="text-[10px] text-slate-500 leading-tight">Official & Unofficial API</div>
              </div>
            </motion.div>

            {/* Middle Right: SMS */}
            <motion.div 
              className="absolute right-1 sm:right-[-15px] top-[130px] sm:top-[150px] w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20 hover:scale-[1.03] transition-all"
              animate={floatAnimation(2.4)}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">SMS</div>
                <div className="text-[10px] text-slate-500 leading-tight">Global SMS Messaging</div>
              </div>
            </motion.div>

            {/* Bottom Left: Voice */}
            <motion.div 
              className="absolute left-6 bottom-4 w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20 hover:scale-[1.03] transition-all"
              animate={floatAnimation(1.8)}
            >
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 fill-current" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">Voice</div>
                <div className="text-[10px] text-slate-500 leading-tight">Voice Calls & IVR</div>
              </div>
            </motion.div>

            {/* Bottom Right: More Services */}
            <motion.div 
              className="absolute right-6 bottom-4 w-[160px] sm:w-[180px] bg-white border border-slate-100 rounded-xl p-3.5 shadow-md flex items-center gap-3 z-20 hover:scale-[1.03] transition-all"
              animate={floatAnimation(0.6)}
            >
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <Grid className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">More Services</div>
                <div className="text-[10px] text-slate-500 leading-tight">Email, Push, OTT</div>
              </div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* ── OUR SERVICES SECTION ── */}
      <section id="services" className="relative z-10 bg-white border-y border-slate-200/50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-600">
              Our Services
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 tracking-tight leading-tight">
              Everything You Need to Build Better Conversations
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Powerful multi-channel communication combined with smart automation for real, measurable results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* RCS Messaging */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center transition-colors group-hover:bg-emerald-500 group-hover:text-white duration-300">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">RCS Messaging</h3>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Rich Cards & Carousels
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Verified Sender Brand Logo
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Ultra High User Engagement
                  </li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* WhatsApp Solutions */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center transition-colors group-hover:bg-green-500 group-hover:text-white duration-300">
                <MessageSquare className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">WhatsApp Solutions</h3>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Official Cloud API Settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Unofficial QR Rotation API
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Custom Chatbots & Workflows
                  </li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* SMS Messaging */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center transition-colors group-hover:bg-blue-500 group-hover:text-white duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">SMS Messaging</h3>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Promotional Bulk Marketing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Transactional System Triggers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Swift OTP Alerts & Gateways
                  </li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Voice Services */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center transition-colors group-hover:bg-purple-500 group-hover:text-white duration-300">
                <Phone className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">Voice Services</h3>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Cloud Outbound Dialers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Smart IVR Menu Configurator
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Automated Voice Broadcasting
                  </li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* CRM Solutions */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center transition-colors group-hover:bg-orange-500 group-hover:text-white duration-300">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">CRM Solutions</h3>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Lead Flow Management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Demographics Segmentation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Conversions Analytics Reports
                  </li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Web Development */}
            <div className="group border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-7 text-left space-y-5 bg-white">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center transition-colors group-hover:bg-blue-500 group-hover:text-white duration-300">
                <Code className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">Web Development</h3>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Custom Business Websites
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Responsive SPA Web Apps
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">✔</span> Dedicated REST API Integration
                  </li>
                </ul>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTEGRATED DASHBOARD PREVIEW SECTION ── */}
      <section id="features" className="relative z-10 py-20 md:py-28 bg-[#fafbfe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-xs font-bold uppercase tracking-wider text-indigo-600">
              {brandName.toUpperCase()} PLATFORM
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-snug tracking-tight">
              One Platform. <br />Unlimited Connections.
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Simplify communication operations. {brandName} helps businesses of all sizes connect with customers on the right channel with the right message at the right time.
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm sm:text-base font-semibold">Unified Inbox for All Channels</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm sm:text-base font-semibold">Automation & Chatbot Builder</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm sm:text-base font-semibold">Real-time Analytics & Reporting</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-sm sm:text-base font-semibold">Developer Friendly APIs & Hooks</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all duration-300">
                <span>Explore Platform</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Simulated Responsive Dashboard Mockup */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col md:flex-row h-auto min-h-[420px] lg:h-[420px]">
            
            {/* Sidebar Mockup (Hidden on mobile for cleaner mockup design) */}
            <div className="hidden md:flex flex-col bg-slate-900 text-slate-400 w-44 p-4 border-r border-slate-800 shrink-0 text-left">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-black">N</div>
                <span className="text-white text-xs font-bold">{brandName}</span>
              </div>
              <div className="space-y-3 text-[10px] font-bold">
                <div className="flex items-center gap-2 text-white bg-slate-800/80 p-2 rounded-lg"><Layers className="w-3.5 h-3.5" /><span>Dashboard</span></div>
                <div className="flex items-center gap-2 hover:text-white p-2 rounded-lg transition-colors"><MessageCircle className="w-3.5 h-3.5" /><span>Conversations</span></div>
                <div className="flex items-center gap-2 hover:text-white p-2 rounded-lg transition-colors"><Sparkles className="w-3.5 h-3.5" /><span>Campaigns</span></div>
                <div className="flex items-center gap-2 hover:text-white p-2 rounded-lg transition-colors"><Users className="w-3.5 h-3.5" /><span>Contacts</span></div>
                <div className="flex items-center gap-2 hover:text-white p-2 rounded-lg transition-colors"><Bot className="w-3.5 h-3.5" /><span>Automation</span></div>
                <div className="flex items-center gap-2 hover:text-white p-2 rounded-lg transition-colors"><TrendingUp className="w-3.5 h-3.5" /><span>Analytics</span></div>
                <div className="flex items-center gap-2 hover:text-white p-2 rounded-lg transition-colors"><Grid className="w-3.5 h-3.5" /><span>Integrations</span></div>
              </div>
            </div>

            {/* Main Area Mockup */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
              
              {/* Mock Topbar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-850">Overview Dashboard</h4>
                  <p className="text-[10px] text-slate-400">Live analytics performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600"><User className="w-3.5 h-3.5" /></div>
                  <span className="text-[10px] font-bold text-slate-700">Admin</span>
                </div>
              </div>

              {/* Stats Widgets Grid (Collapses beautifully from 4 columns to 2 on small screens) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-left">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-bold">Total Messages</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">125,680</div>
                  <div className="text-[8px] text-emerald-500 font-extrabold mt-0.5">▲ +12.5%</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-bold">Delivered</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">118,560</div>
                  <div className="text-[8px] text-emerald-500 font-extrabold mt-0.5">▲ +10.2%</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-bold">Read Rate</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">85,420</div>
                  <div className="text-[8px] text-emerald-500 font-extrabold mt-0.5">▲ +8.7%</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-bold">Replies</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">32,450</div>
                  <div className="text-[8px] text-emerald-500 font-extrabold mt-0.5">▲ +15.3%</div>
                </div>
              </div>

              {/* Lower Section (Chart + Logs, stacks on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch h-full">
                
                {/* SVG Donut Chart */}
                <div className="sm:col-span-5 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-2">
                  <div className="text-[9px] text-slate-500 font-bold text-left w-full">Channel Overview</div>
                  <div className="relative flex items-center justify-center my-1">
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
                    <div className="absolute text-[8px] font-black text-slate-700">125K total</div>
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
      <section className="relative z-10 py-12 bg-white border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
            Trusted by Businesses Across Industries
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 md:gap-14 opacity-50 grayscale hover:grayscale-0 hover:opacity-85 transition-all duration-300">
            <span className="text-sm sm:text-base font-bold text-slate-600 tracking-tight">🛒 EcomKart</span>
            <span className="text-sm sm:text-base font-bold text-slate-600 tracking-tight">✈️ TRAVELGO</span>
            <span className="text-sm sm:text-base font-bold text-slate-600 tracking-tight">🎓 EduSmart</span>
            <span className="text-sm sm:text-base font-bold text-slate-600 tracking-tight">🏥 HealthCare+</span>
            <span className="text-sm sm:text-base font-bold text-slate-600 tracking-tight">🛍️ RetailHub</span>
            <span className="text-sm sm:text-base font-bold text-slate-600 tracking-tight">📈 FinServe</span>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS STATS SECTION ── */}
      <section id="stats" className="relative z-10 py-16 md:py-24 bg-white border-b border-slate-200/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          
          <div className="space-y-2 text-center">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Users className="w-5.5 h-5.5" />
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">10,000+</div>
            <div className="text-xs sm:text-sm text-slate-500 font-bold">Active Businesses</div>
          </div>

          <div className="space-y-2 text-center">
            <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
              <MessageSquare className="w-5.5 h-5.5" />
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">50M+</div>
            <div className="text-xs sm:text-sm text-slate-500 font-bold">Messages Delivered</div>
          </div>

          <div className="space-y-2 text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">99.9%</div>
            <div className="text-xs sm:text-sm text-slate-500 font-bold">Gateway Uptime</div>
          </div>

          <div className="space-y-2 text-center">
            <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Headphones className="w-5.5 h-5.5" />
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">24/7</div>
            <div className="text-xs sm:text-sm text-slate-500 font-bold">Customer Support</div>
          </div>

        </div>
      </section>

      {/* ── CTA BANNER FOOTER SECTION ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 lg:p-16 text-white shadow-xl shadow-indigo-500/10 flex flex-col lg:flex-row items-center justify-between gap-8 text-left relative overflow-hidden">
          
          {/* Decorative glowing bubbles inside CTA box */}
          <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

          <div className="space-y-4 max-w-xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                Ready to Transform Your Customer Communication?
              </h3>
            </div>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Join thousands of fast-growing businesses who trust {brandName} to power their daily communications across the globe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto shrink-0 z-10">
            <Link to="/auth" className="inline-flex items-center justify-center px-7 py-4 text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 rounded-xl shadow-md transition-all duration-300">
              Get Started Free
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center px-7 py-4 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-300">
              Contact Sales
            </Link>
          </div>

        </div>
      </section>

      {/* ── FOOTER COPYRIGHT ── */}
      <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-center text-xs font-semibold text-slate-400">
        <p>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default ServiceLanding;
