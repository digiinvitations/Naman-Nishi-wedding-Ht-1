import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface PreloaderProps {
  images: string[];
  onComplete: () => void;
  requiredImage?: string;
}

export const Preloader: React.FC<PreloaderProps> = ({ 
  images, 
  onComplete, 
  requiredImage = "/ganesha.png" 
}) => {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let ganeshaReady = false;

    // Explicitly preload and decode the sacred Ganesha icon so it is immediately visible with zero latency
    const preloadGanesha = async () => {
      try {
        const ganeshaImg = new Image();
        ganeshaImg.src = requiredImage;
        if (typeof ganeshaImg.decode === "function") {
          await ganeshaImg.decode();
        } else {
          await new Promise<void>((resolve) => {
            ganeshaImg.onload = () => resolve();
            ganeshaImg.onerror = () => resolve();
          });
        }
      } catch {
        // proceed
      }
      ganeshaReady = true;
    };

    preloadGanesha();

    const uniqueImages = Array.from(new Set([requiredImage, ...images].filter(Boolean))) as string[];
    const totalUnique = uniqueImages.length;
    let loadedCount = 0;

    const checkComplete = async () => {
      if (isCancelled) return;
      // Ensure Ganesha icon decoding is finished
      if (!ganeshaReady) {
        await new Promise((r) => setTimeout(r, 200));
      }
      setProgress(100);
      setIsFading(true);
      setTimeout(() => {
        if (!isCancelled) onComplete();
      }, 600);
    };

    if (totalUnique === 0) {
      checkComplete();
      return;
    }

    const handleLoad = () => {
      if (isCancelled) return;
      loadedCount++;
      setProgress(Math.round((loadedCount / totalUnique) * 100));
      if (loadedCount >= totalUnique) {
        checkComplete();
      }
    };

    uniqueImages.forEach((src) => {
      if (src.startsWith("fsdb://")) {
        handleLoad();
        return;
      }
      const img = new Image();
      img.src = src;
      img.onload = handleLoad;
      img.onerror = handleLoad;
    });

    // Safety timeout ensures user is never stuck
    const safetyTimer = setTimeout(() => {
      checkComplete();
    }, 3500);

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [images, onComplete, requiredImage]);

  return (
    <AnimatePresence>
      {!isFading && (
        <motion.div
          key="preloader-overlay"
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#fdf5f5]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 relative flex items-center justify-center"
          >
            {/* Sacred Ganesha Preview in Preloader for instant recognition */}
            <div className="w-20 h-20 relative flex items-center justify-center">
              <img
                src="/ganesha.png"
                alt="Lord Ganesha Emblem"
                className="w-16 h-16 object-contain drop-shadow-[0_4px_10px_rgba(180,83,9,0.3)] animate-pulse"
              />
            </div>
          </motion.div>
          
          <div className="text-center mb-6">
            <h2 className="font-display text-lg sm:text-xl text-royal-red-950 tracking-[0.25em] uppercase font-bold mb-2">
              ॥ श्री गणेशाय नमः ॥
            </h2>
            <p className="font-sans text-[11px] text-gold-700 uppercase tracking-[0.25em] font-semibold">
              Loading Sacred Invitation
            </p>
          </div>

          <div className="w-56 h-[3px] bg-red-100 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-gold-400 via-amber-500 to-red-600 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
