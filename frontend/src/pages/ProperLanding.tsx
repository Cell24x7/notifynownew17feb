import React from "react";
import { Link } from "react-router-dom";
import { ServiceCard } from "../components/ServiceCard";
import { motion } from "framer-motion";

// Icon imports
import whatsappIcon from "../assets/icons/whatsapp.svg";
import smsIcon from "../assets/icons/sms.svg";
import rcsIcon from "../assets/icons/rcs.svg";
import unofficialIcon from "../assets/icons/unofficial_whatsapp.svg";
import callCenterIcon from "../assets/icons/call_center.svg";
import crmIcon from "../assets/icons/crm.svg";
import webDevIcon from "../assets/icons/web_dev.svg";
import preoroLogo from "../assets/logo.png";

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

      {/* Services Grid */}
      <motion.div
        className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
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

      {/* Separate Login Section */}
      <div className="mt-12">
        <Link to="/auth">
          <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">
            Login to Notifynow
          </button>
        </Link>
      </div>
    </div>
  );
};

export default ProperLanding;
