import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ServiceCard } from "../components/ServiceCard";
import preoroLogo from "../assets/logo.png";

import whatsappIcon from "../assets/icons/whatsapp.svg";
import smsIcon from "../assets/icons/sms.svg";
import rcsIcon from "../assets/icons/rcs.svg";
import unofficialIcon from "../assets/icons/unofficial_whatsapp.svg";
import callCenterIcon from "../assets/icons/call_center.svg";
import crmIcon from "../assets/icons/crm.svg";
import webDevIcon from "../assets/icons/web_dev.svg";

const services = [
  { title: "WhatsApp", icon: whatsappIcon },
  { title: "SMS", icon: smsIcon },
  { title: "RCS", icon: rcsIcon },
  { title: "Unofficial WhatsApp", icon: unofficialIcon },
  { title: "Call Center", icon: callCenterIcon },
  { title: "CRM", icon: crmIcon },
  { title: "Web Development", icon: webDevIcon },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const ServiceLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center p-6 relative overflow-hidden">
      {/* Hero decorative circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-300 rounded-full opacity-30 blur-xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-300 rounded-full opacity-30 blur-xl animate-pulse" />
      </div>

      <img src={preoroLogo} alt="Preoro" className="mb-8 w-48 h-auto" />
      <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4 text-center">
        Welcome to NotifyNow
      </h1>
      <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl text-center">
        Powerful multi‑channel communication platform. Send messages via WhatsApp,
        SMS, RCS, and more—all from one sleek dashboard.
      </p>

      <motion.div
        className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {services.map((svc) => (
          <motion.div key={svc.title} variants={item}>
            <ServiceCard icon={svc.icon} title={svc.title} />
          </motion.div>
        ))}
      </motion.div>

      <Link to="/auth" className="mt-10">
        <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transform transition hover:scale-105 duration-300">
          Get Started
        </button>
      </Link>
    </div>
  );
};

export default ServiceLanding;
