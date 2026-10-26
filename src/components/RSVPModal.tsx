import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Calendar, MapPin, Heart } from "lucide-react";

interface RSVPModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  isAttending: boolean;
  guestsCount: number;
  weddingDate: string;
  displayDate?: string;
  venueName?: string;
  venueAddress?: string;
}

export const RSVPModal: React.FC<RSVPModalProps> = ({
  isOpen,
  onClose,
  guestName,
  isAttending,
  guestsCount,
  displayDate = "Wednesday, 25th November 2026",
  venueName = "Hotel Shanvi Landmark",
  venueAddress = "Hotel Shanvi Landmark Panna"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="rsvp-modal-root"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-royal-red-950 border border-gold-400 p-6 md:p-8 rounded-3xl shadow-2xl text-center overflow-hidden"
          >
            {/* Elegant Golden Background Pattern */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
              <svg width="100%" height="100%">
                <circle cx="50%" cy="50%" r="40%" stroke="#dec47f" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="30%" stroke="#dec47f" strokeWidth="1" />
              </svg>
            </div>

            {/* Corner decorations */}
            <div className="absolute top-3 left-3 border-t border-l border-gold-400 w-6 h-6 rounded-tl-lg opacity-60" />
            <div className="absolute top-3 right-3 border-t border-r border-gold-400 w-6 h-6 rounded-tr-lg opacity-60" />
            <div className="absolute bottom-3 left-3 border-b border-l border-gold-400 w-6 h-6 rounded-bl-lg opacity-60" />
            <div className="absolute bottom-3 right-3 border-b border-r border-gold-400 w-6 h-6 rounded-br-lg opacity-60" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gold-300/60 hover:text-gold-200 transition-colors p-1"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center mb-6 shadow-lg animate-bounce">
              {isAttending ? (
                <Check size={32} className="text-royal-red-950 stroke-[3]" />
              ) : (
                <X size={32} className="text-royal-red-950 stroke-[3]" />
              )}
            </div>

            {/* Sanskrit Blessing / Quote */}
            <p className="font-display text-sm text-gold-300/80 italic mb-2">
              &quot;माङ्गल्यं तन्तुनानेन लोकजीवनहेतुना।&quot;
            </p>
            <p className="font-sans text-[10px] uppercase tracking-[0.1em] text-gold-400/60 mb-4">
              (This sacred union is for the welfare of life)
            </p>

            <h3 className="font-display text-2xl text-gold-100 mb-2">
              {isAttending ? "RSVP Confirmed!" : "Response Received"}
            </h3>

            <p className="font-sans text-sm text-gray-300 px-2 mb-6">
              {isAttending ? (
                <>
                  Thank you, <span className="text-gold-200 font-semibold">{guestName}</span>. We are thrilled to celebrate with you! We have registered <span className="text-gold-200 font-semibold">{guestsCount} guest{guestsCount > 1 ? "s" : ""}</span> under your name.
                </>
              ) : (
                <>
                  Thank you, <span className="text-gold-200 font-semibold">{guestName}</span>, for letting us know. You will be missed! Your blessings mean the world to us.
                </>
              )}
            </p>

            {isAttending && (
              <div className="bg-royal-red-900/60 border border-gold-500/20 rounded-2xl p-4 text-left space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-gold-200">
                  <Calendar size={18} className="shrink-0" />
                  <span className="text-xs font-sans">
                    {displayDate} | From 02:00 PM
                  </span>
                </div>
                <div className="flex items-start space-x-3 text-gold-200">
                  <MapPin size={18} className="shrink-0 mt-0.5" />
                  <span className="text-xs font-sans leading-relaxed">
                    {venueName ? `${venueName}, ` : ""}{venueAddress}
                  </span>
                </div>
              </div>
            )}

            {/* Heart divider */}
            <div className="flex items-center justify-center space-x-2 my-4">
              <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-gold-400" />
              <Heart size={14} className="text-gold-400 fill-gold-400 animate-pulse" />
              <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-gold-400" />
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gold-gradient text-royal-red-950 font-bold uppercase text-xs tracking-wider py-3 px-6 rounded-xl hover:shadow-[0_0_15px_rgba(222,196,127,0.5)] transition-all duration-300 cursor-pointer"
            >
              Back to Invitation
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
