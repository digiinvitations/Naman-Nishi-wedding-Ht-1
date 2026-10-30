import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FirestoreImage } from "./components/FirestoreImage";
import { fetchFromFsdb } from "./lib/fsdb";
import {
  Calendar,
  MapPin,
  Clock,
  ChevronUp,
  Heart,
  Send,
  Users,
  Phone,
  User,
  MessageSquare,
  Volume2,
  VolumeX,
  Lock,
  Settings,
  ExternalLink,
  Instagram,
  Facebook,
  Maximize2,
  Flower2,
  Sparkles,
  Star,
  Sparkle,
  Pencil
} from "lucide-react";

import { weddingConfig as defaultWeddingConfig, WeddingEvent, WeddingConfig } from "./weddingConfig";
import { OrnateFrame } from "./components/OrnateFrame";
import { EnvelopeCover } from "./components/EnvelopeCover";
import { RSVPModal } from "./components/RSVPModal";
import { AdminPanel } from "./components/AdminPanel";
import { ScratchReveal } from "./components/ScratchReveal";
import { FallingFlowers } from "./components/FallingFlowers";
import { SectionSeparator } from "./components/SectionSeparator";
import { Preloader } from "./components/Preloader";
import { EventMap } from "./components/EventMap";
import confetti from "canvas-confetti";

import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { collection, doc, setDoc, onSnapshot, addDoc } from "firebase/firestore";
import { isSupabaseEnabled, supabase, saveConfigToDb, addRsvpToDb } from "./lib/supabase";

const TurbanIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 4C8 4 5 7 5 11C5 12 5.5 13.5 7 15L12 17L17 15C18.5 13.5 19 12 19 11C19 7 16 4 12 4Z" fill="currentColor" opacity="0.9"/>
    <path d="M7 15C6 16 5 17 5 19C5 21 8 22 12 22C16 22 19 21 19 19C19 17 18 16 17 15L12 17L7 15Z" fill="currentColor" opacity="0.7"/>
    <path d="M12 4L13.5 1L12 2L10.5 1L12 4Z" fill="#dec47f" />
    <circle cx="12" cy="8" r="2" fill="#dec47f" />
  </svg>
);

const BindiIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="14" r="3.5" fill="#dc2626" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle cx="12" cy="3" r="1" fill="currentColor" />
    <circle cx="17" cy="11" r="1" fill="currentColor" />
    <circle cx="7" cy="11" r="1" fill="currentColor" />
  </svg>
);

