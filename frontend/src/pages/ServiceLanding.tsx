import React from "react";
import { Link } from "react-router-dom";
import { ServiceCard } from "../components/ServiceCard";
import { motion } from "framer-motion";

// Icon imports (adjust paths if needed)
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

const ServiceLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-landing-gradient dark:bg-gray-900 flex flex-col items-center p-6">
      {/* Preoro logo for light mode */}
      <img src={preoroLogo} alt="Preoro" className="mb-8 hidden dark:hidden" />

      <motion.div
        className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
          },
        }}
      >
        {services.map((svc) => (
          <ServiceCard key={svc.title} icon={svc.icon} title={svc.title} />
        ))}
      </motion.div>

      <Link to="/auth" className="mt-8">
        <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">
          Login
        </button>
      </Link>
    </div>
  );
};

export default ServiceLanding;
