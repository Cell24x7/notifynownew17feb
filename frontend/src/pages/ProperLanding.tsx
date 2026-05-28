import React from "react";
import { Link } from "react-router-dom";
import { ServiceCard } from "../components/ServiceCard";
import { motion } from "framer-motion";

// Icon imports – ensure these SVGs exist in assets/icons
import whatsappIcon from "../assets/icons/whatsapp.svg";
import smsIcon from "../assets/icons/sms.svg";
import rcsIcon from "../assets/icons/rcs.svg";
import unofficialIcon from "../assets/icons/unofficial_whatsapp.svg";
import callCenterIcon from "../assets/icons/call_center.svg";
import crmIcon from "../assets/icons/crm.svg";
import webDevIcon from "../assets/icons/web_dev.svg";
import preoroLogo from "../assets/veloxaio.png";

const services = [
  { title: "WhatsApp", icon: whatsappIcon },
  { title: "SMS", icon: smsIcon },
  { title: "RCS", icon: rcsIcon },
  { title: "Unofficial WhatsApp", icon: unofficialIcon },
  { title: "Call Center", icon: callCenterIcon },
  { title: "CRM", icon: crmIcon },
  { title: "Web Development", icon: webDevIcon },
];

const ProperLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-landing-gradient dark:bg-gray-900 flex flex-col items-center p-6">
      {/* Logo */}
      <img src={preoroLogo} alt="Notifynow" className="mb-8 w-32 h-32" />

      {/* Hero Section – 12‑column responsive grid */}
      <div className="grid w-full max-w-7xl grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left side – heading, subtitle, buttons, services */}
        <div className="lg:col-span-6 space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            Connect. Automate. Grow with Omnichannla
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-lg">
            One platform for RCS, WhatsApp, SMS, Voice, CRM and Automation.
          </p>
          <div className="flex space-x-4">
            <Link to="/auth">
              <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">
                Get Started
              </button>
            </Link>
            <Link to="/demo">
              <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors">
                Book Demo
              </button>
            </Link>
          </div>

          {/* Services grid – 2‑column on small, 3‑column on medium */}
          <motion.div
            className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
          >
            {services.map((svc) => (
              <ServiceCard key={svc.title} icon={svc.icon} title={svc.title} />
            ))}
          </motion.div>
        </div>

        {/* Right side – illustrative image */}
        <div className="lg:col-span-6 flex justify-center">
          <img
            src="https://via.placeholder.com/600x400.png?text=Omnichannla+Dashboard"
            alt="Omnichannla dashboard preview"
            className="rounded-lg shadow-lg w-full max-w-md object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default ProperLanding;
