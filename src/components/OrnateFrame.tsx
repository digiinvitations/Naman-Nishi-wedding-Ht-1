import React from "react";

interface OrnateFrameProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
}

export const OrnateFrame: React.FC<OrnateFrameProps> = ({
  children,
  className = "",
  borderColor = "border-gold-400"
}) => {
  return (
    <div className={`relative p-4 md:p-6 bg-royal-red-950/80 rounded-2xl border-2 ${borderColor} ${className} shadow-2xl overflow-hidden`}>
      {/* Background Mandala overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor" className="text-gold-200">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" />
          <path d="M 50,10 L 50,90 M 10,50 L 90,50 M 22,22 L 78,78 M 22,78 L 78,22" stroke="currentColor" strokeWidth="0.25" />
        </svg>
      </div>

      {/* Elegant Golden Corner Ornaments */}
      {/* Top Left */}
      <svg
        className="absolute top-2 left-2 text-gold-400 w-12 h-12 pointer-events-none"
        viewBox="0 0 50 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M 2,25 L 2,2 C 2,2 15,2 25,2 M 2,2 L 18,18 M 8,2 L 2,8 M 2,15 C 8,15 15,8 15,2 M 22,2 C 18,6 18,10 22,14 C 26,10 26,6 22,2 Z" strokeLinecap="round" />
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      </svg>

      {/* Top Right */}
      <svg
        className="absolute top-2 right-2 text-gold-400 w-12 h-12 pointer-events-none rotate-90"
        viewBox="0 0 50 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M 2,25 L 2,2 C 2,2 15,2 25,2 M 2,2 L 18,18 M 8,2 L 2,8 M 2,15 C 8,15 15,8 15,2 M 22,2 C 18,6 18,10 22,14 C 26,10 26,6 22,2 Z" strokeLinecap="round" />
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      </svg>

      {/* Bottom Left */}
      <svg
        className="absolute bottom-2 left-2 text-gold-400 w-12 h-12 pointer-events-none -rotate-90"
        viewBox="0 0 50 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M 2,25 L 2,2 C 2,2 15,2 25,2 M 2,2 L 18,18 M 8,2 L 2,8 M 2,15 C 8,15 15,8 15,2 M 22,2 C 18,6 18,10 22,14 C 26,10 26,6 22,2 Z" strokeLinecap="round" />
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      </svg>

      {/* Bottom Right */}
      <svg
        className="absolute bottom-2 right-2 text-gold-400 w-12 h-12 pointer-events-none rotate-180"
        viewBox="0 0 50 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M 2,25 L 2,2 C 2,2 15,2 25,2 M 2,2 L 18,18 M 8,2 L 2,8 M 2,15 C 8,15 15,8 15,2 M 22,2 C 18,6 18,10 22,14 C 26,10 26,6 22,2 Z" strokeLinecap="round" />
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      </svg>

      {/* Border Inset Accent Line */}
      <div className="absolute inset-1.5 border border-gold-400/30 rounded-xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
