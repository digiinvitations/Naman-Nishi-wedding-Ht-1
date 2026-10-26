import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { fetchFromFsdb, transformGoogleDriveUrl } from "../lib/fsdb";

interface EnvelopeCoverProps {
  isOpen: boolean;
  onOpen: () => void;
  onSealClick?: () => void;
  groomName: string;
  brideName: string;
  displayDate: string;
  envelopeIconUrl?: string;
}

export const EnvelopeCover: React.FC<EnvelopeCoverProps> = ({
  onOpen,
  onSealClick,
  envelopeIconUrl
}) => {
  const [isOpening, setIsOpening] = useState(false);

  // Prevent any card/OG image URL from ever masquerading as the Ganesha icon
  const isOgCard = (url?: string) => Boolean(url && url.includes("e7e1cd79-5563-426f-b95b-11727ae18273"));
  const sanitizedIcon = !envelopeIconUrl || isOgCard(envelopeIconUrl) ? "/ganesha.png" : envelopeIconUrl;

  // Synchronously compute initial icon to eliminate any flash or async lag
  const [resolvedIcon, setResolvedIcon] = useState<string>(() => {
    if (sanitizedIcon.startsWith("fsdb://")) return "/ganesha.png";
    return transformGoogleDriveUrl(sanitizedIcon);
  });

  useEffect(() => {
    const raw = !envelopeIconUrl || isOgCard(envelopeIconUrl) ? "/ganesha.png" : envelopeIconUrl;
    if (raw.startsWith("fsdb://")) {
      fetchFromFsdb(raw).then((resolved) => {
        if (resolved) setResolvedIcon(resolved);
      });
    } else {
      setResolvedIcon(transformGoogleDriveUrl(raw));
    }
  }, [envelopeIconUrl]);

  const handleOpen = () => {
    if (isOpening) return;
    setIsOpening(true);
    // Trigger music immediately on user's direct click gesture to bypass browser autoplay blocks
    onSealClick?.();
    setTimeout(() => {
      onOpen();
    }, 1800);
  };

  return (
    <motion.div
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 1.5 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#fff0f3] cursor-pointer"
      onClick={handleOpen}
    >
      {/* Top Triangle */}
      <motion.div 
        animate={isOpening ? { y: "-100vh" } : { y: 0 }}
        exit={{ y: "-100vh" }}
        transition={{ duration: 1.5, ease: [0.77, 0, 0.175, 1] }}
        className="absolute top-0 left-0 w-full h-1/2 flex items-start justify-center overflow-hidden"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full text-pink-200" style={{ filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.15))" }}>
          <path d="M0,0 L100,0 L54,92 Q50,100 46,92 Z" fill="currentColor" />
        </svg>
        {isOpening && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: ["-100%", "50%", "200%"], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent z-20 -skew-x-20 pointer-events-none"
          />
        )}
        <div className="relative z-10 flex flex-col items-center justify-start pt-8 md:pt-12">
          {/* Instant Ganesha Emblem */}
          <div className="w-20 h-20 md:w-24 md:h-24 mb-2 flex items-center justify-center">
            <img 
              src={resolvedIcon} 
              alt="Lord Ganesha Emblem" 
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(180,83,9,0.35)] transition-transform duration-300 hover:scale-105" 
            />
          </div>
          <h2 className="font-display text-xl md:text-2xl text-pink-800 tracking-widest font-bold drop-shadow-sm">
            ॥ श्री गणेशाय नमः ॥
          </h2>
        </div>
      </motion.div>

      {/* Bottom Triangle */}
      <motion.div 
        animate={isOpening ? { y: "100vh" } : { y: 0 }}
        exit={{ y: "100vh" }}
        transition={{ duration: 1.5, ease: [0.77, 0, 0.175, 1], delay: 0.1 }}
        className="absolute bottom-0 left-0 w-full h-1/2 flex items-end justify-center overflow-hidden"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full text-pink-200" style={{ filter: "drop-shadow(0px -8px 12px rgba(0,0,0,0.15))" }}>
          <path d="M0,100 L100,100 L54,8 Q50,0 46,8 Z" fill="currentColor" />
        </svg>
        {isOpening && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: ["-100%", "50%", "200%"], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.1 }}
            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent z-20 -skew-x-20 pointer-events-none"
          />
        )}
        <div className="relative z-10 flex flex-col items-center justify-end pb-16 md:pb-20">
          <p className="font-accent text-4xl md:text-5xl text-pink-800 mb-2 drop-shadow-sm font-medium">
            Wedding Invitation
          </p>
        </div>
      </motion.div>

      {/* Centered Wax Seal */}
      <motion.div
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.5 } }}
        className="absolute z-20 flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={handleOpen}
      >
        {/* Pulsing Outer Glow */}
        {!isOpening && (
          <div className="absolute w-36 h-36 rounded-full bg-red-400/20 animate-ping duration-[3000ms] pointer-events-none" />
        )}
        
        {/* Premium Red Wax Seal Container */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.4)] border border-red-800/60 transition-shadow duration-150 bg-gradient-to-br from-[#dc2626] via-[#b91c1c] to-[#7f1d1d] overflow-hidden"
          style={{
            borderRadius: "48% 52% 51% 49% / 51% 49% 51% 49%" // Organic wax look
          }}
        >
          {/* Shine reflection effect */}
          {isOpening && (
            <motion.div
              initial={{ x: "-100%", skewX: -20 }}
              animate={{ x: "200%" }}
              transition={{ duration: 1, ease: "easeInOut", repeat: 1, repeatDelay: 0.2 }}
              className="absolute inset-0 w-1/2 h-full bg-white/40 blur-md z-30"
            />
          )}

          {/* Inner Seal Ring */}
          <div className="absolute inset-2.5 rounded-full border-2 border-dashed border-red-300/50" />
          
          {/* Gold Stamp Emblem */}
          <div className="flex flex-col items-center justify-center text-center z-10">
            {/* Sacred Heart/Om Icon */}
            <svg
              className="w-12 h-12 text-red-100 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
            </svg>
            <span className="font-sans text-xs uppercase font-bold text-red-100 tracking-widest mt-1 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
              OPEN
            </span>
          </div>
        </motion.div>

        {/* Tap Helper Text */}
        <AnimatePresence>
          {!isOpening && (
            <motion.span
              key="tap-to-open-hint"
              exit={{ opacity: 0 }}
              className="font-sans text-[10px] uppercase text-red-900 tracking-[0.3em] mt-8 font-bold bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full border border-pink-200 shadow-sm"
            >
              TAP TO OPEN
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
