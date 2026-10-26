import React from 'react';
import { motion } from 'motion/react';
import { Flower2 } from 'lucide-react';

export const SectionSeparator = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center w-full my-8 md:my-12 opacity-80 z-10 relative"
    >
      <div className="w-1/3 md:w-1/4 h-px bg-gradient-to-r from-transparent via-pink-200 to-pink-400"></div>
      <div className="mx-4 flex items-center text-pink-500 gap-3">
        <Flower2 size={16} className="text-pink-400 opacity-80" />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pink-600 drop-shadow-sm">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
        </svg>
        <Flower2 size={16} className="text-pink-400 opacity-80" />
      </div>
      <div className="w-1/3 md:w-1/4 h-px bg-gradient-to-l from-transparent via-pink-200 to-pink-400"></div>
    </motion.div>
  );
};