export default function App() {
  // Extract client/remix identifier from URL query params (e.g. ?client=October-T1-Client-1)
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const clientId = urlParams.get("client") || urlParams.get("clientId") || urlParams.get("remix") || "config";

  // Config state locked strictly to official defaultWeddingConfig
  const [config, setConfig] = useState<WeddingConfig>(defaultWeddingConfig);

  useEffect(() => {
    if (isSupabaseEnabled && supabase) {
      const fetchSupabaseConfig = async () => {
        try {
          let { data, error } = await supabase
            .from("settings")
            .select("data")
            .eq("id", clientId)
            .maybeSingle();

          if (error) {
            const res = await supabase
              .from("config_settings")
              .select("data")
              .eq("id", clientId)
              .maybeSingle();
            data = res.data;
          }

          if (data && data.data) {
            const configData = data.data;
            setConfig({
              ...defaultWeddingConfig,
              ...configData,
              showGallery: configData.showGallery !== undefined ? configData.showGallery : defaultWeddingConfig.showGallery,
              events: configData.events || defaultWeddingConfig.events,
              galleryImages: configData.galleryImages || defaultWeddingConfig.galleryImages,
              groom: { ...defaultWeddingConfig.groom, ...(configData.groom || {}) },
              bride: { ...defaultWeddingConfig.bride, ...(configData.bride || {}) },
            });
          }
        } catch (err) {
          console.warn("Supabase initial config fetch error:", err);
        }
      };

      fetchSupabaseConfig();

      const channel = supabase
        .channel(`settings_config_channel_${clientId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "settings", filter: `id=eq.${clientId}` },
          (payload: any) => {
            if (payload.new && payload.new.data) {
              const configData = payload.new.data;
              setConfig({
                ...defaultWeddingConfig,
                ...configData,
                showGallery: configData.showGallery !== undefined ? configData.showGallery : defaultWeddingConfig.showGallery,
                showRsvp: configData.showRsvp === true ? true : false,
                events: configData.events || defaultWeddingConfig.events,
                galleryImages: configData.galleryImages || defaultWeddingConfig.galleryImages,
                groom: { ...defaultWeddingConfig.groom, ...(configData.groom || {}) },
                bride: { ...defaultWeddingConfig.bride, ...(configData.bride || {}) },
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Restore locally cached config immediately to ensure instant rendering without waiting or failing if offline/quota-exceeded
      try {
        const cached = localStorage.getItem(`wedding_config_cache_${clientId}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setConfig(prev => ({
            ...prev,
            ...cachedData
          }));
        }
      } catch {}

      const unsub = onSnapshot(doc(db, "settings", clientId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const mergedConfig = {
            ...defaultWeddingConfig,
            ...data,
            showGallery: data.showGallery !== undefined ? data.showGallery : defaultWeddingConfig.showGallery,
            showRsvp: data.showRsvp === true ? true : false,
            events: data.events || defaultWeddingConfig.events,
            galleryImages: data.galleryImages || defaultWeddingConfig.galleryImages,
            groom: { ...defaultWeddingConfig.groom, ...(data.groom || {}) },
            bride: { ...defaultWeddingConfig.bride, ...(data.bride || {}) },
          };
          setConfig(mergedConfig);
          try {
            localStorage.setItem(`wedding_config_cache_${clientId}`, JSON.stringify(mergedConfig));
          } catch {}
        }
      }, (err) => {
        const msg = err?.message || String(err);
        if (msg.includes("Quota exceeded") || msg.includes("quota metric") || msg.includes("offline") || msg.includes("Could not reach Cloud Firestore")) {
          console.warn("Firestore Quota exceeded or offline. Operating in resilient offline mode with cached wedding configuration.");
          return;
        }
        handleFirestoreError(err, OperationType.GET, `settings/${clientId}`);
      });

      return () => unsub();
    }
  }, [clientId]);

  const handleConfigChange = async (newConfig: WeddingConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(`wedding_config_cache_${clientId}`, JSON.stringify(newConfig));
    } catch {}
    try {
      await saveConfigToDb(newConfig, async () => {
        try {
          await setDoc(doc(db, "settings", clientId), newConfig);
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (msg.includes("Quota exceeded") || msg.includes("quota metric")) {
            console.warn("Firestore quota limit exceeded on save. Configuration preserved locally in browser.");
            alert("Notice: Firestore free daily quota limit has been exceeded for today. Your changes are preserved in this browser and will sync when quota resets tomorrow.");
            return;
          }
          handleFirestoreError(err, OperationType.WRITE, `settings/${clientId}`);
        }
      }, clientId);
    } catch (e) {
      console.error("Failed to save to database.", e);
      const err = e as { code?: string; message?: string };
      if (err.code === "permission-denied") {
        alert("Permission Denied: Your database rules do not allow writes. Please check your Firestore or Supabase rules.");
      } else {
        alert("Failed to save changes permanently: " + (err.message || String(e)));
      }
    }
  };

  // Opening flow states
  const [isOpened, setIsOpened] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("open") === "true" || p.get("skip") === "1" || p.get("preview") === "true";
    }
    return false;
  });
  const [isDateRevealed, setIsDateRevealed] = useState(false);
  const [isMonthRevealed, setIsMonthRevealed] = useState(false);
  const [isYearRevealed, setIsYearRevealed] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const allHeartsScratched = isDateRevealed && isMonthRevealed && isYearRevealed;
  const musicPlayingRef = useRef(musicPlaying);
  
  // Parse wedding date parts safely
  const dObj = new Date(config.weddingDate);
  let dateOfMarry = "12th";
  let monthOfMarry = "December";
  let yearOfMarry = "2026";

  if (!isNaN(dObj.getTime())) {
    const dayNum = dObj.getDate();
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    dateOfMarry = getOrdinal(dayNum);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthOfMarry = months[dObj.getMonth()];
    yearOfMarry = dObj.getFullYear().toString();
  } else if (config.displayDate) {
    const cleaned = config.displayDate.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 3) {
      dateOfMarry = parts[0];
      monthOfMarry = parts[1].substring(0, 3);
      yearOfMarry = parts[2];
    }
  }
  
  useEffect(() => {
    musicPlayingRef.current = musicPlaying;
  }, [musicPlaying]);

  useEffect(() => {
    if (allHeartsScratched) {
      // Trigger confetti from left
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: ['#f43f5e', '#eab308', '#ec4899', '#ffffff']
      });
      // Trigger confetti from right
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 1, y: 0.6 },
          colors: ['#f43f5e', '#eab308', '#ec4899', '#ffffff']
        });
      }, 200);
    }
  }, [allHeartsScratched]);

  // Responsive scratch heart size that fits the screen width from left to right
  const [heartSize, setHeartSize] = useState(105);
  useEffect(() => {
    const updateHeartSize = () => {
      const w = window.innerWidth;
      if (w < 360) setHeartSize(88);
      else if (w < 420) setHeartSize(98);
      else if (w < 640) setHeartSize(110);
      else if (w < 768) setHeartSize(122);
      else setHeartSize(135);
    };
    updateHeartSize();
    window.addEventListener("resize", updateHeartSize);
    return () => window.removeEventListener("resize", updateHeartSize);
  }, []);

  // Lightbox / Gallery states
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Slider states
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [eventKeyCount, setEventKeyCount] = useState(0);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [galleryKeyCount, setGalleryKeyCount] = useState(0);

  const nextEvent = () => {
    setCurrentEventIndex((prev) => (prev + 1) % config.events.length);
    setEventKeyCount(c => c + 1);
  };

  const prevEvent = () => {
    setCurrentEventIndex((prev) => (prev - 1 + config.events.length) % config.events.length);
    setEventKeyCount(c => c + 1);
  };

  const nextGallery = () => {
    setCurrentGalleryIndex((prev) => (prev + 1) % config.galleryImages.length);
    setGalleryKeyCount(c => c + 1);
  };

  const prevGallery = () => {
    setCurrentGalleryIndex((prev) => (prev - 1 + config.galleryImages.length) % config.galleryImages.length);
    setGalleryKeyCount(c => c + 1);
  };

  // Auto-advance Event Slider
  useEffect(() => {
    if (!isOpened || config.events.length <= 1) return;
    const interval = setInterval(() => {
      nextEvent();
    }, 6000);

  return () => clearInterval(interval);
  }, [isOpened, config.events.length]);

  // Auto-advance Gallery Slider
  useEffect(() => {
    if (!isOpened || config.galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      nextGallery();
    }, 4500);

  return () => clearInterval(interval);
  }, [isOpened, config.galleryImages.length]);

  // RSVP Form states
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpPhone, setRsvpPhone] = useState("");
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpAttend, setRsvpAttend] = useState<boolean | null>(true); // default attending
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [showRsvpModal, setShowRsvpModal] = useState(false);

  // Host Dashboard / Admin state
  const [showAdmin, setShowAdmin] = useState(false);

  // Scroll to top state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate Countdown
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(config.weddingDate) - +new Date();
      let left = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        left = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return left;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);


  return () => clearInterval(interval);
  }, []);

  // Handle Audio Player & Preloading
  useEffect(() => {
    let isCancelled = false;

    if (!config.musicUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = null;
      return;
    }

    const initAudio = async () => {
      try {
        const actualUrl = config.musicUrl.startsWith("fsdb://")
          ? await fetchFromFsdb(config.musicUrl)
          : config.musicUrl;

        if (isCancelled || !actualUrl) return;

        let audio = audioRef.current;
        let isNew = false;

        if (!audio) {
          audio = new Audio();
          audio.loop = true;
          audio.preload = "auto";
          // Standard cross-origin audio playback does not need crossOrigin="anonymous"
          audio.src = actualUrl;
          audio.load();

          audio.addEventListener("playing", () => {
            setMusicPlaying(true);
          });
          audio.addEventListener("pause", () => {
            if (audioRef.current?.paused) {
              setMusicPlaying(false);
            }
          });

          audioRef.current = audio;
          isNew = true;
        } else {
          const currentSrc = audio.src;
          const targetSrc = actualUrl.startsWith("data:") || actualUrl.startsWith("blob:")
            ? actualUrl
            : new URL(actualUrl, window.location.href).href;

          if (currentSrc !== targetSrc) {
            audio.pause();
            audio.preload = "auto";
            audio.src = actualUrl;
            audio.load();
            isNew = true;
          }
        }

        // Auto play if music was already toggled on
        if (musicPlayingRef.current && (isNew || audio.paused)) {
          audio.play().catch(e => console.log("Audio autoplay attempt:", e));
        }
      } catch (e) {
        console.warn("Failed to initialize audio:", e);
      }
    };

    initAudio();

    return () => {
      isCancelled = true;
    };
  }, [config.musicUrl]);

  // Handle Scroll Progress & Scroll-to-Top visibility
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll-to-top button after 500px scroll
      setShowScrollTop(window.scrollY > 500);

      // Scroll progress percentage
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Start background music immediately on user's direct click/tap gesture (e.g. wax seal)
  const startMusicPlayback = () => {
    setMusicPlaying(true);
    let audio = audioRef.current;

    if (!audio && config.musicUrl) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = "auto";
      audio.src = config.musicUrl;
      audio.load();
      audioRef.current = audio;
    }

    if (audio) {
      audio.muted = false;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setMusicPlaying(true);
          })
          .catch((err) => {
            console.warn("Direct gesture audio play attempt:", err);
            // In case of browser strict interaction check, retry on the next immediate touch/click
            const retryOnAnyTouch = () => {
              if (audioRef.current) {
                audioRef.current.muted = false;
                audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => {});
              }
              window.removeEventListener("pointerdown", retryOnAnyTouch);
              window.removeEventListener("touchstart", retryOnAnyTouch);
              window.removeEventListener("click", retryOnAnyTouch);
            };
            window.addEventListener("pointerdown", retryOnAnyTouch, { once: true });
            window.addEventListener("touchstart", retryOnAnyTouch, { once: true });
            window.addEventListener("click", retryOnAnyTouch, { once: true });
          });
      }
    }
  };

  // Handle opening the envelope
  const handleOpenEnvelope = () => {
    setIsOpened(true);
    setMusicPlaying(true);
    startMusicPlayback();
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
        .then(() => setMusicPlaying(true))
        .catch(() => {});
    }
  };

  // Pause Background Music Helper
  const pauseMusic = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setMusicPlaying(false);
    }
  };

  // Automatically pause music when user switches tabs, leaves or minimizes the website
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        pauseMusic();
      }
    };
    const handleExit = () => {
      pauseMusic();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleExit);
    window.addEventListener("blur", handleExit);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleExit);
      window.removeEventListener("blur", handleExit);
    };
  }, []);

  // Toggle Background Music
  const toggleMusic = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    let audio = audioRef.current;
    if (!audio && config.musicUrl) {
      audio = new Audio(config.musicUrl);
      audio.loop = true;
      audio.preload = "auto";
      audioRef.current = audio;
    }

    if (!audio) return;

    if (musicPlaying && !audio.paused) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.muted = false;
      audio.play()
        .then(() => setMusicPlaying(true))
        .catch(err => console.warn("Could not play audio:", err));
    }
  };

  // Scroll to target section smoothly
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle RSVP Submission
  const handleRSVPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || !rsvpPhone.trim() || rsvpAttend === null) {
      alert("Please fill in your Name, Phone Number, and RSVP Status.");
      return;
    }

    // Save RSVP to database
    const newRsvp = {
      name: rsvpName,
      phone: rsvpPhone,
      guestsCount: rsvpAttend ? rsvpGuests : 0,
      attend: rsvpAttend,
      message: rsvpMessage,
      timestamp: new Date().toISOString()
    };

    addRsvpToDb(newRsvp, async () => {
      try {
        return await addDoc(collection(db, "rsvps"), newRsvp);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes("Quota exceeded") || msg.includes("quota metric")) {
          console.warn("Firestore quota limit exceeded on RSVP. Saving to local storage cache.");
          try {
            const cachedList = JSON.parse(localStorage.getItem("rsvps_cache") || "[]");
            cachedList.unshift({ id: `local_${Date.now()}`, ...newRsvp });
            localStorage.setItem("rsvps_cache", JSON.stringify(cachedList));
          } catch {}
          return { id: `local_${Date.now()}` };
        }
        handleFirestoreError(err, OperationType.CREATE, "rsvps");
      }
    })
      .then(() => {
        // Show Confirmation Modal
        setShowRsvpModal(true);
        if (rsvpAttend) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#dec47f', '#962325', '#f8d98d']
          });
        }
      })
      .catch(err => {
        console.error("Error adding RSVP: ", err);
        alert("Failed to submit RSVP: " + (err.message || String(err)));
      });
  };

  const handleModalClose = () => {
    setShowRsvpModal(false);
    // Reset RSVP Form (excluding attend status for UX)
    setRsvpName("");
    setRsvpPhone("");
    setRsvpGuests(1);
    setRsvpMessage("");
  };


  const [isPreloaded, setIsPreloaded] = useState(false);

  return (
    <div className="min-h-screen bg-royal-red-950 font-sans relative text-amber-50">
      
      {!isPreloaded && (
        <Preloader
          images={[
            config.groom?.imageUrl,
            config.bride?.imageUrl,
            "/ganesha.png",
            ...(config.galleryImages?.map(i => i.url) || []),
            ...(config.events?.map(e => e.imageUrl) || [])
          ].filter(Boolean) as string[]}
          requiredImage="/ganesha.png"
          onComplete={() => setIsPreloaded(true)}
        />
      )}

      {/* 1. OVERLAY ENVELOPE COVER (Opening Screen) */}
      <AnimatePresence>
        {!isOpened && (
          <EnvelopeCover
            key="envelope"
            isOpen={isOpened}
            onOpen={handleOpenEnvelope}
            onSealClick={startMusicPlayback}
            groomName={config.groom.name}
            brideName={config.bride.name}
            displayDate={config.displayDate.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '')}
            envelopeIconUrl={config.envelopeIconUrl && !config.envelopeIconUrl.includes("e7e1cd79-5563-426f-b95b-11727ae18273") ? config.envelopeIconUrl : "/ganesha.png"}
          />
        )}
      </AnimatePresence>

      {/* BACKGROUND DECORATIVE MANDALAS (for luxury depth) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[-150px] w-[400px] h-[400px] rounded-full border border-gold-400/10 flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border border-dashed border-gold-400/5 animate-[spin_120s_linear_infinite]" />
        </div>
        <div className="absolute top-[50%] right-[-150px] w-[400px] h-[400px] rounded-full border border-gold-400/10 flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border border-dashed border-gold-400/5 animate-[spin_100s_linear_reverse_infinite]" />
        </div>
        <div className="absolute bottom-[10%] left-[-100px] w-[300px] h-[300px] rounded-full border border-gold-400/5" />
      </div>

      {/* SCROLL PROGRESS INDICATOR BAR */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-200 z-50 shadow-md transition-all duration-100"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* MAIN LAYOUT WRAPPER (Fade in after envelope opens) */}
      <div className={`${isOpened ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-1000`}>
        
        {/* 3. HERO SECTION (Systematic Top-to-Half Content Layout) */}
        <section id="hero" className="relative h-screen flex flex-col justify-between items-center text-center px-4 overflow-hidden">
          {/* Parallax Hero Background Photo (Clear and vibrant, no dark black shade) */}
          <div className="absolute inset-0 z-0">
            <FirestoreImage
              src={config.heroImageUrl}
              alt="Couple Backdrop"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Falling Flowers overlay */}
          <FallingFlowers active={allHeartsScratched} />

          {/* Systematic Top-to-Half Section Content */}
          <div className="relative z-10 w-full max-w-4xl mx-auto pt-8 sm:pt-12 md:pt-14 pb-4 flex flex-col items-center">
            
            {/* 1. Auspicious Invocation Header */}
            <motion.div 
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-center gap-2 mb-2 sm:mb-3"
            >
              <div className="w-8 sm:w-12 h-[1px] bg-gradient-to-r from-transparent to-gold-400" />
              <span className="font-display text-[10px] sm:text-xs md:text-sm text-gold-300 tracking-[0.25em] uppercase font-bold drop-shadow-md">
                ॥ श्री गणेशाय नमः ॥
              </span>
              <div className="w-8 sm:w-12 h-[1px] bg-gradient-to-l from-transparent to-gold-400" />
            </motion.div>

            {/* 2. Hero Tagline */}
            {config.heroTagline && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.12 }}
                className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3"
              >
                <Sparkle size={12} className="text-gold-400 animate-pulse shrink-0" />
                <p className="font-sans text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-[0.35em] text-amber-100 drop-shadow-md">
                  {config.heroTagline}
                </p>
                <Sparkle size={12} className="text-gold-400 animate-pulse shrink-0" />
              </motion.div>
            )}

            {/* 3. Main Couple Names Display (Majestic, Royal, Balanced) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="my-1 sm:my-2"
            >
              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-gold-gradient drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] leading-tight select-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-4 font-bold">
                <span className="tracking-wide">{config.bride.name}</span>
                <span className="font-accent text-3xl sm:text-4xl md:text-5xl text-gold-300 font-normal my-[-4px] md:my-0 select-none">
                  &amp;
                </span>
                <span className="tracking-wide">{config.groom.name}</span>
              </h1>
            </motion.div>

            {/* 4. Ornate Divider */}
            <motion.div 
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex items-center justify-center gap-3 my-2 sm:my-3 w-full max-w-xs"
            >
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gold-400 to-gold-400/40" />
              <Heart size={14} className="text-gold-400 fill-gold-400/80 drop-shadow-sm shrink-0" />
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-gold-400 to-gold-400/40" />
            </motion.div>

          </div>

          {/* Spacer allowing bottom half of background photo to remain visible and uncluttered */}
          <div className="flex-1 w-full pointer-events-none" />

          {/* Scroll Prompt Arrow pinned at bottom */}
          <div 
            className="relative z-10 pb-5 sm:pb-6 flex flex-col items-center cursor-pointer select-none group" 
            onClick={() => scrollToSection("scratch-reveal")}
          >
            <span className="font-sans text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-white/90 drop-shadow-md mb-1 font-semibold group-hover:text-gold-200 transition-colors">
              Scroll to Invite
            </span>
            <div className="w-5 h-5 border-b-2 border-r-2 border-gold-300 drop-shadow-md rotate-45 animate-bounce mt-1 group-hover:border-gold-100 transition-colors" />
          </div>
        </section>

        {/* SCRATCH CARD REVEAL SECTION */}
        <motion.section 
          id="scratch-reveal" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center"
        >
          {/* Beautiful "SAVE THE DATE ❤️" Tagline */}
          <div className="mb-8">
            <span className="font-display text-2xl md:text-4xl text-red-600 tracking-[0.2em] font-extrabold drop-shadow-md flex items-center justify-center gap-3">
              <Star size={20} className="text-gold-500 fill-gold-400" />
              SAVE THE DATE ❤️
              <Star size={20} className="text-gold-500 fill-gold-400" />
            </span>
            <p className="text-xs font-sans text-gold-700/80 uppercase tracking-[0.3em] font-semibold mt-1.5 flex justify-center items-center gap-2">
              <Sparkles size={12} className="text-gold-500" />
              Scratch the hearts to reveal
              <Sparkles size={12} className="text-gold-500" />
            </p>
            <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-gold-500 to-transparent mx-auto mt-3" />
          </div>

          {/* 3 Red Hearts container (Fit to screen from left and right side) */}
          <div className="w-full max-w-xl md:max-w-2xl mx-auto flex flex-row items-center justify-between sm:justify-around px-2 sm:px-6 py-4">
            {/* Heart 1: Date */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="font-sans text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold-300 font-extrabold mb-2 drop-shadow-sm">
                DATE
              </span>
              <div className="p-1 sm:p-1.5 bg-white/5 rounded-2xl border border-gold-500/15 shadow-xl inline-block">
                <ScratchReveal
                  width={heartSize}
                  height={heartSize}
                  onReveal={() => setIsDateRevealed(true)}
                  content={
                    <div 
                      style={{ width: `${heartSize - 16}px`, height: `${heartSize - 16}px` }}
                      className={`rounded-full flex items-center justify-center p-1 overflow-hidden transition-all duration-500 ${
                        isDateRevealed 
                          ? "bg-rose-50 border border-pink-200/50 shadow-inner" 
                          : "bg-transparent border-transparent"
                      }`}
                    >
                      <span className="font-sans text-sm sm:text-base md:text-lg font-black text-pink-600 tracking-wide leading-none drop-shadow-sm">
                        {dateOfMarry}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Heart 2: Month */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="font-sans text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold-300 font-extrabold mb-2 drop-shadow-sm">
                MONTH
              </span>
              <div className="p-1 sm:p-1.5 bg-white/5 rounded-2xl border border-gold-500/15 shadow-xl inline-block">
                <ScratchReveal
                  width={heartSize}
                  height={heartSize}
                  onReveal={() => setIsMonthRevealed(true)}
                  content={
                    <div 
                      style={{ width: `${heartSize - 16}px`, height: `${heartSize - 16}px` }}
                      className={`rounded-full flex items-center justify-center p-1 overflow-hidden transition-all duration-500 ${
                        isMonthRevealed 
                          ? "bg-rose-50 border border-pink-200/50 shadow-inner" 
                          : "bg-transparent border-transparent"
                      }`}
                    >
                      <span className="font-sans text-sm sm:text-base md:text-lg font-black text-pink-600 uppercase tracking-wider leading-none drop-shadow-sm truncate max-w-[85px]">
                        {monthOfMarry}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Heart 3: Year */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="font-sans text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold-300 font-extrabold mb-2 drop-shadow-sm">
                YEAR
              </span>
              <div className="p-1 sm:p-1.5 bg-white/5 rounded-2xl border border-gold-500/15 shadow-xl inline-block">
                <ScratchReveal
                  width={heartSize}
                  height={heartSize}
                  onReveal={() => setIsYearRevealed(true)}
                  content={
                    <div 
                      style={{ width: `${heartSize - 16}px`, height: `${heartSize - 16}px` }}
                      className={`rounded-full flex items-center justify-center p-1 overflow-hidden transition-all duration-500 ${
                        isYearRevealed 
                          ? "bg-rose-50 border border-pink-200/50 shadow-inner" 
                          : "bg-transparent border-transparent"
                      }`}
                    >
                      <span className="font-sans text-sm sm:text-base md:text-lg font-black text-pink-600 tracking-wide leading-none drop-shadow-sm">
                        {yearOfMarry}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>
          </div>

          {/* Quick Reveal button for accessibility across all mobile devices & hosting */}
          {!allHeartsScratched && (
            <div className="mt-2 mb-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsDateRevealed(true);
                  setIsMonthRevealed(true);
                  setIsYearRevealed(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-400/40 text-[11px] font-sans font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
              >
                <Sparkles size={12} className="text-gold-400" />
                <span>Tap to Reveal Auspicious Date</span>
              </button>
            </div>
          )}
        </motion.section>

        <SectionSeparator />

        {/* 9. COUNTDOWN TIMER SECTION */}
        <motion.section 
          id="countdown" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-12 px-4 relative z-10"
        >
          <div className="max-w-2xl mx-auto bg-gradient-to-b from-royal-red-100 via-white to-royal-red-50 border border-gold-500/30 p-6 md:p-8 rounded-3xl shadow-xl text-center">
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-gold-700 font-bold flex justify-center items-center gap-2"><Star size={10} className="text-gold-500 fill-gold-400" />
              The Sacred Auspicious Hours <Star size={10} className="text-gold-500 fill-gold-400" />
            </span>
            <h3 className="font-display text-xl text-red-700 tracking-wider mt-1 mb-6 uppercase font-bold flex justify-center items-center gap-2"><Sparkles size={20} className="text-gold-500" />
              Counting down to Phere <Sparkles size={20} className="text-gold-500" />
            </h3>

            {/* Countdown grid */}
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              {/* Days */}
              <div className="bg-white/90 border border-gold-500/20 p-3 md:p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                <span className="font-display text-2xl md:text-4xl text-red-700 font-bold tracking-tight">
                  {timeLeft.days}
                </span>
                <span className="font-sans text-[9px] md:text-[11px] text-gold-700/80 uppercase tracking-widest mt-1 font-semibold">
                  Days
                </span>
              </div>
              
              {/* Hours */}
              <div className="bg-white/90 border border-gold-500/20 p-3 md:p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                <span className="font-display text-2xl md:text-4xl text-red-700 font-bold tracking-tight">
                  {timeLeft.hours}
                </span>
                <span className="font-sans text-[9px] md:text-[11px] text-gold-700/80 uppercase tracking-widest mt-1 font-semibold">
                  Hours
                </span>
              </div>

              {/* Minutes */}
              <div className="bg-white/90 border border-gold-500/20 p-3 md:p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                <span className="font-display text-2xl md:text-4xl text-red-700 font-bold tracking-tight">
                  {timeLeft.minutes}
                </span>
                <span className="font-sans text-[9px] md:text-[11px] text-gold-700/80 uppercase tracking-widest mt-1 font-semibold">
                  Mins
                </span>
              </div>

              {/* Seconds */}
              <div className="bg-white/90 border border-gold-500/20 p-3 md:p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                <span className="font-display text-2xl md:text-4xl text-rose-600 font-bold tracking-tight min-w-[2ch]">
                  {timeLeft.seconds}
                </span>
                <span className="font-sans text-[9px] md:text-[11px] text-gold-700/80 uppercase tracking-widest mt-1 font-semibold">
                  Secs
                </span>
              </div>
            </div>

            {/* Heart Divider */}
            <div className="flex items-center justify-center space-x-2 mt-6">
              <div className="w-10 h-[0.75px] bg-gold-600/40" />
              <Heart size={12} className="text-gold-600 fill-gold-600 animate-pulse" />
              <div className="w-10 h-[0.75px] bg-gold-600/40" />
            </div>
          </div>
        </motion.section>
        <SectionSeparator />

        {/* 4. INVITATION MESSAGE SECTION */}
        <motion.section 
          id="message" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="flex justify-center mb-6">
            <Heart size={28} className="text-gold-700 fill-gold-700/20 animate-pulse" />
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mb-2 uppercase font-bold">
            {config.welcomeMessage.title}
          </h2>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold-800/80 mb-6 font-semibold">
            {config.welcomeMessage.subtitle}
          </p>
          
          <div className="w-16 h-[1px] bg-gold-600/40 mx-auto mb-8" />
          
          <p className="font-sans text-sm md:text-base leading-relaxed text-gray-900 max-w-2xl mx-auto font-medium">
            {config.welcomeMessage.text}
          </p>

          <p className="font-accent text-4xl text-red-700 mt-10">
            Save the Date to celebrate our happiness!
          </p>
        </motion.section>


        <SectionSeparator />

        {/* 5 & 6. GROOM & BRIDE SECTIONS */}
        <motion.section 
          id="couple" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-5xl mx-auto relative z-10"
        >
          <div className="text-center mb-12">
            <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold flex justify-center items-center gap-2">
              <Flower2 size={10} className="text-gold-500" />
              Introducing
              <Flower2 size={10} className="text-gold-500" />
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mt-1 uppercase font-bold flex justify-center items-center gap-3">
              <Sparkles size={24} className="text-gold-500" />
              The Bride & The Groom
              <Sparkles size={24} className="text-gold-500" />
            </h2>
            <div className="w-12 h-0.5 bg-gold-600/40 mx-auto mt-3" />
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Elegant '&' divider */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gold-50 border-[3px] md:border-4 border-gold-300 shadow-xl">
              <span className="font-accent text-4xl md:text-5xl text-red-700 mt-1 md:mt-2">&amp;</span>
            </div>

            {/* Bride Section */}
            <OrnateFrame borderColor="border-gold-600/40 bg-white/60">
              <div className="flex flex-col items-center text-center p-2">
                <span className="font-accent text-4xl text-red-700 mb-2">
                  The Bride
                </span>
                
                {/* Bride Photo with Royal Frame */}
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-gold-400 shadow-xl mb-6 group">
                  <FirestoreImage
                    src={config.bride.imageUrl}
                    alt={config.bride.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-[10px] text-white uppercase tracking-widest font-semibold">
                      {config.bride.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <h3 className="font-display text-3xl text-red-700 tracking-wider font-bold">
                    {config.bride.name}
                  </h3>
                  <BindiIcon className="w-6 h-6 text-red-600" />
                </div>
                
                {/* Parents details */}
                <div className="my-3 text-gold-800/80 font-sans text-xs uppercase tracking-widest leading-relaxed">
                  <p className="font-semibold">Beloved Daughter of</p>
                  <p className="font-bold text-gold-900 text-sm mt-0.5">
                    {config.bride.motherName}
                  </p>
                  <p className="font-semibold">&amp;</p>
                  <p className="font-bold text-gold-900 text-sm">
                    {config.bride.fatherName}
                  </p>
                </div>

                <p className="font-sans text-xs md:text-sm text-gray-800 leading-relaxed font-medium mt-4 px-4 border-t border-gold-600/20 pt-4">
                  {config.bride.bio}
                </p>
              </div>
            </OrnateFrame>

            {/* Groom Section */}
            <OrnateFrame borderColor="border-gold-600/40 bg-white/60">
              <div className="flex flex-col items-center text-center p-2">
                <span className="font-accent text-4xl text-red-700 mb-2">
                  The Groom
                </span>
                
                {/* Groom Photo with Royal Frame */}
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-gold-400 shadow-xl mb-6 group">
                  <FirestoreImage
                    src={config.groom.imageUrl}
                    alt={config.groom.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-[10px] text-white uppercase tracking-widest font-semibold">
                      Shri {config.groom.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <h3 className="font-display text-3xl text-red-700 tracking-wider font-bold">
                    {config.groom.name}
                  </h3>
                  <TurbanIcon className="w-8 h-8 text-gold-600" />
                </div>
                
                {/* Parents details */}
                <div className="my-3 text-gold-800/80 font-sans text-xs uppercase tracking-widest leading-relaxed">
                  <p className="font-semibold">Beloved Son of</p>
                  <p className="font-bold text-gold-900 text-sm mt-0.5">
                    {config.groom.motherName}
                  </p>
                  <p className="font-semibold">&amp;</p>
                  <p className="font-bold text-gold-900 text-sm">
                    {config.groom.fatherName}
                  </p>
                </div>

                <p className="font-sans text-xs md:text-sm text-gray-800 leading-relaxed font-medium mt-4 px-4 border-t border-gold-600/20 pt-4">
                  {config.groom.bio}
                </p>
              </div>
            </OrnateFrame>
          </div>
        </motion.section>

        <SectionSeparator />

        {/* 7. WEDDING TEASER VIDEO SECTION */}
        {config.youtubeEmbedUrl && (
          <motion.section 
            id="video" 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="py-16 bg-white/60 border-y border-gold-500/20 relative z-10 shadow-sm"
          >
            <div className="max-w-4xl mx-auto px-4 text-center">
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold">
                Watch Our Teaser
              </span>
              <h2 className="font-display text-2xl md:text-3xl text-red-700 tracking-wide mt-1 mb-8 uppercase font-bold">
                Love in Motion
              </h2>

              {/* Video container */}
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-gold-400/30 shadow-2xl bg-black">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={config.youtubeEmbedUrl}
                  title="Wedding Cinematic Teaser"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.section>
        )}

        {config.youtubeEmbedUrl && <SectionSeparator />}
        {!config.youtubeEmbedUrl && <SectionSeparator />}

        {/* 8. EVENT CARDS SECTION */}
        <motion.section 
          id="events" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-5xl mx-auto relative z-10"
        >
          <div className="text-center mb-16">
            <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold flex justify-center items-center gap-2">
              <Flower2 size={10} className="text-gold-500" />
              The Celebration Schedule
              <Flower2 size={10} className="text-gold-500" />
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mt-1 uppercase font-bold flex justify-center items-center gap-3">
              <Sparkles size={24} className="text-gold-500" />
              Wedding Ceremonies
              <Sparkles size={24} className="text-gold-500" />
            </h2>
            <div className="w-12 h-0.5 bg-gold-600/40 mx-auto mt-3" />
          </div>

          <div className="relative">
            {config.events.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`event-${eventKeyCount}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col lg:flex-row border border-gold-500/20 bg-gradient-to-br from-white via-royal-red-50 to-white rounded-3xl overflow-hidden shadow-xl"
                >
                  {/* Event Portrait Banner */}
                  <div className="lg:w-2/5 h-auto relative overflow-hidden group bg-black/5 flex items-center justify-center">
                    <FirestoreImage
                      src={config.events[currentEventIndex].imageUrl}
                      alt={config.events[currentEventIndex].name}
                      className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Color tint overlay based on event accent */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                    
                    {/* Hindi Event Name Tag */}
                    {config.events[currentEventIndex].hindiName && (
                      <div className="absolute bottom-4 left-4 z-10">
                        <span className="font-display text-gold-200 text-lg tracking-wider drop-shadow-md">
                          {config.events[currentEventIndex].hindiName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Event Details Content */}
                  <div className="lg:w-3/5 p-6 md:p-8 flex flex-col justify-between space-y-6">
                    <div>
                      <h3 className="font-display text-2xl md:text-3xl text-red-700 font-bold">
                        {config.events[currentEventIndex].name}
                      </h3>
                      
                      <div className="w-12 h-0.5 bg-gold-600/40 my-4" />

                      {/* Schedule fields */}
                      <div className="space-y-3.5">
                        <div className="flex items-center space-x-3 text-gray-900 text-sm">
                          <Calendar size={18} className="text-gold-700 shrink-0" />
                          <span className="font-sans font-semibold">{config.events[currentEventIndex].date}</span>
                        </div>
                        
                        <div className="flex items-center space-x-3 text-gray-900 text-sm">
                          <Clock size={18} className="text-gold-700 shrink-0" />
                          <span className="font-sans font-medium">{config.events[currentEventIndex].time}</span>
                        </div>
                        
                        <div className="flex items-start space-x-3 text-gray-800 text-sm">
                          <MapPin size={18} className="text-gold-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gold-900">{config.events[currentEventIndex].venueName}</p>
                            <p className="text-xs text-gray-700 mt-1 leading-relaxed font-medium">{config.events[currentEventIndex].venueAddress}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Map Preview */}
                    {config.events[currentEventIndex].mapEmbedUrl && (
                      <div className="w-full mt-4 z-10 relative">
                        <EventMap 
                          mapEmbedUrl={config.events[currentEventIndex].mapEmbedUrl} 
                          venueName={config.events[currentEventIndex].venueName} 
                          onDirectionsClick={pauseMusic}
                        />
                      </div>
                    )}

                    {/* Directions Trigger */}
                    <a
                      href={config.events[currentEventIndex].mapDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={pauseMusic}
                      className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-royal-red-950 font-bold uppercase text-xs tracking-wider py-3 px-6 rounded-xl text-center shadow-lg hover:shadow-[0_0_15px_rgba(222,196,127,0.4)] transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <MapPin size={15} />
                      <span>Get Directions</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Slider Controls */}
            {config.events.length > 1 && (
              <div className="flex justify-center items-center mt-8 space-x-4">
                <button
                  onClick={prevEvent}
                  className="w-10 h-10 rounded-full border border-gold-500/30 flex items-center justify-center text-gold-800 hover:text-gold-900 hover:border-gold-600 transition-colors shadow-md hover:shadow-lg cursor-pointer bg-white"
                >
                  <span className="sr-only">Previous</span>
                  &#8592;
                </button>
                <div className="flex space-x-2">
                  {config.events.map((_, idx) => (
                    <div
                      key={`event-indicator-${idx}`}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentEventIndex ? 'bg-gold-600 w-6' : 'bg-gold-600/30'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextEvent}
                  className="w-10 h-10 rounded-full border border-gold-500/30 flex items-center justify-center text-gold-800 hover:text-gold-900 hover:border-gold-600 transition-colors shadow-md hover:shadow-lg cursor-pointer bg-white"
                >
                  <span className="sr-only">Next</span>
                  &#8594;
                </button>
              </div>
            )}
          </div>
        </motion.section>

        {config.showGallery !== false && (
          <>
            <SectionSeparator />

            {/* 10. PHOTO GALLERY SECTION */}
            <motion.section 
              id="gallery" 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="py-16 px-4 md:px-8 max-w-5xl mx-auto relative z-10"
            >
              <div className="text-center mb-16">
                <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold flex justify-center items-center gap-2">
                  <Flower2 size={10} className="text-gold-500" />
                  Moments of Love
                  <Flower2 size={10} className="text-gold-500" />
                </span>
                <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mt-1 uppercase font-bold flex justify-center items-center gap-3">
                  <Sparkles size={24} className="text-gold-500" />
                  Photo Gallery
                  <Sparkles size={24} className="text-gold-500" />
                </h2>
                <div className="w-12 h-0.5 bg-gold-600/40 mx-auto mt-3" />
                {config.gallerySubtitle && (
                  <p className="text-sm font-sans text-gray-800 mt-4 max-w-lg mx-auto font-medium">{config.gallerySubtitle}</p>
                )}
              </div>

              {/* Smooth crossfade photo gallery with fixed container height to prevent splashing/layout shift */}
              <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-gold-500/20 group bg-neutral-950 flex items-center justify-center h-[450px] md:h-[550px]">
                 {config.galleryImages.length > 0 && (
                    <AnimatePresence mode="popLayout">
                       <motion.div
                          key={`gallery-${galleryKeyCount}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          className="relative w-full flex items-center justify-center cursor-pointer"
                          onClick={() => setActivePhoto(config.galleryImages[currentGalleryIndex].url)}
                       >
                           <FirestoreImage src={config.galleryImages[currentGalleryIndex].url} alt={config.galleryImages[currentGalleryIndex].caption} className="w-auto h-auto max-w-full max-h-[80vh] object-contain" />
                           <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none" />
                           <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
                               <span className="font-display text-white text-xl md:text-2xl tracking-wider drop-shadow-md font-bold">
                                 {config.galleryImages[currentGalleryIndex].caption}
                               </span>
                           </div>
                       </motion.div>
                    </AnimatePresence>
                 )}
                 
                 {/* Simple controls */}
                 <div className="absolute bottom-6 right-6 z-20 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <button onClick={(e) => { e.stopPropagation(); prevGallery(); }} className="w-10 h-10 rounded-full bg-white/80 border border-gold-600/40 text-gold-900 flex items-center justify-center hover:bg-white hover:text-gold-900 cursor-pointer">
                        &#8592;
                     </button>
                      <button onClick={(e) => { e.stopPropagation(); nextGallery(); }} className="w-10 h-10 rounded-full bg-white/80 border border-gold-600/40 text-gold-900 flex items-center justify-center hover:bg-white hover:text-gold-900 cursor-pointer">
                        &#8594;
                     </button>
                 </div>
              </div>

              {/* LIGHTBOX FOR FULLSCREEN PREVIEW */}
              <AnimatePresence>
                {activePhoto && (
                  <div key="lightbox" className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/95 backdrop-blur-md"
                      onClick={() => setActivePhoto(null)}
                    />
                    
                    {/* Image Wrapper */}
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="relative max-w-4xl max-h-[90vh] z-10 flex flex-col items-center"
                    >
                      <FirestoreImage
                        src={activePhoto}
                        alt="Gallery Fullscreen"
                        className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-gold-400/30 shadow-2xl"
                      />
                      
                      {/* Image Caption */}
                      <p className="text-white mt-4 text-sm font-sans tracking-wide">
                        {config.galleryImages.find(img => img.url === activePhoto)?.caption}
                      </p>

                      {/* Close Helper */}
                      <button
                        onClick={() => setActivePhoto(null)}
                        className="mt-4 bg-gold-gradient text-royal-red-950 text-xs uppercase font-bold tracking-widest py-2.5 px-6 rounded-full cursor-pointer hover:shadow-lg hover:shadow-gold-500/20"
                      >
                        Close
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.section>
          </>
        )}

        {/* 11. RSVP FORM SECTION (Hidden from website by default, toggleable in Host Dashboard) */}
        {config.showRsvp === true && (
          <>
            <SectionSeparator />

            <motion.section 
              id="rsvp" 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="py-16 px-4 max-w-lg mx-auto relative z-10"
            >
              <OrnateFrame borderColor="border-gold-600/40 bg-white/60">
                <form onSubmit={handleRSVPSubmit} className="space-y-6 p-2 text-center">
                  <div>
                    <Heart size={24} className="text-gold-600 fill-gold-600 mx-auto animate-pulse mb-3" />
                    <h2 className="font-display text-2xl md:text-3xl text-red-700 uppercase font-bold flex justify-center items-center gap-3">
                      <Sparkles size={20} className="text-gold-500" />
                      Kindly RSVP
                      <Sparkles size={20} className="text-gold-500" />
                    </h2>
                    <p className="font-sans text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-1 font-semibold flex justify-center items-center gap-2">
                      <Flower2 size={10} className="text-gold-500" />
                      Please respond by December 1, 2026
                      <Flower2 size={10} className="text-gold-500" />
                    </p>
                    <div className="w-12 h-[1px] bg-gold-600/40 mx-auto mt-4" />
                  </div>

                  {/* RSVP Fields */}
                  <div className="space-y-4 text-left">
                    
                    {/* Full Name */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <User size={16} />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Harish Sharma"
                          value={rsvpName}
                          onChange={(e) => setRsvpName(e.target.value)}
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold">
                        Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <Phone size={16} />
                        </span>
                        <input
                          type="tel"
                          required
                          placeholder="e.g., +91 98765 43210"
                          value={rsvpPhone}
                          onChange={(e) => setRsvpPhone(e.target.value)}
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Will you attend? */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-900 block mb-2 font-semibold">
                        Will You Attend?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setRsvpAttend(true);
                            confetti({
                              particleCount: 100,
                              spread: 70,
                              origin: { y: 0.8 },
                              colors: ['#dec47f', '#962325', '#f8d98d']
                            });
                          }}
                          className={`py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-wider border transition-all cursor-pointer ${
                            rsvpAttend === true
                              ? "bg-gold-gradient text-white border-gold-600 shadow-md"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gold-600/40"
                          }`}
                        >
                          Yes, Joyfully!
                        </button>
                        <button
                          type="button"
                          onClick={() => setRsvpAttend(false)}
                          className={`py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-wider border transition-all cursor-pointer ${
                            rsvpAttend === false
                              ? "bg-gold-gradient text-white border-gold-600 shadow-md"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gold-600/40"
                          }`}
                        >
                          Regretfully, No
                        </button>
                      </div>
                    </div>

                    {/* Guest Selector (Conditional) */}
                    <AnimatePresence>
                      {rsvpAttend === true && (
                        <motion.div
                          key="guest-selector"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold mt-4">
                            Number of Guests
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                              <Users size={16} />
                            </span>
                            <select
                              value={rsvpGuests}
                              onChange={(e) => setRsvpGuests(Number(e.target.value))}
                              className="w-full bg-white text-gray-900 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium appearance-none shadow-sm"
                            >
                              <option value="1">1 Guest</option>
                              <option value="2">2 Guests</option>
                              <option value="3">3 Guests</option>
                              <option value="4">4 Guests</option>
                              <option value="5">5+ Guests</option>
                            </select>
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              ▼
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Warm wishes / Messages */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold mt-4">
                        Blessing Message
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-gray-400">
                          <MessageSquare size={16} />
                        </span>
                        <textarea
                          rows={3}
                          placeholder="Send your blessings, warm wishes, or dietary notes..."
                          value={rsvpMessage}
                          onChange={(e) => setRsvpMessage(e.target.value)}
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium resize-none shadow-sm"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Submit trigger */}
                  <button
                    type="submit"
                    className="w-full bg-gold-gradient text-white font-bold uppercase text-xs tracking-wider py-4 px-6 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(222,196,127,0.6)] transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer mt-2"
                  >
                    <Send size={15} />
                    <span>Submit RSVP</span>
                  </button>

                </form>
              </OrnateFrame>
            </motion.section>
          </>
        )}

        <SectionSeparator />

        {/* 12. THANK YOU SECTION */}
        <motion.section 
          id="thankyou" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 text-center relative z-10 bg-radial-gradient from-white to-pink-50"
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            {config.envelopeIconUrl ? (
              <img src={config.envelopeIconUrl} alt="Icon" className="w-[60px] h-[60px] object-contain opacity-80 mb-4" />
            ) : null}
            
            <p className="font-accent text-5xl md:text-6xl text-red-700 mb-2 flex justify-center items-center gap-3">
              <Sparkles size={24} className="text-gold-500" />
              Dhanyawaad
              <Sparkles size={24} className="text-gold-500" />
            </p>
            <p className="font-sans text-xs uppercase tracking-[0.25em] text-gold-700 mb-6 font-bold flex justify-center items-center gap-2">
              <Flower2 size={10} className="text-gold-500" />
              Thank You
              <Flower2 size={10} className="text-gold-500" />
            </p>

            {/* Final Couple Portrait Frame */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-gold-600 p-1 mb-8 shadow-xl overflow-hidden">
              <FirestoreImage
                src={config.thankYouImageUrl || config.galleryImages[config.galleryImages.length - 1]?.url || config.galleryImages[0]?.url}
                alt="Thank You Portrait"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <p className="font-sans text-sm md:text-base leading-relaxed text-gray-800 mb-6 font-medium max-w-lg">
              {config.familyDetails.message}
            </p>

            <span className="font-sans text-[11px] uppercase tracking-widest text-gray-600 font-bold">
              {config.familyDetails.welcomingText}
            </span>
            <div className="space-y-1.5 mt-3 mb-10 font-display text-lg text-red-700 tracking-wider font-bold">
              {config.familyDetails.names.map((name, i) => (
                <p key={i}>{name}</p>
              ))}
            </div>

            {/* Social icon */}
            <div className="flex items-center justify-center">
              <a
                href={config.socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-gold-600/40 text-gold-900 hover:text-red-700 hover:border-gold-600 flex items-center justify-center transition-colors shadow-sm cursor-pointer bg-white"
                title="Instagram Profile"
              >
                <Instagram size={18} className="stroke-[2]" />
              </a>
            </div>
          </div>
        </motion.section>

        {/* FOOTER */}
        <footer className="py-12 bg-white text-center relative z-10 flex flex-col justify-center items-center overflow-hidden">
          <div className="absolute inset-0 bg-pink-50/50 pointer-events-none" />
          {config.hashtag && (
            <div className="relative mb-6">
              <span className="font-accent text-3xl md:text-4xl text-red-700 tracking-wider">
                {config.hashtag}
              </span>
            </div>
          )}
          <div className="relative border border-pink-300 px-6 md:px-10 py-3 bg-white/90 shadow-sm mb-6 rounded-sm">
            <span className="font-sans text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-pink-800/80 font-bold whitespace-nowrap">
              Create with <span className="text-red-500 animate-pulse inline-block mx-1">❤️</span> by digiinvitations_
            </span>
          </div>
          
          {/* Discreet Host Admin Portal Link */}
          {isOpened && (
            <button
              onClick={() => setShowAdmin(true)}
              className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-gray-400 hover:text-pink-800 text-[11px] font-sans tracking-wide transition-colors cursor-pointer bg-transparent hover:bg-pink-50/50"
              title="Host Admin"
            >
              <Settings size={12} className="opacity-60" />
              <span>Host Admin Portal</span>
            </button>
          )}
        </footer>
      </div>



      {/* Music Floating Toggle (Bottom Left) */}
      {isOpened && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-3 group">
          <div className="relative">
            {/* Flower decorations */}
            <div className="absolute -top-3 -left-3 text-pink-400 rotate-12 opacity-80 pointer-events-none transition-transform group-hover:scale-110">
              <Flower2 size={20} />
            </div>
            <div className="absolute -bottom-2 -right-2 text-pink-500 -rotate-12 opacity-80 pointer-events-none transition-transform group-hover:scale-110">
              <Flower2 size={16} />
            </div>
            <button
              onClick={toggleMusic}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 border border-pink-300 ${
                musicPlaying ? "bg-gradient-to-br from-pink-400 to-pink-600 text-white animate-[spin_8s_linear_infinite]" : "bg-white text-pink-600"
              }`}
              title={musicPlaying ? "Mute Background Music" : "Play Background Music"}
            >
              {musicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
          
          {/* Animated Music Wave Bars (Saves user having to guess if it's active) */}
          {musicPlaying && (
            <div className="flex items-end gap-0.5 h-6 bg-white/90 p-1.5 rounded-md border border-pink-300/30 pointer-events-none shadow-sm">
              <span className="w-0.5 h-full bg-pink-500 rounded-sm animate-[pulse_1s_infinite_100ms]" style={{ minHeight: "6px" }} />
              <span className="w-0.5 h-full bg-pink-500 rounded-sm animate-[pulse_1s_infinite_300ms]" style={{ minHeight: "12px" }} />
              <span className="w-0.5 h-full bg-pink-500 rounded-sm animate-[pulse_1s_infinite_500ms]" style={{ minHeight: "8px" }} />
            </div>
          )}
        </div>
      )}

      {/* Scroll-to-Top Toggle (Bottom Right) */}
      <AnimatePresence>
        {isOpened && showScrollTop && (
          <motion.div
            key="scroll-top"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 z-40 group"
          >
            <div className="relative">
              <div className="absolute -top-3 -right-3 text-pink-400 rotate-[30deg] opacity-80 pointer-events-none transition-transform group-hover:scale-110">
                <Flower2 size={20} />
              </div>
              <div className="absolute -bottom-2 -left-2 text-pink-500 -rotate-[20deg] opacity-80 pointer-events-none transition-transform group-hover:scale-110">
                <Flower2 size={16} />
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 text-white font-bold flex items-center justify-center shadow-xl border border-pink-300 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                title="Scroll To Top"
              >
                <ChevronUp size={20} className="stroke-[3]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RSVP Confirmation Modal */}
      <RSVPModal
        isOpen={showRsvpModal}
        onClose={handleModalClose}
        guestName={rsvpName}
        isAttending={rsvpAttend === true}
        guestsCount={rsvpGuests}
        weddingDate={config.weddingDate}
        displayDate={config.displayDate}
        venueName={config.events.find(e => e.id.includes("wedding"))?.venueName || "Hotel Shanvi Landmark"}
        venueAddress={config.events.find(e => e.id.includes("wedding"))?.venueAddress || "Hotel Shanvi Landmark Panna"}
      />

      {/* Admin Dashboard Drawer/Modal */}
      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />

    </div>
  );
}
