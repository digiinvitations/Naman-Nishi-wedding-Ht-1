import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Check, X, FileSpreadsheet, Trash2, Key, ChevronDown, ChevronUp, Image as ImageIcon, Calendar, Edit3, Settings, Video, Database, Copy, AlertCircle, CheckCircle2, Eye, EyeOff, Upload, Download, FileText, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Layers, HardDrive } from "lucide-react";
import { WeddingConfig, WeddingEvent, weddingConfig as defaultWeddingConfig } from "../weddingConfig";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, addDoc, writeBatch } from "firebase/firestore";
import { uploadToFsdb } from "../lib/fsdb";
import { isSupabaseEnabled, supabase, checkSupabaseTables } from "../lib/supabase";
import { FirestoreImage } from "./FirestoreImage";

interface RSVPRecord {
  id: string;
  name: string;
  phone: string;
  guestsCount: number;
  message: string;
  attend: boolean;
  timestamp: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: WeddingConfig;
  onConfigChange: (newConfig: WeddingConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, config, onConfigChange }) => {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [rsvps, setRsvps] = useState<RSVPRecord[]>([]);
  
  const [activeTab, setActiveTab] = useState<"rsvps" | "couple" | "events" | "media" | "backup" | "database">("rsvps");

  // Local state for editing to avoid constant re-renders during typing
  const [editConfig, setEditConfig] = useState<WeddingConfig>(config);
  const [isDraggingMusic, setIsDraggingMusic] = useState(false);
  const [isUploadingGanesha, setIsUploadingGanesha] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Changes Saved Successfully!");

  // Backup & Restore State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<{
    fileName: string;
    exportedAt?: string;
    weddingGroom?: string;
    weddingBride?: string;
    eventsCount: number;
    galleryCount: number;
    rsvpsCount: number;
    config: WeddingConfig | null;
    rsvps: RSVPRecord[];
    restoreConfig: boolean;
    restoreRsvps: boolean;
    rsvpImportMode: "replace" | "merge";
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dbDiagnostics, setDbDiagnostics] = useState<{
    settings: boolean;
    rsvps: boolean;
    fs_files: boolean;
    checked: boolean;
    checking: boolean;
    error?: string;
    details?: {
      settings?: string;
      rsvps?: string;
      fs_files?: string;
    };
  }>({
    settings: false,
    rsvps: false,
    fs_files: false,
    checked: false,
    checking: false
  });

  useEffect(() => {
    setEditConfig(config);
  }, [config]);

  // Auto-save changes in real time
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // Avoid saving immediately on load, only save if editConfig actually differs
      if (JSON.stringify(editConfig) !== JSON.stringify(config)) {
        const timer = setTimeout(() => {
          onConfigChange(editConfig);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [editConfig, config, isAuthenticated, isOpen, onConfigChange]);

  const runDiagnostics = async () => {
    setDbDiagnostics(prev => ({ ...prev, checking: true, error: undefined }));
    try {
      const res = await checkSupabaseTables();
      setDbDiagnostics({
        ...res,
        checked: true,
        checking: false
      });
    } catch (err: any) {
      setDbDiagnostics(prev => ({
        ...prev,
        checked: true,
        checking: false,
        error: err?.message || String(err)
      }));
    }
  };

  useEffect(() => {
    if (activeTab === "database" && isSupabaseEnabled && isOpen) {
      runDiagnostics();
    }
  }, [activeTab, isOpen]);

  // Load RSVPs from database
  useEffect(() => {
    if (isOpen) {
      if (isSupabaseEnabled && supabase) {
        const fetchSupabaseRSVPs = async () => {
          try {
            const { data, error } = await supabase
              .from("rsvps")
              .select("*")
              .order("timestamp", { ascending: false });

            if (error) throw error;
            if (data) {
              const mappedData = data.map((item: any) => ({
                id: item.id?.toString() || Math.random().toString(),
                name: item.name || "",
                phone: item.phone || "",
                guestsCount: item.guestsCount ?? item.guests_count ?? 0,
                attend: item.attend ?? true,
                message: item.message || "",
                timestamp: item.timestamp || new Date().toISOString()
              })) as RSVPRecord[];
              setRsvps(mappedData);
            }
          } catch (err) {
            console.warn("Supabase RSVPs fetch error:", err);
          }
        };

        fetchSupabaseRSVPs();

        const channel = supabase
          .channel("rsvps_changes_channel")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "rsvps" },
            () => {
              fetchSupabaseRSVPs();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } else {
        // Pre-load from local cache so RSVPs are immediately visible even if offline or quota is exceeded
        try {
          const cached = localStorage.getItem("rsvps_cache");
          if (cached) {
            setRsvps(JSON.parse(cached));
          }
        } catch {}

        const q = query(collection(db, "rsvps"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as RSVPRecord[];
          setRsvps(data);
          try {
            localStorage.setItem("rsvps_cache", JSON.stringify(data));
          } catch {}
        }, (err) => {
          const msg = err?.message || String(err);
          if (msg.includes("Quota exceeded") || msg.includes("quota metric") || msg.includes("offline") || msg.includes("Could not reach Cloud Firestore")) {
            console.warn("Firestore Quota exceeded or offline while reading RSVPs. Using local storage cache.");
            try {
              const cached = localStorage.getItem("rsvps_cache");
              if (cached) {
                setRsvps(JSON.parse(cached));
              }
            } catch {}
            return;
          }
          handleFirestoreError(err, OperationType.LIST, "rsvps");
        });
        return () => unsub();
      }
    }
  }, [isOpen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setError("Maximum attempts reached. You are restricted from trying again.");
      return;
    }

    if (passcode === "9456") {
      setIsAuthenticated(true);
      setError("");
      setLoginAttempts(0);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setIsLocked(true);
        setError("Maximum attempts reached. You are restricted from trying again.");
      } else {
        setError(`Incorrect Passcode. You have ${3 - newAttempts} attempt(s) left.`);
      }
    }
  };

  const saveChanges = () => {
    onConfigChange(editConfig);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Convert File to Base64 (with automatic compression for large photos, direct read for SVGs/icons)
  const handleImageUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
      const isSmall = file.size < 500000; // < 500KB

      // For SVGs or smaller images (like Ganesha icons), read directly to avoid canvas rasterization / security errors
      if (isSvg || isSmall) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const rawBase64 = reader.result as string;
            const fsdbUrl = await uploadToFsdb(rawBase64);
            resolve(fsdbUrl);
          } catch {
            // Graceful fallback to direct data URL if fsdb upload encounters network error
            resolve(reader.result as string);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
        return;
      }

      // For larger photos (>500KB), downscale on canvas
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxDim = 3840;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(event.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedBase64 = canvas.toDataURL("image/webp", 0.75);
            try {
              const fsdbUrl = await uploadToFsdb(compressedBase64);
              resolve(fsdbUrl);
            } catch {
              resolve(compressedBase64);
            }
          } catch {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleGaneshaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingGanesha(true);
      try {
        const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (isSvg) {
              resolve(reader.result as string);
              return;
            }
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let w = img.width;
              let h = img.height;
              const maxDim = 400;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(reader.result as string);
                return;
              }
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve(reader.result as string);
            img.src = reader.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read image file"));
          reader.readAsDataURL(file);
        });

        setEditConfig(prev => ({ ...prev, envelopeIconUrl: dataUrl }));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to process image.");
      } finally {
        setIsUploadingGanesha(false);
      }
    }
  };

  const renderGaneshaSection = () => (
    <div className="bg-white/70 p-4 rounded-xl border border-pink-300/30 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-900 flex items-center gap-2">
            🕉️ Lord Ganesha / Envelope Flap Header Icon
          </span>
          <span className="text-[11px] text-gray-600 block mt-0.5">
            Displayed on the opening envelope flap directly above &ldquo;॥ श्री गणेशाय नमः ॥&rdquo;
          </span>
        </div>
        {editConfig.envelopeIconUrl && editConfig.envelopeIconUrl !== "/ganesha.png" && (
          <button
            type="button"
            onClick={() => setEditConfig(p => ({ ...p, envelopeIconUrl: "/ganesha.png" }))}
            className="text-[11px] text-pink-700 hover:text-pink-900 underline font-semibold cursor-pointer shrink-0"
          >
            Reset to Divine Ganesha
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-pink-50 border border-pink-300/40 p-1 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
          <img
            src={editConfig.envelopeIconUrl || "/ganesha.png"}
            alt="Lord Ganesha"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 w-full space-y-2">
          <input
            type="text"
            value={editConfig.envelopeIconUrl || ""}
            onChange={e => setEditConfig(p => ({ ...p, envelopeIconUrl: e.target.value.trim() }))}
            placeholder="Paste direct URL (https://..., Google Drive, ImgBB) or upload below"
            className="w-full bg-white text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-xs focus:border-pink-300 outline-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <label className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors flex items-center gap-1.5 ${
              isUploadingGanesha 
                ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed" 
                : "bg-gold-500/20 hover:bg-gold-500/30 text-pink-950 border-pink-300/40 shadow-sm"
            }`}>
              <Upload size={13} />
              {isUploadingGanesha ? "Uploading Icon..." : "Upload Ganesha Icon File (PNG, SVG, JPG)"}
              <input
                type="file"
                accept="image/*,.svg"
                disabled={isUploadingGanesha}
                onChange={handleGaneshaUpload}
                className="hidden"
              />
            </label>
            <span className="text-[10px] text-gray-500">
              {editConfig.envelopeIconUrl && editConfig.envelopeIconUrl !== "/ganesha.png"
                ? "✓ Custom Ganesha icon active"
                : "✓ Using divine Ganesha image"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, path: "bride" | "groom") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await handleImageUpload(file);
        setEditConfig(prev => ({
          ...prev,
          [path]: {
            ...prev[path],
            imageUrl: base64
          }
        }));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to process image.");
      }
    }
  };

  const handleEventChange = (index: number, field: keyof WeddingEvent, value: string) => {
    const updatedEvents = [...editConfig.events];
    updatedEvents[index] = { ...updatedEvents[index], [field]: value };
    setEditConfig(prev => ({ ...prev, events: updatedEvents }));
  };

  const addEvent = () => {
    setEditConfig(prev => ({
      ...prev,
      events: [...prev.events, {
        id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9),
        name: "New Event",
        hindiName: "",
        date: "Date",
        time: "Time",
        venueName: "Venue Name",
        venueAddress: "Venue Address",
        imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop",
        mapEmbedUrl: "",
        mapDirectionsUrl: ""
      }]
    }));
  };

  const deleteEvent = (index: number) => {
    setEditConfig(prev => {
      const updated = [...prev.events];
      updated.splice(index, 1);
      return { ...prev, events: updated };
    });
  };

  const addGalleryPhoto = () => {
    setEditConfig(prev => ({
      ...prev,
      galleryImages: [...prev.galleryImages, { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop", caption: "New Photo" }]
    }));
  };

  const updateGalleryPhoto = (index: number, field: "url"|"caption", value: string) => {
    setEditConfig(prev => {
      const updated = [...prev.galleryImages];
      const cleanValue = field === "url" ? value.trim() : value;
      updated[index] = { ...updated[index], [field]: cleanValue };
      return { ...prev, galleryImages: updated };
    });
  };

  const deleteGalleryPhoto = (index: number) => {
    setEditConfig(prev => {
      const updated = [...prev.galleryImages];
      updated.splice(index, 1);
      return { ...prev, galleryImages: updated };
    });
  };

  const processYouTubeUrl = (url: string) => {
    let embedUrl = url;
    if (url.includes("watch?v=")) {
      embedUrl = url.replace("watch?v=", "embed/");
      embedUrl = embedUrl.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
      embedUrl = embedUrl.split("?")[0];
    } else if (url.includes("youtube.com/shorts/")) {
      embedUrl = url.replace("youtube.com/shorts/", "youtube.com/embed/");
      embedUrl = embedUrl.split("?")[0];
    }
    setEditConfig(p => ({...p, youtubeEmbedUrl: embedUrl}));
  };

  const handleDeleteRsvp = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this RSVP entry?")) return;
    try {
      if (isSupabaseEnabled && supabase) {
        await supabase.from("rsvps").delete().eq("id", id);
      } else {
        await deleteDoc(doc(db, "rsvps", id));
      }
      setRsvps(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rsvps/${id}`);
    }
  };

  const handleClearAllRsvps = async () => {
    if (window.confirm("Are you sure you want to delete all RSVP entries? This cannot be undone.")) {
      try {
        if (isSupabaseEnabled && supabase) {
          await supabase.from("rsvps").delete().neq("id", "0");
        } else {
          for (const r of rsvps) {
            await deleteDoc(doc(db, "rsvps", r.id));
          }
        }
        setRsvps([]);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, "rsvps");
      }
    }
  };

  const exportToCSV = () => {
    if (rsvps.length === 0) {
      alert("No RSVPs to export yet.");
      return;
    }

    const headers = ["Name", "Phone", "Status", "Guests Count", "Message", "Timestamp"];
    const rows = rsvps.map((r) => [
      r.name,
      r.phone,
      r.attend ? "Attending" : "Not Attending",
      r.guestsCount,
      `"${r.message.replace(/"/g, '""')}"`,
      new Date(r.timestamp).toLocaleString()
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "wedding_rsvps.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full wedding data backup as a downloadable JSON file
  const handleExportData = () => {
    try {
      const backupData = {
        app: "Royal Hindu Wedding Invitation",
        appletId: "5cdd2c03-d01a-4805-a62a-d4966a1b77ce",
        backupVersion: "1.0",
        exportedAt: new Date().toISOString(),
        wedding: {
          groom: editConfig.groom?.name || "Naman Agrawal",
          bride: editConfig.bride?.name || "Nishi Agrawal",
          date: editConfig.weddingDate || "2026-11-25",
          hashtag: editConfig.hashtag || "#NamanWedsNishi"
        },
        summary: {
          eventsCount: editConfig.events?.length || 0,
          galleryPhotosCount: editConfig.galleryImages?.length || 0,
          rsvpsCount: rsvps.length
        },
        config: editConfig,
        rsvps: rsvps
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      const groomClean = (editConfig.groom?.name || "naman").toLowerCase().replace(/[^a-z0-9]/g, "");
      const brideClean = (editConfig.bride?.name || "nishi").toLowerCase().replace(/[^a-z0-9]/g, "");
      a.href = url;
      a.download = `${groomClean}-${brideClean}-wedding-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage("Data Backup Exported Successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Failed to export backup: " + (err.message || String(err)));
    }
  };

  // Handle selecting a JSON backup file to import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // Reset input so same file can be chosen again if needed

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let configCandidate: WeddingConfig | null = null;
        let rsvpsCandidate: RSVPRecord[] = [];

        // Check format: full backup format or direct config
        if (parsed.config && typeof parsed.config === "object") {
          configCandidate = parsed.config;
        } else if (parsed.groom && parsed.bride && parsed.events) {
          configCandidate = parsed as WeddingConfig;
        }

        if (Array.isArray(parsed.rsvps)) {
          rsvpsCandidate = parsed.rsvps;
        } else if (Array.isArray(parsed)) {
          rsvpsCandidate = parsed;
        }

        if (!configCandidate && rsvpsCandidate.length === 0) {
          alert("Invalid backup file: Could not find valid wedding configuration or RSVP data in this JSON file.");
          return;
        }

        setImportPreviewData({
          fileName: file.name,
          exportedAt: parsed.exportedAt || undefined,
          weddingGroom: parsed.wedding?.groom || configCandidate?.groom?.name || "Unknown",
          weddingBride: parsed.wedding?.bride || configCandidate?.bride?.name || "Unknown",
          eventsCount: configCandidate?.events?.length || 0,
          galleryCount: configCandidate?.galleryImages?.length || 0,
          rsvpsCount: rsvpsCandidate.length,
          config: configCandidate,
          rsvps: rsvpsCandidate,
          restoreConfig: Boolean(configCandidate),
          restoreRsvps: rsvpsCandidate.length > 0,
          rsvpImportMode: "replace"
        });
        setShowImportModal(true);
      } catch (err: any) {
        alert("Failed to parse JSON backup file: " + (err.message || "Invalid JSON format"));
      }
    };
    reader.onerror = () => {
      alert("Error reading file from disk.");
    };
    reader.readAsText(file);
  };

  // Confirm and apply the imported backup
  const handleConfirmImport = async () => {
    if (!importPreviewData) return;
    setIsRestoring(true);
    try {
      const summaryParts: string[] = [];

      // 1. Restore Config if chosen
      if (importPreviewData.restoreConfig && importPreviewData.config) {
        const mergedConfig: WeddingConfig = {
          ...defaultWeddingConfig,
          ...importPreviewData.config,
          groom: { ...defaultWeddingConfig.groom, ...(importPreviewData.config.groom || {}) },
          bride: { ...defaultWeddingConfig.bride, ...(importPreviewData.config.bride || {}) },
          events: importPreviewData.config.events || defaultWeddingConfig.events,
          galleryImages: importPreviewData.config.galleryImages || defaultWeddingConfig.galleryImages,
        };

        setEditConfig(mergedConfig);
        await onConfigChange(mergedConfig);
        summaryParts.push("Settings & Ceremonies restored");
      }

      // 2. Restore RSVPs if chosen
      if (importPreviewData.restoreRsvps && importPreviewData.rsvps.length > 0) {
        if (importPreviewData.rsvpImportMode === "replace") {
          // Clear old RSVPs
          if (isSupabaseEnabled && supabase) {
            await supabase.from("rsvps").delete().neq("id", "0");
          } else {
            for (const old of rsvps) {
              try {
                await deleteDoc(doc(db, "rsvps", old.id));
              } catch (e) {
                // Ignore single delete error
              }
            }
          }
        }

        // Write restored RSVPs
        if (isSupabaseEnabled && supabase) {
          const formatted = importPreviewData.rsvps.map((r) => ({
            name: r.name || "Guest",
            phone: r.phone || "",
            guestsCount: Number(r.guestsCount ?? (r as any).guests_count ?? 1),
            guests_count: Number(r.guestsCount ?? (r as any).guests_count ?? 1),
            attend: r.attend !== false,
            message: r.message || "",
            timestamp: r.timestamp || new Date().toISOString()
          }));
          await supabase.from("rsvps").insert(formatted);
        } else {
          // Firestore batch write
          try {
            const batch = writeBatch(db);
            for (const r of importPreviewData.rsvps) {
              const docRef = r.id ? doc(db, "rsvps", r.id) : doc(collection(db, "rsvps"));
              batch.set(docRef, {
                name: r.name || "Guest",
                phone: r.phone || "",
                guestsCount: Number(r.guestsCount ?? (r as any).guests_count ?? 1),
                attend: r.attend !== false,
                message: r.message || "",
                timestamp: r.timestamp || new Date().toISOString()
              });
            }
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, "rsvps");
          }
        }

        // Update local rsvps state
        if (importPreviewData.rsvpImportMode === "replace") {
          setRsvps(importPreviewData.rsvps);
        } else {
          const existingIds = new Set(rsvps.map(r => r.id));
          const added = importPreviewData.rsvps.filter(r => !existingIds.has(r.id));
          setRsvps([...rsvps, ...added]);
        }

        summaryParts.push(`${importPreviewData.rsvps.length} RSVPs restored`);
      }

      setShowImportModal(false);
      setToastMessage(`Backup restored successfully! ${summaryParts.join(" & ")}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err: any) {
      console.error("Restore failed:", err);
      alert("Failed to restore data: " + (err.message || String(err)));
    } finally {
      setIsRestoring(false);
    }
  };

  const totalAttending = rsvps
    .filter((r) => r.attend)
    .reduce((sum, r) => sum + Number(r.guestsCount), 0);
  const totalDeclined = rsvps.filter((r) => !r.attend).length;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="admin-panel-root"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-4xl bg-white border border-pink-300 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-pink-300/20 mb-3 gap-2.5 shrink-0">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div>
                  <h3 className="font-display text-lg sm:text-xl text-pink-900 flex items-center gap-2 font-bold">
                    <Settings size={20} className="text-pink-700" /> Host Dashboard
                  </h3>
                  <p className="text-[10px] text-pink-800/70 uppercase tracking-widest mt-0.5 font-semibold">
                    Manage Content, RSVPs & Backups
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="sm:hidden text-pink-800/80 hover:text-pink-900 text-xs font-bold border border-pink-300/40 rounded-full px-3 py-1 cursor-pointer bg-pink-50"
                >
                  ✕ Close
                </button>
              </div>

              {/* Header Action Buttons (Import, Export & Close) */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/50 text-xs font-bold rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all"
                  title="Import data backup from a JSON file"
                >
                  <Upload size={14} />
                  <span>Import Data</span>
                </button>
                <button
                  onClick={handleExportData}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white border border-amber-500/50 text-xs font-bold rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all"
                  title="Export full data backup to a JSON file"
                >
                  <Download size={14} />
                  <span>Export Data</span>
                </button>
                <button
                  onClick={onClose}
                  className="hidden sm:inline-flex text-pink-800/70 hover:text-pink-900 text-xs font-bold border border-pink-300/30 rounded-full px-3.5 py-1.5 cursor-pointer hover:bg-pink-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {!isAuthenticated ? (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleLogin}
                className="flex flex-col items-center justify-center py-10 space-y-4 my-auto"
              >
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-300/40 flex items-center justify-center text-amber-700 mb-1 shadow-sm">
                  <Key size={26} />
                </div>
                <h4 className="font-display text-xl text-pink-900 font-bold">Host Passcode Verification</h4>
                <p className="text-xs text-pink-800/70 max-w-sm text-center leading-relaxed">
                  Please enter the 4-digit host passcode to access wedding editing tools and guest RSVP management.
                </p>
                <div className="w-full max-w-xs relative">
                  <input
                    type="password"
                    placeholder="Enter Passcode (9456)"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={isLocked}
                    className={`w-full bg-pink-50/70 text-gray-900 border-2 border-pink-300/50 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-amber-500 text-base tracking-widest placeholder:text-pink-700/40 font-bold shadow-inner ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    autoFocus
                  />
                </div>
                {error && <p className="text-rose-600 text-xs font-bold px-2">{error}</p>}
                
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isLocked}
                    className={`bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl shadow-md transition-all ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    Unlock Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload size={13} />
                    <span>Restore From Backup JSON</span>
                  </button>
                </div>
              </motion.form>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Dedicated Persistent Quick Action Bar for Backup & Restore */}
                <div className="bg-gradient-to-r from-amber-50/90 via-pink-50/80 to-emerald-50/90 border border-amber-200/70 rounded-2xl p-2.5 sm:p-3 mb-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                      <HardDrive size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          Data Backup & Restore Center
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          Active
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-600 hidden sm:block">
                        Download full offline backup (JSON) or restore previous wedding settings & RSVPs anytime.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
                      title="Import wedding configuration or RSVPs from a JSON backup file"
                    >
                      <Upload size={13} />
                      <span>Import Data</span>
                    </button>
                    <button
                      onClick={handleExportData}
                      className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
                      title="Export all wedding settings, event details, photos, and RSVPs as JSON"
                    >
                      <Download size={13} />
                      <span>Export Data</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("backup")}
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        activeTab === "backup" 
                          ? "bg-amber-100 border-amber-300 text-amber-900" 
                          : "bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Details →
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                  {/* Sidebar Tabs */}
                  <div className="flex md:flex-col gap-1.5 sm:gap-2 overflow-x-auto md:overflow-y-auto md:w-52 shrink-0 pb-3 md:pb-0 md:pr-3 border-b md:border-b-0 md:border-r border-pink-300/20 mb-3 md:mb-0 scrollbar-none">
                    <button
                      onClick={() => setActiveTab("backup")}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shrink-0 ${activeTab === "backup" ? "bg-amber-500/25 text-amber-950 border border-amber-300 shadow-xs" : "text-amber-900/80 hover:bg-amber-50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-amber-700" />
                        <span>Backup & Restore</span>
                      </div>
                      <span className="text-[9px] bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.5 rounded-md">
                        Import/Export
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab("rsvps")}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors shrink-0 ${activeTab === "rsvps" ? "bg-gold-500/20 text-pink-900 font-bold" : "text-pink-800/60 hover:bg-gold-500/10"}`}
                    >
                      <Users size={16} /> RSVPs ({rsvps.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("couple")}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors shrink-0 ${activeTab === "couple" ? "bg-gold-500/20 text-pink-900 font-bold" : "text-pink-800/60 hover:bg-gold-500/10"}`}
                    >
                      <Edit3 size={16} /> Couple Info
                    </button>
                    <button
                      onClick={() => setActiveTab("events")}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors shrink-0 ${activeTab === "events" ? "bg-gold-500/20 text-pink-900 font-bold" : "text-pink-800/60 hover:bg-gold-500/10"}`}
                    >
                      <Calendar size={16} /> Events Setup
                    </button>
                    <button
                      onClick={() => setActiveTab("media")}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors shrink-0 ${activeTab === "media" ? "bg-gold-500/20 text-pink-900 font-bold" : "text-pink-800/60 hover:bg-gold-500/10"}`}
                    >
                      <Video size={16} /> Teaser & Media
                    </button>
                    <button
                      onClick={() => setActiveTab("database")}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors shrink-0 ${activeTab === "database" ? "bg-gold-500/20 text-pink-900 font-bold" : "text-pink-800/60 hover:bg-gold-500/10"}`}
                    >
                      <Database size={16} /> Database Sync
                    </button>
                  </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto md:pl-4 scrollbar-thin pb-16 md:pb-0">
                  {activeTab === "rsvps" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                      <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
                        <div className="bg-pink-50/40 border border-pink-300/10 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-pink-800/50 uppercase tracking-wider block">RSVPs</span>
                          <span className="text-xl md:text-2xl font-display text-pink-900 mt-1 block">{rsvps.length}</span>
                        </div>
                        <div className="bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-emerald-300/60 uppercase tracking-wider block">Attending</span>
                          <span className="text-xl md:text-2xl font-display text-emerald-400 mt-1 block">{totalAttending}</span>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-500/20 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-rose-300/60 uppercase tracking-wider block">Declined</span>
                          <span className="text-xl md:text-2xl font-display text-rose-400 mt-1 block">{totalDeclined}</span>
                        </div>
                      </div>

                      {/* RSVP Website Visibility Status & Toggle */}
                      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 transition-colors ${
                        editConfig.showRsvp === true 
                          ? "bg-emerald-50/80 border-emerald-200" 
                          : "bg-rose-50/80 border-rose-200"
                      }`}>
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            {editConfig.showRsvp === true ? (
                              <>
                                <Eye size={14} className="text-emerald-700 shrink-0" />
                                <span className="text-emerald-950">RSVP Form is currently Visible on Website</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={14} className="text-rose-700 shrink-0" />
                                <span className="text-rose-950">RSVP Form is currently Hidden from Website</span>
                              </>
                            )}
                          </span>
                          <span className="text-[11px] text-gray-600 block">
                            {editConfig.showRsvp === true 
                              ? "Guests can see the RSVP form on the wedding website and submit their responses." 
                              : "The RSVP section has been removed from the public website for guests as requested."}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = editConfig.showRsvp === true ? false : true;
                            const updated = { ...editConfig, showRsvp: nextVal };
                            setEditConfig(updated);
                            onConfigChange(updated);
                            setToastMessage(nextVal ? "RSVP section is now visible on website" : "RSVP section removed from website");
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0 transition-colors ${
                            editConfig.showRsvp === true
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {editConfig.showRsvp === true ? "Hide RSVP from Website" : "Show RSVP on Website"}
                        </button>
                      </div>

                      <div className="flex flex-wrap justify-between items-center mb-3 gap-2 shrink-0">
                        <span className="text-xs text-pink-800/80 font-bold">Guest Entries ({rsvps.length})</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Import wedding data or RSVPs from JSON"
                          >
                            <Upload size={13} /> Import Data
                          </button>
                          <button
                            onClick={handleExportData}
                            className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Export full backup JSON"
                          >
                            <Download size={13} /> Export Backup
                          </button>
                          <button
                            onClick={exportToCSV}
                            disabled={rsvps.length === 0}
                            className="text-[11px] bg-pink-100 hover:bg-pink-200 border border-pink-300/60 disabled:opacity-40 text-pink-900 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            title="Download CSV spreadsheet"
                          >
                            <FileSpreadsheet size={13} /> CSV
                          </button>
                          <button
                            onClick={handleClearAllRsvps}
                            disabled={rsvps.length === 0}
                            className="text-[11px] bg-rose-50 hover:bg-rose-100 border border-rose-300/60 text-rose-700 disabled:opacity-40 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={13} /> Reset
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto border border-pink-300/20 rounded-2xl bg-white/50">
                        {rsvps.length === 0 ? (
                          <div className="text-center py-12 text-pink-800/40 text-sm">No RSVPs have been submitted yet.</div>
                        ) : (
                          <div className="divide-y divide-gold-400/10">
                            {rsvps.map((record, i) => (
                              <div key={record.id ? `admin-rsvp-${record.id}-${i}` : `admin-rsvp-idx-${i}`} className="p-3.5 flex flex-col md:flex-row justify-between gap-2.5">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-pink-900 text-sm">{record.name}</span>
                                    {record.attend ? (
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        {record.guestsCount} Attending
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">Declined</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-pink-800/50 block mt-0.5">{record.phone}</span>
                                  {record.message && (
                                    <p className="text-xs text-pink-900/90 bg-pink-50/30 border border-pink-300/5 p-2 rounded-lg mt-2 italic">&ldquo;{record.message}&rdquo;</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 self-start md:self-center">
                                  <span className="text-[10px] text-pink-800/40">{new Date(record.timestamp).toLocaleDateString()}</span>
                                  <button
                                    onClick={() => handleDeleteRsvp(record.id)}
                                    title="Delete RSVP"
                                    className="text-pink-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "couple" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Groom Info */}
                        <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                          <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Groom Details</h4>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Name</label>
                            <input type="text" value={editConfig.groom.name} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, name: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Father's Name</label>
                            <input type="text" value={editConfig.groom.fatherName} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, fatherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Mother's Name</label>
                            <input type="text" value={editConfig.groom.motherName} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, motherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Photo (Direct Image URL or Upload)</label>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2 items-center">
                                <FirestoreImage src={editConfig.groom.imageUrl} alt="Groom" className="w-10 h-10 rounded-full object-cover border border-pink-300/30 shrink-0" />
                                <input type="text" value={editConfig.groom.imageUrl} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, imageUrl: e.target.value.trim()}}))} placeholder="Paste direct image URL (https://... or Google Drive)" className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              </div>
                              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "groom")} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Bio</label>
                            <textarea value={editConfig.groom.bio} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, bio: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[80px]" />
                          </div>
                        </div>

                        {/* Bride Info */}
                        <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                          <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Bride Details</h4>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Name</label>
                            <input type="text" value={editConfig.bride.name} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, name: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Father's Name</label>
                            <input type="text" value={editConfig.bride.fatherName} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, fatherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Mother's Name</label>
                            <input type="text" value={editConfig.bride.motherName} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, motherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Photo (Direct Image URL or Upload)</label>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2 items-center">
                                <FirestoreImage src={editConfig.bride.imageUrl} alt="Bride" className="w-10 h-10 rounded-full object-cover border border-pink-300/30 shrink-0" />
                                <input type="text" value={editConfig.bride.imageUrl} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, imageUrl: e.target.value.trim()}}))} placeholder="Paste direct image URL (https://... or Google Drive)" className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              </div>
                              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "bride")} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Bio</label>
                            <textarea value={editConfig.bride.bio} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, bio: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[80px]" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">General Wedding Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-1 md:col-span-2 bg-white/60 p-3.5 rounded-xl border border-pink-300/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div>
                              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <ImageIcon size={14} className="text-pink-700" />
                                Photo Gallery Section Visibility
                              </span>
                              <span className="text-[11px] text-gray-600 block mt-0.5">
                                {editConfig.showGallery !== false 
                                  ? "Gallery is currently VISIBLE to guests on the website." 
                                  : "Gallery is currently HIDDEN from the website."}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditConfig(p => ({ ...p, showGallery: p.showGallery === false ? true : false }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                                editConfig.showGallery !== false
                                  ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300"
                                  : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                              }`}
                            >
                              {editConfig.showGallery !== false ? <><EyeOff size={13} /> Hide Gallery</> : <><Eye size={13} /> Unhide (Show) Gallery</>}
                            </button>
                          </div>

                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Hero Section Tagline</label>
                            <input type="text" value={editConfig.heroTagline} onChange={e => setEditConfig(p => ({...p, heroTagline: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Display Date</label>
                            <input type="text" value={editConfig.displayDate} onChange={e => setEditConfig(p => ({...p, displayDate: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Countdown Target (YYYY-MM-DDTHH:mm:ss)</label>
                            <input type="text" value={editConfig.weddingDate} onChange={e => setEditConfig(p => ({...p, weddingDate: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>

                          <div className="col-span-1 md:col-span-2">
                            {renderGaneshaSection()}
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Thank You Portrait Image (Direct URL or Upload)</label>
                            <div className="flex gap-2">
                              <input type="text" value={editConfig.thankYouImageUrl || ""} onChange={e => setEditConfig(p => ({...p, thankYouImageUrl: e.target.value.trim()}))} placeholder="Paste direct image URL (or leave empty to use Gallery 1)" className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              <input type="file" accept="image/*" onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const base64 = await handleImageUpload(e.target.files[0]);
                                    setEditConfig(prev => ({ ...prev, thankYouImageUrl: base64 }));
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : "Failed to process image.");
                                  }
                                }
                              }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer max-w-[120px]" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Background Music (Google Drive URL / Upload)</label>
                            <div className="flex flex-col gap-2">
                              <input type="text" value={editConfig.musicUrl} onChange={e => setEditConfig(p => ({...p, musicUrl: e.target.value}))} placeholder="https://drive.google.com/file/d/..." className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              <div
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingMusic(true); }}
                                onDragLeave={() => setIsDraggingMusic(false)}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setIsDraggingMusic(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    const file = e.dataTransfer.files[0];
                                    if (file.type.startsWith('audio/')) {
                                      try {
                                        const base64 = await handleImageUpload(file);
                                        setEditConfig(prev => ({ ...prev, musicUrl: base64 }));
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : "Failed to process audio file.");
                                      }
                                    } else {
                                      alert("Please drop an audio file.");
                                    }
                                  }
                                }}
                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDraggingMusic ? 'border-pink-300 bg-gold-400/10' : 'border-pink-300/30 hover:border-pink-300/60'}`}
                              >
                                <input type="file" accept="audio/*" onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    try {
                                      const base64 = await handleImageUpload(e.target.files[0]);
                                      setEditConfig(prev => ({ ...prev, musicUrl: base64 }));
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : "Failed to process audio file.");
                                    }
                                  }
                                }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer w-full" />
                                <p className="text-xs text-pink-800/60 mt-2">or drag and drop audio file here</p>
                              </div>
                              
                              <div className="mt-3 bg-pink-500/5 p-3 rounded-xl border border-pink-300/10 space-y-2">
                                <span className="text-[10px] text-pink-800/80 font-bold uppercase tracking-widest block mb-1">Or Select a Ready-To-Use Premium Wedding Track:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {[
                                    { name: "📯 Royal Shehnai", desc: "Auspicious & Celebratory", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
                                    { name: "🪈 Soulful Divine Flute", desc: "Romantic, Soft & Blissful", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
                                    { name: "🪕 Sacred Sitar Harmony", desc: "Elegant & Traditional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
                                    { name: "🎸 Acoustic Romantic Love", desc: "Modern Sweet Instrumental", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
                                  ].map((track, trackIdx) => (
                                    <button
                                      key={`preset-track-${trackIdx}-${track.name}`}
                                      type="button"
                                      onClick={() => {
                                        setEditConfig(p => ({ ...p, musicUrl: track.url }));
                                      }}
                                      className={`text-left p-2 rounded-lg border transition-all text-xs cursor-pointer ${
                                        editConfig.musicUrl === track.url
                                          ? "bg-pink-100 border-pink-400 text-pink-900 shadow-sm"
                                          : "bg-white/40 border-pink-300/20 text-gray-700 hover:bg-white/70 hover:border-pink-300/40"
                                      }`}
                                    >
                                      <div className="font-semibold">{track.name}</div>
                                      <div className="text-[9px] text-gray-500">{track.desc}</div>
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                                  ⚠️ <strong>Direct Upload Note:</strong> Because of Firestore's 1MB database size limit, uploaded audio files must be under 800KB. For full-length custom songs, please paste a direct web URL of your <code>.mp3</code> file in the input box above.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Footer Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Footer Message</label>
                            <textarea value={editConfig.familyDetails.message} onChange={e => setEditConfig(p => ({...p, familyDetails: {...p.familyDetails, message: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[60px]" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Welcoming Text</label>
                            <input type="text" value={editConfig.familyDetails.welcomingText} onChange={e => setEditConfig(p => ({...p, familyDetails: {...p.familyDetails, welcomingText: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Family Names (Comma separated)</label>
                            <input type="text" value={editConfig.familyDetails.names.join(', ')} onChange={e => setEditConfig(p => ({...p, familyDetails: {...p.familyDetails, names: e.target.value.split(',').map(s => s.trim())}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                        </div>
                      </div>

                      <button onClick={saveChanges} className="w-full bg-gold-gradient text-white font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer">
                        Save Changes
                      </button>
                    </motion.div>
                  )}

                  {activeTab === "events" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-6">
                      {editConfig.events.map((event, index) => (
                        <div key={`event-${index}`} className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4 relative">
                          <div className="flex justify-between items-center border-b border-pink-300/20 pb-2">
                            <h4 className="font-display text-pink-900 text-lg">{event.name}</h4>
                            <button onClick={() => deleteEvent(index)} className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs uppercase tracking-widest cursor-pointer">
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Event Name</label>
                              <input type="text" value={event.name} onChange={e => handleEventChange(index, "name", e.target.value)} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Date</label>
                              <input type="text" value={event.date} onChange={e => handleEventChange(index, "date", e.target.value)} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Time</label>
                              <input type="text" value={event.time} onChange={e => handleEventChange(index, "time", e.target.value)} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Venue Name</label>
                              <input type="text" value={event.venueName} onChange={e => handleEventChange(index, "venueName", e.target.value)} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Event Thumbnail Photo (Direct URL or Upload)</label>
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                  <FirestoreImage src={event.imageUrl} alt={event.name} className="w-10 h-10 rounded object-contain bg-black/20 border border-pink-300/30 shrink-0" />
                                  <input type="text" value={event.imageUrl} onChange={e => handleEventChange(index, "imageUrl", e.target.value.trim())} placeholder="Paste direct image URL (https://..., Google Drive, ImgBB, Unsplash)" className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                                </div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    try {
                                      const base64 = await handleImageUpload(e.target.files[0]);
                                      handleEventChange(index, "imageUrl", base64);
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : "Failed to process image.");
                                    }
                                  }
                                }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer w-full" />
                              </div>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Google Maps Embed Iframe URL</label>
                              <input type="text" value={event.mapEmbedUrl} onChange={e => handleEventChange(index, "mapEmbedUrl", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              <p className="text-[9px] text-pink-800/50 mt-1">Paste the 'src' value from a Google Maps embed iframe.</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-3">
                        <button onClick={addEvent} className="flex-1 bg-gold-500/10 hover:bg-gold-500/20 text-pink-900 border border-pink-300/30 font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer transition-colors">
                          + Add New Event
                        </button>
                        <button onClick={saveChanges} className="flex-1 bg-gold-gradient text-white font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer">
                          Save Events Setup
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "media" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
                      {renderGaneshaSection()}

                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Hero Background Photo</h4>
                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Photo (Direct Image URL or Upload)</label>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                              <FirestoreImage src={editConfig.heroImageUrl} alt="Hero" className="w-20 h-12 rounded object-contain bg-black/20 border border-pink-300/30 shrink-0" />
                              <input type="text" value={editConfig.heroImageUrl} onChange={e => setEditConfig(prev => ({...prev, heroImageUrl: e.target.value.trim()}))} placeholder="Paste direct image URL (https://..., Google Drive, ImgBB, Unsplash)" className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <input type="file" accept="image/*" onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                try {
                                  const base64 = await handleImageUpload(e.target.files[0]);
                                  setEditConfig(prev => ({ ...prev, heroImageUrl: base64 }));
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to process image.");
                                }
                              }
                            }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2 flex justify-between items-center">
                          Teaser Video Configuration
                          {editConfig.youtubeEmbedUrl && (
                            <button onClick={() => processYouTubeUrl("")} className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs uppercase tracking-widest cursor-pointer font-sans">
                              <Trash2 size={12} /> Remove Video
                            </button>
                          )}
                        </h4>
                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">YouTube Video Link (Paste regular link or embed link)</label>
                          <input 
                            type="text" 
                            value={editConfig.youtubeEmbedUrl} 
                            onChange={e => processYouTubeUrl(e.target.value)} 
                            placeholder="e.g. https://www.youtube.com/watch?v=XXXXXXX"
                            className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" 
                          />
                          <p className="text-[10px] text-amber-400/80 mt-2 font-medium">To disable the video section entirely, simply clear this input field and save.</p>
                        </div>
                        {editConfig.youtubeEmbedUrl && (
                          <div className="aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-pink-300/30 mt-4">
                            <iframe className="w-full h-full" src={editConfig.youtubeEmbedUrl} frameBorder="0" allowFullScreen />
                          </div>
                        )}
                      </div>

                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <div className="border-b border-pink-300/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-display text-pink-900 text-lg flex items-center gap-2">
                              <ImageIcon size={18} className="text-pink-700" />
                              Photo Gallery Setup
                            </h4>
                            <p className="text-[11px] text-pink-800/70 mt-0.5">
                              Toggle section visibility and configure couple images and captions.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditConfig(p => ({ ...p, showGallery: p.showGallery === false ? true : false }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0 ${
                              editConfig.showGallery !== false
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300"
                            }`}
                          >
                            {editConfig.showGallery !== false ? (
                              <>
                                <Eye size={14} className="text-emerald-700" />
                                <span>Gallery: Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={14} className="text-rose-700" />
                                <span>Gallery: Hidden</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Status alert card with action */}
                        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          editConfig.showGallery !== false 
                            ? "bg-emerald-50/80 border-emerald-200" 
                            : "bg-rose-50/80 border-rose-200"
                        }`}>
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-gray-800 block">
                              {editConfig.showGallery !== false ? "✓ Photo Gallery is currently Visible on Website" : "✕ Photo Gallery is currently Hidden from Website"}
                            </span>
                            <span className="text-[11px] text-gray-600 block">
                              {editConfig.showGallery !== false 
                                ? "Guests will be able to see your Photo Gallery carousel and fullscreen viewer on the invitation." 
                                : "The Photo Gallery section is hidden from the public website for guests."}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditConfig(p => ({ ...p, showGallery: p.showGallery === false ? true : false }))}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0 transition-colors ${
                              editConfig.showGallery !== false
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {editConfig.showGallery !== false ? "Hide Gallery Section" : "Unhide (Show) Gallery Section"}
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Gallery Subtitle</label>
                          <input type="text" value={editConfig.gallerySubtitle} onChange={e => setEditConfig(p => ({...p, gallerySubtitle: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                        </div>
                        <div className="space-y-4 mt-4">
                          {editConfig.galleryImages.map((img, idx) => (
                            <div key={`admin-gallery-${idx}`} className="flex gap-4 items-center bg-white/40 p-3 rounded-xl border border-pink-300/10 relative">
                              <FirestoreImage src={img.url} className="w-16 h-16 rounded object-contain bg-black/20 border border-pink-300/20 shrink-0" alt="" />
                              <div className="flex-1 space-y-2">
                                <input type="text" value={img.caption} onChange={e => updateGalleryPhoto(idx, "caption", e.target.value)} placeholder="Caption" className="w-full bg-pink-50/50 text-gray-900 border border-pink-300/20 rounded-lg px-2 py-1.5 text-xs focus:border-pink-300 outline-none" />
                                <div className="flex gap-2 items-center">
                                  <input type="text" value={img.url} onChange={e => updateGalleryPhoto(idx, "url", e.target.value)} placeholder="Direct URL (https://..., Google Drive, ImgBB)" className="w-full bg-pink-50/50 text-gray-900 border border-pink-300/20 rounded-lg px-2 py-1.5 text-[10px] focus:border-pink-300 outline-none" />
                                  <input type="file" accept="image/*" onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      try {
                                        const base64 = await handleImageUpload(e.target.files[0]);
                                        updateGalleryPhoto(idx, "url", base64);
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : "Failed to process image.");
                                      }
                                    }
                                  }} className="text-[9px] text-pink-800/60 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-gold-500/20 file:text-pink-900 cursor-pointer max-w-[120px]" />
                                </div>
                              </div>
                              <button onClick={() => deleteGalleryPhoto(idx)} className="text-rose-400 hover:text-rose-300 p-2 cursor-pointer transition-colors absolute top-2 right-2">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button onClick={addGalleryPhoto} className="w-full bg-gold-500/10 hover:bg-gold-500/20 text-pink-900 border border-pink-300/30 font-bold uppercase text-sm tracking-wider py-2 rounded-lg cursor-pointer transition-colors">
                            + Add Photo
                          </button>
                        </div>
                      </div>

                      <button onClick={saveChanges} className="w-full bg-gold-gradient text-white font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer">
                        Save Media Settings
                      </button>
                    </motion.div>
                  )}

                  {activeTab === "backup" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      {/* Top Header Card */}
                      <div className="bg-gradient-to-br from-amber-50 to-pink-50 p-5 rounded-2xl border border-amber-200/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200/60 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                              <HardDrive size={22} />
                            </div>
                            <div>
                              <h4 className="font-display text-pink-950 text-lg font-bold">
                                Data Backup & Restore Center
                              </h4>
                              <p className="text-xs text-gray-600">
                                Download a full snapshot of your wedding data or restore from a JSON backup file
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Live Sync Active
                            </span>
                          </div>
                        </div>

                        {/* Current Data Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                          <div className="bg-white/80 border border-pink-200 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Couple Info</span>
                            <span className="text-xs font-bold text-pink-950 truncate block mt-0.5">
                              {editConfig.groom?.name?.split(" ")[0]} & {editConfig.bride?.name?.split(" ")[0]}
                            </span>
                          </div>
                          <div className="bg-white/80 border border-pink-200 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Ceremonies</span>
                            <span className="text-base font-bold text-amber-900 block mt-0.5">
                              {editConfig.events?.length || 0} Events
                            </span>
                          </div>
                          <div className="bg-white/80 border border-pink-200 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Gallery Photos</span>
                            <span className="text-base font-bold text-amber-900 block mt-0.5">
                              {editConfig.galleryImages?.length || 0} Photos
                            </span>
                          </div>
                          <div className="bg-white/80 border border-pink-200 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Total RSVPs</span>
                            <span className="text-base font-bold text-pink-900 block mt-0.5">
                              {rsvps.length} Entries
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Two Action Cards: Export and Import */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* 1. EXPORT DATA CARD */}
                        <div className="bg-white p-5 rounded-2xl border-2 border-amber-300/80 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                          <div className="space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                              <Download size={20} />
                            </div>
                            <div>
                              <h5 className="font-display text-base font-bold text-gray-900">
                                1. Export Data Backup
                              </h5>
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Download a complete offline backup file (JSON format) containing all your wedding customizations:
                              </p>
                            </div>
                            <ul className="text-[11px] text-gray-600 space-y-1.5 pl-1">
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>Couple names, bios, hero tagline & family details</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>All wedding ceremony dates, times, addresses & map links</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>Full gallery photos, background audio & video links</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>All guest RSVPs ({rsvps.length} registered responses)</span>
                              </li>
                            </ul>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={handleExportData}
                              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <Download size={16} />
                              <span>Download Full Backup (.JSON)</span>
                            </button>
                            <button
                              onClick={exportToCSV}
                              disabled={rsvps.length === 0}
                              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                            >
                              <FileSpreadsheet size={15} />
                              <span>Export RSVPs Only (.CSV)</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. IMPORT DATA CARD */}
                        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300/80 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                          <div className="space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                              <Upload size={20} />
                            </div>
                            <div>
                              <h5 className="font-display text-base font-bold text-gray-900">
                                2. Import Data / Restore
                              </h5>
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Upload a previously downloaded JSON backup file to restore your wedding website immediately:
                              </p>
                            </div>
                            <ul className="text-[11px] text-gray-600 space-y-1.5 pl-1">
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>Preview backup contents safely before applying</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>Choose to restore settings, RSVPs, or both</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>Choose to merge or replace existing RSVP records</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600 shrink-0" />
                                <span>Instantly saves to active database (Firebase/Supabase)</span>
                              </li>
                            </ul>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <Upload size={16} />
                              <span>Select Backup File (.JSON)</span>
                            </button>
                            <p className="text-[10px] text-center text-gray-400">
                              Supports all valid wedding backup .json files
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Quick Copy Backup to Clipboard */}
                      <div className="bg-pink-50/40 p-4 rounded-2xl border border-pink-300/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-gray-800 block">Copy Raw JSON to Clipboard</span>
                          <span className="text-[11px] text-gray-500 block">
                            Directly copy raw backup text data to paste into an email or text file
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const backupData = {
                                app: "Royal Hindu Wedding Invitation",
                                backupVersion: "1.0",
                                exportedAt: new Date().toISOString(),
                                config: editConfig,
                                rsvps: rsvps
                              };
                              navigator.clipboard.writeText(JSON.stringify(backupData, null, 2));
                              setToastMessage("Backup JSON copied to clipboard!");
                              setShowToast(true);
                              setTimeout(() => setShowToast(false), 3000);
                            } catch (e: any) {
                              alert("Failed to copy: " + e.message);
                            }
                          }}
                          className="bg-white hover:bg-pink-50 text-pink-900 border border-pink-300 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                        >
                          <Copy size={14} />
                          <span>Copy Backup JSON</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "database" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="bg-pink-50/30 p-5 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2 flex items-center gap-2">
                          <Database size={20} className="text-pink-700" />
                          Remix Database & Data Isolation Status
                        </h4>

                        <div className="bg-emerald-50/80 border border-emerald-300/50 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            100% Isolated Database Configured
                          </div>
                          <p className="text-[11px] text-emerald-800 leading-relaxed">
                            This website operates with its own isolated Firebase Firestore database. All RSVP responses, guest records, customized photos, audio, and couple details are stored completely separately and will never overlap or mix with the official website or any external data pack.
                          </p>
                          <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-emerald-900 font-mono">
                            <div><span className="text-emerald-700 font-sans font-semibold">Project ID:</span> amiable-tape-46w9q</div>
                            <div><span className="text-emerald-700 font-sans font-semibold">Database:</span> ai-studio-remixhinduweddin-5cdd2c03-d01a-4805-a62a-d4966a1b77ce</div>
                          </div>
                        </div>

                        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 space-y-2 text-xs text-amber-900">
                          <div className="flex items-center gap-2 font-bold text-amber-950">
                            <AlertCircle size={15} className="text-amber-700 shrink-0" />
                            <span>Firestore Spark Free Tier Quota Notice</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Google Cloud Firestore free tier provides a daily allowance of reads and writes per database. If high visitor traffic hits the daily limit, the website automatically switches to resilient offline/cached mode so guests never experience downtime. Free quotas reset automatically every 24 hours at midnight PST.
                          </p>
                          <div className="pt-1">
                            <a
                              href="https://console.firebase.google.com/project/amiable-tape-46w9q/firestore/databases/ai-studio-remixhinduweddin-5cdd2c03-d01a-4805-a62a-d4966a1b77ce/data?openUpgradeDialog=true"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                            >
                              <span>Open Firebase Console to view quota or upgrade plan →</span>
                            </a>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/40 p-4 rounded-xl border border-pink-300/10 space-y-3">
                            <span className="text-[10px] text-pink-800/60 uppercase tracking-widest font-semibold">Connection Settings</span>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">Database Driver:</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Firebase Firestore (Isolated)
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed">
                                {isSupabaseEnabled 
                                  ? "Dual-sync mode active with Supabase." 
                                  : "Using dedicated Google Cloud Firestore with real-time listeners and secure rules."}
                              </p>
                            </div>
                          </div>

                          <div className="bg-white/40 p-4 rounded-xl border border-pink-300/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-pink-800/60 uppercase tracking-widest font-semibold">Table Diagnostics</span>
                              <button 
                                onClick={runDiagnostics} 
                                disabled={dbDiagnostics.checking || !isSupabaseEnabled}
                                className="text-[10px] text-pink-900 hover:text-pink-700 font-bold uppercase tracking-wider underline disabled:opacity-50 cursor-pointer"
                              >
                                {dbDiagnostics.checking ? "Checking..." : "Re-Run Check"}
                              </button>
                            </div>

                            <div className="space-y-2.5 text-xs">
                              <div className="border-b border-pink-300/10 pb-1.5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600 font-medium">`settings` Table:</span>
                                  {!isSupabaseEnabled ? (
                                    <span className="text-gray-400">N/A</span>
                                  ) : dbDiagnostics.settings ? (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Accessible</span>
                                  ) : (
                                    <span className="text-rose-600 font-semibold flex items-center gap-1"><X size={12} /> Inaccessible</span>
                                  )}
                                </div>
                                {isSupabaseEnabled && !dbDiagnostics.settings && dbDiagnostics.details?.settings && (
                                  <div className="bg-rose-50 text-[10px] text-rose-700 font-mono p-1.5 rounded border border-rose-100 overflow-x-auto leading-normal">
                                    {dbDiagnostics.details.settings}
                                  </div>
                                )}
                              </div>

                              <div className="border-b border-pink-300/10 pb-1.5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600 font-medium">`rsvps` Table:</span>
                                  {!isSupabaseEnabled ? (
                                    <span className="text-gray-400">N/A</span>
                                  ) : dbDiagnostics.rsvps ? (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Accessible</span>
                                  ) : (
                                    <span className="text-rose-600 font-semibold flex items-center gap-1"><X size={12} /> Inaccessible</span>
                                  )}
                                </div>
                                {isSupabaseEnabled && !dbDiagnostics.rsvps && dbDiagnostics.details?.rsvps && (
                                  <div className="bg-rose-50 text-[10px] text-rose-700 font-mono p-1.5 rounded border border-rose-100 overflow-x-auto leading-normal">
                                    {dbDiagnostics.details.rsvps}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600 font-medium">`fs_files` Table:</span>
                                  {!isSupabaseEnabled ? (
                                    <span className="text-gray-400">N/A</span>
                                  ) : dbDiagnostics.fs_files ? (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Accessible</span>
                                  ) : (
                                    <span className="text-rose-600 font-semibold flex items-center gap-1"><X size={12} /> Inaccessible</span>
                                  )}
                                </div>
                                {isSupabaseEnabled && !dbDiagnostics.fs_files && dbDiagnostics.details?.fs_files && (
                                  <div className="bg-rose-50 text-[10px] text-rose-700 font-mono p-1.5 rounded border border-rose-100 overflow-x-auto leading-normal">
                                    {dbDiagnostics.details.fs_files}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isSupabaseEnabled && (!dbDiagnostics.settings || !dbDiagnostics.rsvps || !dbDiagnostics.fs_files) && dbDiagnostics.checked && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5 items-start">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                            <div>
                              <h5 className="text-xs font-bold text-amber-900">Database Tables Missing</h5>
                              <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
                                Supabase credentials are set, but the tables do not exist in your Supabase project yet. 
                                Please use the SQL schema setup tool below to create the required tables in your Supabase Dashboard SQL Editor.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-pink-50/30 p-5 rounded-2xl border border-pink-300/10 space-y-4">
                        <div className="flex items-center justify-between border-b border-pink-300/20 pb-2">
                          <h4 className="font-display text-pink-900 text-lg">
                            Supabase SQL Setup Guide
                          </h4>
                          <button
                            onClick={() => {
                              const sqlText = `-- SUPABASE SQL SETUP SCRIPT
-- Copy and paste this script into your Supabase Dashboard SQL Editor (https://supabase.com)
-- to automatically create all the tables and setup real-time subscriptions!

-- 1. Create the settings table for saving the dynamic configurations
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the rsvps table for capturing event registrations
CREATE TABLE IF NOT EXISTS public.rsvps (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    guests_count INTEGER DEFAULT 0,
    guestsCount INTEGER DEFAULT 0, -- Support both camelCase and snake_case
    attend BOOLEAN DEFAULT TRUE,
    message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the fs_files table for background audio and image upload chunks
CREATE TABLE IF NOT EXISTS public.fs_files (
    id TEXT PRIMARY KEY, -- chunkId (e.g. fileId_index)
    fileId TEXT NOT NULL,
    index INTEGER NOT NULL,
    data TEXT NOT NULL, -- Base64 data chunk
    totalChunks INTEGER NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disable Row Level Security (RLS) for public access or configure policy:
-- Note: For simple event invitations, you can disable RLS or allow all reads/writes.
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fs_files DISABLE ROW LEVEL SECURITY;

-- 5. Insert initial empty config if not exists to avoid empty states
INSERT INTO public.settings (id, data)
VALUES ('config', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 6. Enable Realtime for the tables safely
-- We use separate PL/pgSQL DO blocks to handle 'duplicate_object' (42710)
-- exceptions, meaning they won't halt execution if the table is already in the publication!
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'settings table is already in publication.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add settings to publication: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'rsvps table is already in publication.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add rsvps to publication: %', SQLERRM;
END $$;`;
                              navigator.clipboard.writeText(sqlText);
                              alert("SQL Schema script copied to clipboard successfully!");
                            }}
                            className="text-xs bg-gold-gradient text-white font-semibold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Copy size={12} /> Copy SQL Script
                          </button>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                          Follow these simple steps to complete your database setup:
                        </p>
                        
                        <ol className="list-decimal list-inside text-[11px] text-gray-600 space-y-2 pl-1 leading-relaxed">
                          <li>Go to your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-pink-900 font-bold underline">Supabase Dashboard</a> and open your project.</li>
                          <li>Click on the <strong>"SQL Editor"</strong> icon in the left-hand navigation bar.</li>
                          <li>Click on <strong>"New Query"</strong> to create a blank query tab.</li>
                          <li>Click the <strong>"Copy SQL Script"</strong> button above, paste it into the editor, and click <strong>"Run"</strong>.</li>
                          <li>Once executed, click the <strong>"Re-Run Check"</strong> button in Table Diagnostics to verify active connection!</li>
                        </ol>

                        <div className="bg-white/50 p-3.5 rounded-xl border border-pink-300/10 max-h-48 overflow-y-auto scrollbar-thin">
                          <pre className="text-[10px] text-gray-700 font-mono select-all leading-normal whitespace-pre-wrap">
{`CREATE TABLE public.settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rsvps (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    guests_count INTEGER DEFAULT 0,
    guestsCount INTEGER DEFAULT 0,
    attend BOOLEAN DEFAULT TRUE,
    message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.fs_files (
    id TEXT PRIMARY KEY,
    fileId TEXT NOT NULL,
    index INTEGER NOT NULL,
    data TEXT NOT NULL,
    totalChunks INTEGER NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);`}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>

      {/* Import Preview & Confirmation Modal */}
      <AnimatePresence>
        {showImportModal && importPreviewData && (
          <motion.div
            key="import-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border-2 border-pink-300 rounded-3xl p-6 shadow-2xl max-w-lg w-full relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-pink-200">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-800 flex items-center justify-center">
                    <Upload size={18} />
                  </div>
                  <div>
                    <h4 className="font-display text-lg text-pink-900 font-bold">Restore Backup</h4>
                    <p className="text-[11px] text-gray-500">Review details before applying</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={isRestoring}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* File Info Card */}
              <div className="bg-pink-50/60 border border-pink-200/80 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>File:</span>
                  <span className="font-mono font-medium text-pink-950 truncate max-w-[240px]">{importPreviewData.fileName}</span>
                </div>
                {importPreviewData.exportedAt && (
                  <div className="flex justify-between text-gray-600">
                    <span>Exported Date:</span>
                    <span className="font-medium text-gray-800">{new Date(importPreviewData.exportedAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Couple:</span>
                  <span className="font-bold text-pink-900">{importPreviewData.weddingGroom} & {importPreviewData.weddingBride}</span>
                </div>
              </div>

              {/* Detected Content Chips */}
              <div>
                <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-2">
                  Detected Backup Contents
                </label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl">
                    <span className="text-[10px] text-amber-700 block uppercase">Events</span>
                    <span className="text-base font-bold text-amber-900">{importPreviewData.eventsCount}</span>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-2 rounded-xl">
                    <span className="text-[10px] text-purple-700 block uppercase">Photos</span>
                    <span className="text-base font-bold text-purple-900">{importPreviewData.galleryCount}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                    <span className="text-[10px] text-emerald-700 block uppercase">RSVPs</span>
                    <span className="text-base font-bold text-emerald-900">{importPreviewData.rsvpsCount}</span>
                  </div>
                </div>
              </div>

              {/* Restore Options Selection */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block">
                  Select Data to Restore
                </label>

                {importPreviewData.config && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-pink-200 bg-white hover:bg-pink-50/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={importPreviewData.restoreConfig}
                      onChange={(e) => setImportPreviewData({ ...importPreviewData, restoreConfig: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-pink-700 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-pink-950 block">Wedding Settings & Content</span>
                      <span className="text-[11px] text-gray-500">
                        Couple names & bios, {importPreviewData.eventsCount} ceremonies, {importPreviewData.galleryCount} gallery pictures, music & media links.
                      </span>
                    </div>
                  </label>
                )}

                {importPreviewData.rsvpsCount > 0 && (
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-pink-200 bg-white hover:bg-pink-50/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={importPreviewData.restoreRsvps}
                        onChange={(e) => setImportPreviewData({ ...importPreviewData, restoreRsvps: e.target.checked })}
                        className="mt-1 w-4 h-4 accent-pink-700 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-pink-950 block">
                          Guest RSVPs ({importPreviewData.rsvpsCount} entries)
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Restore guest attendance responses, phone numbers, and heartfelt wishes.
                        </span>
                      </div>
                    </label>

                    {importPreviewData.restoreRsvps && (
                      <div className="ml-7 p-2.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs text-gray-700">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">
                          RSVP Import Strategy:
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rsvpMode"
                            checked={importPreviewData.rsvpImportMode === "replace"}
                            onChange={() => setImportPreviewData({ ...importPreviewData, rsvpImportMode: "replace" })}
                            className="accent-pink-700 cursor-pointer"
                          />
                          <span>Replace existing RSVPs with backup entries</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rsvpMode"
                            checked={importPreviewData.rsvpImportMode === "merge"}
                            onChange={() => setImportPreviewData({ ...importPreviewData, rsvpImportMode: "merge" })}
                            className="accent-pink-700 cursor-pointer"
                          />
                          <span>Merge backup with existing RSVPs</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Warning note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Confirming will update your active database records in real-time. Please make sure you want to apply these changes.
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-pink-200">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  disabled={isRestoring}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs uppercase tracking-wider hover:bg-gray-100 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isRestoring || (!importPreviewData.restoreConfig && !importPreviewData.restoreRsvps)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gold-gradient text-white font-bold text-xs uppercase tracking-wider shadow-md hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Restoring...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Confirm & Restore
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

