import React from "react";
import { motion } from "framer-motion";

interface ServiceCardProps {
  icon: string; // path to SVG/PNG in assets
  title: string;
  description?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      <img src={icon} alt={title + " icon"} className="w-16 h-16 mb-2" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {description}
        </p>
      )}
    </motion.div>
  );
};
