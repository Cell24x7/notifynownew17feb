import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = React.useState("introduction");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollPosition = window.scrollY + 100;

      sections.forEach(section => {
        const top = (section as HTMLElement).offsetTop;
        const height = (section as HTMLElement).offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(id || "introduction");
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  const sections = [
    { id: "introduction", title: "1. Introduction" },
    { id: "collection", title: "2. Information We Collect" },
    { id: "usage", title: "3. How We Use Your Information" },
    { id: "disclosure", title: "4. Disclosure of Information" },
    { id: "security", title: "5. Data Security" },
    { id: "rights", title: "6. Your Rights" },
    { id: "cookies", title: "7. Cookies" },
    { id: "changes", title: "8. Changes to Policy" },
    { id: "contact", title: "9. Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-background/50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="NotifyNow" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-bold text-xl tracking-tight">NotifyNow</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 space-y-1">
              <h4 className="font-semibold mb-4 px-2 text-sm text-muted-foreground uppercase tracking-wider">Privacy & Data</h4>
              <nav className="space-y-1 border-l">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-all border-l-2 -ml-[2px] hover:text-primary",
                      activeSection === section.id 
                        ? "border-primary text-primary font-medium bg-primary/5" 
                        : "border-transparent text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-3xl mx-auto lg:mx-0">
            <div className="mb-12">
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight text-foreground">Privacy Policy</h1>
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 w-fit px-3 py-1 rounded-full text-sm">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Last updated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">
              
              <section id="introduction" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">01</span>
                  Introduction
                </h2>
                <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
                  <p className="text-muted-foreground leading-relaxed">
                    NotifyNow ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website 
                    or use our services.
                  </p>
                </div>
              </section>

              <section id="collection" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">02</span>
                  Information We Collect
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We collect information to provide better services to all our users.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { title: "Personal Data", desc: "Name, email, phone, company details" },
                    { title: "Usage Data", desc: "Access times, pages viewed, device IP" },
                    { title: "Campaign Data", desc: "Message content, recipient numbers" },
                    { title: "Payment Info", desc: "Processed securely via third-parties" }
                  ].map((item, i) => (
                    <div key={i} className="p-5 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/20 transition-colors">
                      <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="usage" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">03</span>
                  How We Use Your Information
                </h2>
                <ul className="space-y-3">
                  {[
                    "Provide, operate, and maintain our Service",
                    "Improve, personalize, and expand our Service",
                    "Understand and analyze how you use our Service",
                    "Develop new products, services, features, and functionality",
                    "Facilitate the sending of your campaigns",
                    "Communicate with you regarding updates and support",
                    "Prevent fraudulent transactions and monitor against theft"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground bg-card p-3 rounded-lg border border-border/40">
                       <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                       <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section id="disclosure" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">04</span>
                  Disclosure of Information
                </h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <h4 className="font-semibold text-blue-600 mb-1">Service Providers</h4>
                    <p className="text-sm text-muted-foreground">We share info with vendors who perform services on our behalf.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <h4 className="font-semibold text-orange-600 mb-1">Legal Requirements</h4>
                    <p className="text-sm text-muted-foreground">If required by law, we may disclose your information to authorities.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <h4 className="font-semibold text-purple-600 mb-1">Business Transfers</h4>
                    <p className="text-sm text-muted-foreground">Data may be transferred during mergers, sales, or acquisitions.</p>
                  </div>
                </div>
              </section>

              <section id="security" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">05</span>
                  Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use administrative, technical, and physical security measures to help protect your personal information. 
                  While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, 
                  no security measures are perfect or impenetrable.
                </p>
              </section>

              <section id="rights" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">06</span>
                  Your Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Depending on your location, you may have rights regarding your personal data, including the right to access, correct, delete, 
                  or restrict the use of your data.
                </p>
              </section>

              <section id="cookies" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">07</span>
                  Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. 
                  You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
              </section>

              <section id="changes" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">08</span>
                  Changes to Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. 
                  You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">09</span>
                  Contact Us
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-8 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Data Privacy Inquiry?</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Contact our Data Protection Officer for any concerns regarding your personal data.
                    </p>
                    <a 
                      href="mailto:privacy@notifynow.in" 
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                    >
                      Contact Privacy Team
                    </a>
                  </div>
                </div>
              </section>

            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NotifyNow. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
