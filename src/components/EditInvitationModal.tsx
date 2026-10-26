import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Music,
  Users,
  MessageSquare,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Info
} from "lucide-react";
import { WeddingConfig } from "../weddingConfig";

interface CeremonyFormItem {
  id: string;
  name: string;
  date: string;
  day: string;
  time: string;
  venueName: string;
  venueAddress: string;
  mapLink: string;
}

interface EditInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WeddingConfig;
}

const COMMON_CEREMONIES = [
  "Haldi Ceremony",
  "Mehndi Ceremony",
  "Sangeet & Shahi Sangeet",
  "Wedding Ceremony (Shubh Vivah)",
  "Grand Reception",
  "Engagement / Sagai",
  "Tilak / Roka Ceremony",
  "Mayun Ceremony",
  "Cocktail Party",
  "Custom Event"
];

const HELPER_CHIPS = [
  { label: "👗 Dress Code / Theme", snippet: "👗 Dress Code / Theme: " },
  { label: "🏷️ Wedding Hashtag", snippet: "🏷️ Wedding Hashtag: #" },
  { label: "📸 Photo Gallery Section", snippet: "📸 Photo Gallery Section: Add 10+ couple photos & pre-wedding shoots\n" },
  { label: "🎥 Live Streaming Link", snippet: "🎥 Live Streaming Link (YouTube/Zoom): " },
  { label: "💌 RSVP Form", snippet: "💌 RSVP Form: Required with WhatsApp notifications\n" },
  { label: "⏳ Countdown Timer", snippet: "⏳ Countdown Timer: Display live countdown to Muhurat\n" },
  { label: "🏨 Hotel & Stay Info", snippet: "🏨 Hotel & Accommodation Info: " }
];

