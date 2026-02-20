import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function TermsOfService() {
  const [activeSection, setActiveSection] = React.useState("acceptance");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollPosition = window.scrollY + 100;

      sections.forEach(section => {
        const top = (section as HTMLElement).offsetTop;
        const height = (section as HTMLElement).offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(id || "acceptance");
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
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "description", title: "2. Description of Service" },
    { id: "accounts", title: "3. User Accounts" },
    { id: "use-policy", title: "4. Acceptable Use Policy" },
    { id: "fees", title: "5. Fees and Payment" },
    { id: "intellectual-property", title: "6. Intellectual Property" },
    { id: "compliance", title: "7. Compliance with Laws" },
    { id: "termination", title: "8. Termination" },
    { id: "liability", title: "9. Limitation of Liability" },
    { id: "contact", title: "10. Contact Us" },
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
              <h4 className="font-semibold mb-4 px-2 text-sm text-muted-foreground uppercase tracking-wider">Table of Contents</h4>
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
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight text-foreground">Terms of Service</h1>
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 w-fit px-3 py-1 rounded-full text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Last updated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">
              
              <section id="acceptance" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">01</span>
                  Acceptance of Terms
                </h2>
                <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using NotifyNow ("the Service"), you agree to comply with and be bound by these Terms of Service. 
                    If you do not agree to these terms, please do not use our Service. These terms apply to all visitors, users, and others who access the Service.
                  </p>
                </div>
              </section>

              <section id="description" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">02</span>
                  Description of Service
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  NotifyNow provides a multi-channel messaging platform that allows businesses to communicate with their customers via SMS, WhatsApp, and RCS. 
                  We provide tools for campaign management, automation, and analytics. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
                </p>
              </section>

              <section id="accounts" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">03</span>
                  User Accounts
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To use certain features of the Service, you must register for an account. You agree to:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Provide accurate and complete information",
                    "Maintain security of account details",
                    "Notify us of unauthorized use instantly",
                    "Limit access to authorized personnel"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm text-muted-foreground font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section id="use-policy" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">04</span>
                  Acceptable Use Policy
                </h2>
                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                  <p className="font-semibold text-red-600/80 mb-4 uppercase text-xs tracking-wider">Prohibited Actions</p>
                  <ul className="space-y-3">
                    {[
                      "Send unsolicited messages (spam) in violation of laws",
                      "Distribute unlawful, harmful, or abusive content",
                      "Impersonate any person or entity",
                      "Interfere with or disrupt the Service integrity",
                      "Attempt unauthorized access to systems"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                         <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
                         <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section id="fees" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">05</span>
                  Fees and Payment
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Some aspects of the Service may be provided for a fee. You agree to pay all fees associated with your use of the Service 
                  in accordance with the pricing and payment terms presented to you for that service. 
                  Fees are non-refundable unless otherwise stated in our Refund Policy.
                </p>
              </section>

              <section id="intellectual-property" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">06</span>
                  Intellectual Property
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of NotifyNow and its licensors. 
                  The Service is protected by copyright, trademark, and other laws.
                </p>
              </section>

              <section id="compliance" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">07</span>
                  Compliance with Laws
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You are responsible for ensuring that your use of the Service complies with all applicable laws and regulations, 
                  including but not limited to data protection laws (such as GDPR, CCPA) and telecommunications regulations (such as TCPA, TRAI regulations).
                </p>
              </section>

              <section id="termination" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">08</span>
                  Termination
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, 
                  under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
              </section>

              <section id="liability" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">09</span>
                  Limitation of Liability
                </h2>
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-muted-foreground leading-relaxed italic">
                    "In no event shall NotifyNow, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, 
                    incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
                    or other intangible losses..."
                  </p>
                </div>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-primary/20 text-3xl font-black">10</span>
                  Contact Us
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-8 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Have questions?</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Our support team is available to help you understand our terms and policies better.
                    </p>
                    <a 
                      href="mailto:support@notifynow.in" 
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                    >
                      Email Support
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