export const EditInvitationModal: React.FC<EditInvitationModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  // Groom details
  const [groomName, setGroomName] = useState(config.groom.name || "");
  const [groomFather, setGroomFather] = useState(config.groom.fatherName || "");
  const [groomMother, setGroomMother] = useState(config.groom.motherName || "");
  const [groomBio, setGroomBio] = useState(config.groom.bio || "");

  // Bride details
  const [brideName, setBrideName] = useState(config.bride.name || "");
  const [brideFather, setBrideFather] = useState(config.bride.fatherName || "");
  const [brideMother, setBrideMother] = useState(config.bride.motherName || "");
  const [brideBio, setBrideBio] = useState(config.bride.bio || "");

  // Wedding details
  const initialWeddingDate = config.weddingDate ? config.weddingDate.split("T")[0] : "2026-12-12";
  const [weddingDate, setWeddingDate] = useState(initialWeddingDate);
  const [weddingDay, setWeddingDay] = useState("");
  const [weddingYear, setWeddingYear] = useState("");
  const [weddingTime, setWeddingTime] = useState("06:30 PM (Varmala) | 11:30 PM (Phere)");
  const [venueName, setVenueName] = useState("The Imperial Mandapam, Raj Palace Resort");
  const [venueAddress, setVenueAddress] = useState("VIP Road, Bandra Reclamation, Mumbai, MH - 400050");
  const [googleMapsLink, setGoogleMapsLink] = useState("https://maps.google.com/?q=Bandra+Reclamation+Mumbai");

  // Ceremonies
  const [ceremonies, setCeremonies] = useState<CeremonyFormItem[]>([]);

  // Family details
  const [brideFamily, setBrideFamily] = useState("Sharma Family & Relatives");
  const [groomFamily, setGroomFamily] = useState("Singhal Family & Relatives");

  // Invitation Message
  const [invitationMessage, setInvitationMessage] = useState(
    config.welcomeMessage?.text || "Together with our families, we joyfully invite you to celebrate our wedding ceremony."
  );

  // Background Music
  const [musicYoutubeLink, setMusicYoutubeLink] = useState(config.youtubeEmbedUrl || "");

  // Additional Requests / Custom features
  const [customRequests, setCustomRequests] = useState("");

  // Accordion active sections
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    couple: true,
    wedding: true,
    ceremonies: true,
    family: false,
    message: false,
    music: false,
    custom: true
  });

  // Validation error state
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Helper to calculate day and year from date
  const calculateDayAndYear = (dateStr: string) => {
    if (!dateStr) return { day: "", year: "" };
    try {
      const parts = dateStr.split("-");
      let dateObj: Date;
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        dateObj = new Date(dateStr);
      }
      if (isNaN(dateObj.getTime())) return { day: "", year: "" };
      return {
        day: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
        year: dateObj.getFullYear().toString()
      };
    } catch {
      return { day: "", year: "" };
    }
  };

  // Sync wedding day and year whenever date changes
  useEffect(() => {
    const res = calculateDayAndYear(weddingDate);
    setWeddingDay(res.day);
    setWeddingYear(res.year);
  }, [weddingDate]);

  // Initialize ceremonies from config
  useEffect(() => {
    if (config.events && config.events.length > 0) {
      setCeremonies(
        config.events.map((ev, index) => {
          let calculatedDay = "";
          // Extract date part if possible
          const cleanDate = ev.date;
          return {
            id: ev.id || `ceremony-${index}-${Date.now()}`,
            name: ev.name || "Ceremony",
            date: cleanDate || "",
            day: calculatedDay,
            time: ev.time || "",
            venueName: ev.venueName || "",
            venueAddress: ev.venueAddress || "",
            mapLink: ev.mapDirectionsUrl || ""
          };
        })
      );
    } else {
      setCeremonies([
        {
          id: "1",
          name: "Haldi Ceremony",
          date: "2026-12-11",
          day: "Friday",
          time: "09:00 AM onwards",
          venueName: "The Grand Courtyard, Sun Valley Hotel",
          venueAddress: "Ring Road, Juhu Vista, Mumbai, MH - 400049",
          mapLink: "https://maps.google.com/?q=Juhu+Beach+Mumbai"
        },
        {
          id: "2",
          name: "Mehndi & Sangeet",
          date: "2026-12-11",
          day: "Friday",
          time: "07:00 PM onwards",
          venueName: "The Golden Leaf Ballroom, Sun Valley Hotel",
          venueAddress: "Ring Road, Juhu Vista, Mumbai, MH - 400049",
          mapLink: "https://maps.google.com/?q=Juhu+Beach+Mumbai"
        },
        {
          id: "3",
          name: "Wedding Ceremony (Shubh Vivah)",
          date: "2026-12-12",
          day: "Saturday",
          time: "06:30 PM (Varmala) | 11:30 PM (Phere)",
          venueName: "The Imperial Mandapam, Raj Palace Resort",
          venueAddress: "VIP Road, Bandra Reclamation, Mumbai, MH - 400050",
          mapLink: "https://maps.google.com/?q=Bandra+Reclamation+Mumbai"
        },
        {
          id: "4",
          name: "Grand Reception",
          date: "2026-12-13",
          day: "Sunday",
          time: "07:30 PM onwards",
          venueName: "The Sapphire Crystal Hall, Raj Palace Resort",
          venueAddress: "VIP Road, Bandra Reclamation, Mumbai, MH - 400050",
          mapLink: "https://maps.google.com/?q=Bandra+Reclamation+Mumbai"
        }
      ]);
    }
  }, [config.events]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Add Ceremony
  const handleAddCeremony = (namePreset: string) => {
    const newCeremony: CeremonyFormItem = {
      id: `ceremony-${Date.now()}`,
      name: namePreset === "Custom Event" ? "" : namePreset,
      date: weddingDate || "",
      day: weddingDay || "",
      time: "10:00 AM onwards",
      venueName: venueName || "",
      venueAddress: venueAddress || "",
      mapLink: googleMapsLink || ""
    };
    setCeremonies([...ceremonies, newCeremony]);
  };

  // Remove Ceremony
  const handleRemoveCeremony = (id: string) => {
    setCeremonies(ceremonies.filter((c) => c.id !== id));
  };

  // Update Ceremony Field
  const handleUpdateCeremony = (id: string, field: keyof CeremonyFormItem, value: string) => {
    setCeremonies(
      ceremonies.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          if (field === "date") {
            const cal = calculateDayAndYear(value);
            updated.day = cal.day;
          }
          return updated;
        }
        return c;
      })
    );
  };

  // Helper chips insert
  const handleInsertChip = (snippet: string) => {
    setCustomRequests((prev) => {
      if (prev.includes(snippet.trim())) return prev;
      return prev ? `${prev}\n${snippet}` : snippet;
    });
  };

  // Build clean formatted message for WhatsApp
  const generateWhatsAppMessage = () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "Wedding Invitation Demo";

    let msg = `✨ *WEDDING INVITATION CUSTOMIZATION REQUEST* ✨\n\n`;
    msg += `🌐 *Selected Template Link:*\n${currentUrl}\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🤵 *GROOM DETAILS*\n`;
    msg += `• *Full Name:* ${groomName || "Not provided"}\n`;
    if (groomFather) msg += `• *Father's Name:* ${groomFather}\n`;
    if (groomMother) msg += `• *Mother's Name:* ${groomMother}\n`;
    if (groomBio) msg += `• *Introduction:* ${groomBio}\n`;

    msg += `\n👰 *BRIDE DETAILS*\n`;
    msg += `• *Full Name:* ${brideName || "Not provided"}\n`;
    if (brideFather) msg += `• *Father's Name:* ${brideFather}\n`;
    if (brideMother) msg += `• *Mother's Name:* ${brideMother}\n`;
    if (brideBio) msg += `• *Introduction:* ${brideBio}\n`;

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💍 *MAIN WEDDING INFORMATION*\n`;
    msg += `• *Wedding Date:* ${weddingDate || "Not provided"}`;
    if (weddingDay) msg += ` (${weddingDay})`;
    if (weddingYear) msg += ` • Year: ${weddingYear}`;
    msg += `\n`;
    if (weddingTime) msg += `• *Time:* ${weddingTime}\n`;
    if (venueName) msg += `• *Venue Name:* ${venueName}\n`;
    if (venueAddress) msg += `• *Full Address:* ${venueAddress}\n`;
    if (googleMapsLink) msg += `• *Google Maps Link:* ${googleMapsLink}\n`;

    if (ceremonies.length > 0) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🎉 *WEDDING CEREMONIES & SCHEDULE* (${ceremonies.length} Events)\n`;
      ceremonies.forEach((c, idx) => {
        msg += `\n*${idx + 1}. ${c.name || "Ceremony"}*\n`;
        if (c.date) msg += `   • Date: ${c.date}${c.day ? ` (${c.day})` : ""}\n`;
        if (c.time) msg += `   • Time: ${c.time}\n`;
        if (c.venueName) msg += `   • Venue: ${c.venueName}\n`;
        if (c.venueAddress) msg += `   • Address: ${c.venueAddress}\n`;
        if (c.mapLink) msg += `   • Map Link: ${c.mapLink}\n`;
      });
    }

    if (brideFamily || groomFamily) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `👨‍👩‍👧‍👦 *FAMILY DETAILS*\n`;
      if (brideFamily) msg += `• *Bride's Family:* ${brideFamily}\n`;
      if (groomFamily) msg += `• *Groom's Family:* ${groomFamily}\n`;
    }

    if (invitationMessage) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `💌 *INVITATION MESSAGE / BLESSINGS*\n${invitationMessage}\n`;
    }

    if (musicYoutubeLink) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🎵 *BACKGROUND MUSIC (YouTube):*\n${musicYoutubeLink}\n`;
    }

    if (customRequests) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `✨ *SPECIFIC DETAILS & CUSTOM FEATURES REQUESTED*\n${customRequests}\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Sent via Wedding E-Card Portal. Please review and connect for final design._`;

    return msg;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Friendly validation
    if (!groomName.trim() && !brideName.trim()) {
      setErrorMsg("Please provide at least the Groom or Bride's name.");
      return;
    }
    if (!weddingDate.trim()) {
      setErrorMsg("Please select the wedding date.");
      return;
    }
    setErrorMsg("");

    const formattedMessage = generateWhatsAppMessage();
    const encoded = encodeURIComponent(formattedMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=919456411569&text=${encoded}`;

    // Open WhatsApp
    window.open(whatsappUrl, "_blank");
  };

  const handleCopy = () => {
    const formattedMessage = generateWhatsAppMessage();
    navigator.clipboard.writeText(formattedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="edit-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md"
        >
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#1c0809] via-royal-red-950 to-[#120405] border border-gold-400/50 rounded-2xl md:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-amber-50 overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-5 py-4 md:px-7 md:py-5 border-b border-gold-500/20 bg-gradient-to-r from-royal-red-950 via-royal-red-900 to-royal-red-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gold-500/15 border border-gold-400/40 flex items-center justify-center text-gold-400 shadow-inner">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg md:text-xl font-bold text-gold-200 tracking-wider flex items-center gap-2">
                    Edit Your Invitation
                  </h3>
                  <p className="font-sans text-[11px] text-gold-400/80">
                    Customize details & send to WhatsApp (9456411569)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-lg bg-gold-950/60 border border-gold-400/30 text-gold-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy formatted message"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy Text"}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-gold-400/30 flex items-center justify-center text-gold-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-red-900/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <Info size={16} className="shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form Body (Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-6 space-y-4">
              
              {/* SECTION 1: BRIDE & GROOM DETAILS */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("couple")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">💍</span>
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      1. Bride & Groom Details
                    </span>
                  </div>
                  {openSections.couple ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.couple && (
                  <div className="p-4 md:p-5 space-y-6 border-t border-gold-500/20">
                    {/* Groom Fields */}
                    <div className="bg-royal-red-950/40 p-3.5 md:p-4 rounded-xl border border-gold-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-gold-400 uppercase tracking-wider">
                        <span>🤵 Groom Information</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={groomName}
                            onChange={(e) => setGroomName(e.target.value)}
                            placeholder="e.g. Aarav Singhal"
                            className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                            Father's Name
                          </label>
                          <input
                            type="text"
                            value={groomFather}
                            onChange={(e) => setGroomFather(e.target.value)}
                            placeholder="e.g. Shri Rajesh Singhal"
                            className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                            Mother's Name
                          </label>
                          <input
                            type="text"
                            value={groomMother}
                            onChange={(e) => setGroomMother(e.target.value)}
                            placeholder="e.g. Smt. Manju Singhal"
                            className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Short Introduction (2–4 lines)
                        </label>
                        <textarea
                          rows={2}
                          value={groomBio}
                          onChange={(e) => setGroomBio(e.target.value)}
                          placeholder="Brief description about the groom's personality, profession, or passions..."
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Bride Fields */}
                    <div className="bg-royal-red-950/40 p-3.5 md:p-4 rounded-xl border border-gold-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-gold-400 uppercase tracking-wider">
                        <span>👰 Bride Information</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={brideName}
                            onChange={(e) => setBrideName(e.target.value)}
                            placeholder="e.g. Ananya Sharma"
                            className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                            Father's Name
                          </label>
                          <input
                            type="text"
                            value={brideFather}
                            onChange={(e) => setBrideFather(e.target.value)}
                            placeholder="e.g. Shri Devendra Sharma"
                            className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                            Mother's Name
                          </label>
                          <input
                            type="text"
                            value={brideMother}
                            onChange={(e) => setBrideMother(e.target.value)}
                            placeholder="e.g. Smt. Sunita Sharma"
                            className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Short Introduction (2–4 lines)
                        </label>
                        <textarea
                          rows={2}
                          value={brideBio}
                          onChange={(e) => setBrideBio(e.target.value)}
                          placeholder="Brief description about the bride's passions, values, and personality..."
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: WEDDING INFORMATION */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("wedding")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar size={18} className="text-gold-400" />
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      2. Wedding Information
                    </span>
                  </div>
                  {openSections.wedding ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.wedding && (
                  <div className="p-4 md:p-5 space-y-4 border-t border-gold-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Wedding Date <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="date"
                          value={weddingDate}
                          onChange={(e) => setWeddingDate(e.target.value)}
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium flex items-center justify-between">
                          <span>Wedding Day (Auto)</span>
                          <span className="text-[10px] text-gold-400 font-mono">Calculated</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={weddingDay || "Select a date"}
                          className="w-full px-3 py-2 bg-black/60 border border-gold-500/20 rounded-lg text-sm text-gold-300 font-semibold cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium flex items-center justify-between">
                          <span>Wedding Year (Auto)</span>
                          <span className="text-[10px] text-gold-400 font-mono">Calculated</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={weddingYear || "Select a date"}
                          className="w-full px-3 py-2 bg-black/60 border border-gold-500/20 rounded-lg text-sm text-gold-300 font-semibold cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Wedding Time
                        </label>
                        <input
                          type="text"
                          value={weddingTime}
                          onChange={(e) => setWeddingTime(e.target.value)}
                          placeholder="e.g. 06:30 PM (Varmala) | 11:30 PM (Phere)"
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Wedding Venue Name
                        </label>
                        <input
                          type="text"
                          value={venueName}
                          onChange={(e) => setVenueName(e.target.value)}
                          placeholder="e.g. The Imperial Mandapam, Raj Palace Resort"
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Full Venue Address
                        </label>
                        <input
                          type="text"
                          value={venueAddress}
                          onChange={(e) => setVenueAddress(e.target.value)}
                          placeholder="e.g. VIP Road, Bandra Reclamation, Mumbai, MH - 400050"
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Google Maps Link
                        </label>
                        <input
                          type="url"
                          value={googleMapsLink}
                          onChange={(e) => setGoogleMapsLink(e.target.value)}
                          placeholder="https://maps.google.com/?q=..."
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: WEDDING CEREMONIES */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("ceremonies")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🪔</span>
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      3. Wedding Ceremonies ({ceremonies.length})
                    </span>
                  </div>
                  {openSections.ceremonies ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.ceremonies && (
                  <div className="p-4 md:p-5 space-y-4 border-t border-gold-500/20">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gold-500/20">
                      <p className="text-xs text-gold-300/80">
                        Add rituals, sangeet, reception, or custom ceremonies:
                      </p>
                      
                      {/* Ceremony Preset Dropdown Selector */}
                      <div className="flex items-center gap-2">
                        <select
                          id="ceremonyPresetSelect"
                          className="bg-black/60 border border-gold-500/40 text-gold-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-gold-300"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddCeremony(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="" disabled>+ Quick Add Ceremony...</option>
                          {COMMON_CEREMONIES.map((cName) => (
                            <option key={cName} value={cName}>
                              + {cName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ceremony Items */}
                    <div className="space-y-4">
                      {ceremonies.map((ceremony, index) => (
                        <div
                          key={ceremony.id}
                          className="bg-royal-red-950/40 border border-gold-500/25 p-3.5 md:p-4 rounded-xl relative space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-display text-xs text-gold-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span>Ceremony #{index + 1}</span>
                              {ceremony.day && (
                                <span className="bg-gold-500/20 text-gold-300 px-2 py-0.5 rounded text-[10px] font-sans">
                                  {ceremony.day}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCeremony(ceremony.id)}
                              className="text-red-400 hover:text-red-300 text-xs p-1 rounded hover:bg-red-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Remove Ceremony"
                            >
                              <Trash2 size={14} />
                              <span className="text-[10px]">Remove</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-gold-200/70 mb-1 font-medium">Event Name</label>
                              <input
                                type="text"
                                value={ceremony.name}
                                onChange={(e) => handleUpdateCeremony(ceremony.id, "name", e.target.value)}
                                placeholder="e.g. Haldi Ceremony"
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded text-xs text-amber-50 focus:border-gold-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gold-200/70 mb-1 font-medium">Date (Day Auto-Calculates)</label>
                              <input
                                type="text"
                                value={ceremony.date}
                                onChange={(e) => handleUpdateCeremony(ceremony.id, "date", e.target.value)}
                                placeholder="e.g. 2026-12-11 or Friday, 11th Dec"
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded text-xs text-amber-50 focus:border-gold-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gold-200/70 mb-1 font-medium">Time</label>
                              <input
                                type="text"
                                value={ceremony.time}
                                onChange={(e) => handleUpdateCeremony(ceremony.id, "time", e.target.value)}
                                placeholder="e.g. 11:00 AM onwards"
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded text-xs text-amber-50 focus:border-gold-400 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-gold-200/70 mb-1 font-medium">Venue Name</label>
                              <input
                                type="text"
                                value={ceremony.venueName}
                                onChange={(e) => handleUpdateCeremony(ceremony.id, "venueName", e.target.value)}
                                placeholder="e.g. Royal Palms Estate"
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded text-xs text-amber-50 focus:border-gold-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gold-200/70 mb-1 font-medium">Full Address</label>
                              <input
                                type="text"
                                value={ceremony.venueAddress}
                                onChange={(e) => handleUpdateCeremony(ceremony.id, "venueAddress", e.target.value)}
                                placeholder="e.g. Palm Beach Road, Navi Mumbai"
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded text-xs text-amber-50 focus:border-gold-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gold-200/70 mb-1 font-medium">Google Maps Link</label>
                              <input
                                type="url"
                                value={ceremony.mapLink}
                                onChange={(e) => handleUpdateCeremony(ceremony.id, "mapLink", e.target.value)}
                                placeholder="https://maps.google.com/..."
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded text-xs text-amber-50 focus:border-gold-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {ceremonies.length === 0 && (
                        <div className="p-4 text-center text-xs text-gold-400/60 border border-dashed border-gold-500/30 rounded-xl">
                          No ceremonies added yet. Click "+ Quick Add Ceremony" above to add your wedding events.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: FAMILY DETAILS (OPTIONAL) */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("family")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={18} className="text-gold-400" />
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      4. Family Details <span className="text-[11px] font-sans font-normal text-gold-400/70 lowercase">(optional)</span>
                    </span>
                  </div>
                  {openSections.family ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.family && (
                  <div className="p-4 md:p-5 space-y-3 border-t border-gold-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Bride's Side Family Names / Welcoming By
                        </label>
                        <input
                          type="text"
                          value={brideFamily}
                          onChange={(e) => setBrideFamily(e.target.value)}
                          placeholder="e.g. Sharma Family & All Relatives"
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                          Groom's Side Family Names / Welcoming By
                        </label>
                        <input
                          type="text"
                          value={groomFamily}
                          onChange={(e) => setGroomFamily(e.target.value)}
                          placeholder="e.g. Singhal Family & All Relatives"
                          className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: INVITATION MESSAGE (OPTIONAL) */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("message")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={18} className="text-gold-400" />
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      5. Invitation Message <span className="text-[11px] font-sans font-normal text-gold-400/70 lowercase">(optional)</span>
                    </span>
                  </div>
                  {openSections.message ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.message && (
                  <div className="p-4 md:p-5 space-y-3 border-t border-gold-500/20">
                    <label className="block text-[11px] text-gold-200/80 font-medium">
                      Custom Welcome Note / Shloka / Invitation Text
                    </label>
                    <textarea
                      rows={3}
                      value={invitationMessage}
                      onChange={(e) => setInvitationMessage(e.target.value)}
                      placeholder="Enter the welcoming message you'd like your guests to see..."
                      className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none resize-none"
                    />
                  </div>
                )}
              </div>

              {/* SECTION 6: BACKGROUND MUSIC (OPTIONAL) */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("music")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Music size={18} className="text-gold-400" />
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      6. Background Music & Video <span className="text-[11px] font-sans font-normal text-gold-400/70 lowercase">(optional)</span>
                    </span>
                  </div>
                  {openSections.music ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.music && (
                  <div className="p-4 md:p-5 space-y-3 border-t border-gold-500/20">
                    <div>
                      <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                        YouTube Link (Cinematic Teaser or Song)
                      </label>
                      <input
                        type="url"
                        value={musicYoutubeLink}
                        onChange={(e) => setMusicYoutubeLink(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=... or song link"
                        className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 7: SPECIFIC DETAILS & NEW FEATURES (CHIPS + TEXTAREA) */}
              <div className="border border-gold-500/30 rounded-2xl overflow-hidden bg-black/25">
                <button
                  type="button"
                  onClick={() => toggleSection("custom")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-gradient-to-r from-royal-red-900/40 to-transparent hover:bg-royal-red-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={18} className="text-gold-400" />
                    <span className="font-display text-sm md:text-base font-bold text-gold-300 uppercase tracking-wider">
                      7. Specific Details & Custom Features
                    </span>
                  </div>
                  {openSections.custom ? <ChevronUp size={18} className="text-gold-400" /> : <ChevronDown size={18} className="text-gold-400" />}
                </button>

                {openSections.custom && (
                  <div className="p-4 md:p-5 space-y-4 border-t border-gold-500/20">
                    <div>
                      <p className="text-[11px] text-gold-300/80 mb-2 font-medium">
                        Tap chips to insert common requests into your note:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {HELPER_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => handleInsertChip(chip.snippet)}
                            className="text-xs bg-gold-950/70 hover:bg-gold-900 border border-gold-500/40 text-gold-200 hover:text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                          >
                            <span>{chip.label}</span>
                            <Plus size={12} className="text-gold-400" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gold-200/80 mb-1 font-medium">
                        Additional Notes, Theme details, or Custom Features:
                      </label>
                      <textarea
                        rows={3}
                        value={customRequests}
                        onChange={(e) => setCustomRequests(e.target.value)}
                        placeholder="Add dress code, hashtag, live stream links, countdown timer preference, hotel details, or any special wishes..."
                        className="w-full px-3 py-2 bg-black/40 border border-gold-500/30 rounded-lg text-sm text-amber-50 focus:border-gold-400 focus:outline-none resize-none font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom WhatsApp Submit Action */}
              <div className="pt-2 sticky bottom-0 bg-gradient-to-t from-[#120405] via-[#120405]/95 to-transparent pb-1">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-sm md:text-base py-3.5 px-6 rounded-2xl shadow-[0_4px_25px_rgba(16,185,129,0.4)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.6)] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
                >
                  {/* WhatsApp SVG Icon */}
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="fill-current text-white"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>Send Details on Whatsapp</span>
                </button>
                <p className="text-center text-[10px] text-gold-400/70 mt-2 font-sans">
                  Target WhatsApp: <strong>9456411569</strong> • Automatic template link included for instant preview
                </p>
              </div>

            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
