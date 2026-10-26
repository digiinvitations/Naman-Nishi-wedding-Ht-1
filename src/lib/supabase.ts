import { createClient } from "@supabase/supabase-js";
import { WeddingConfig } from "../weddingConfig";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

// Only enable if both keys are provided
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Interface for RSVP database record
export interface RSVPRecord {
  id: string;
  name: string;
  phone: string;
  guestsCount: number;
  attend: boolean;
  message: string;
  timestamp: string;
}

/**
 * DB helper functions that seamlessly switch between Supabase and Firebase (fallback)
 */

// 1. Settings / Configuration
export async function saveConfigToDb(newConfig: WeddingConfig, fallbackSave: () => Promise<void>, clientId: string = "config") {
  if (isSupabaseEnabled && supabase) {
    try {
      // We will save to "settings" table with ID clientId (e.g. config or October T1 Clients -1)
      const { error } = await supabase
        .from("settings")
        .upsert({ id: clientId, data: newConfig });
        
      if (error) {
        console.warn("Supabase settings save failed (trying fallback table config_settings):", error);
        const { error: error2 } = await supabase
          .from("config_settings")
          .upsert({ id: clientId, data: newConfig });
          
        if (error2) throw error2;
      }
      return;
    } catch (e) {
      console.log("Supabase failed to save config, running fallback to Firestore...", e);
    }
  }
  // Run original firebase fallback
  await fallbackSave();
}

// 2. RSVP Add
export async function addRsvpToDb(newRsvp: Omit<RSVPRecord, "id">, fallbackAdd: () => Promise<any>) {
  if (isSupabaseEnabled && supabase) {
    try {
      // Map keys to support both camelCase and snake_case database schema designs
      const { error } = await supabase
        .from("rsvps")
        .insert({
          name: newRsvp.name,
          phone: newRsvp.phone,
          guestsCount: newRsvp.guestsCount,
          guests_count: newRsvp.guestsCount, // database design might use snake_case
          attend: newRsvp.attend,
          message: newRsvp.message,
          timestamp: newRsvp.timestamp
        });
        
      if (error) throw error;
      return;
    } catch (e) {
      console.log("Supabase failed to add RSVP, running fallback to Firestore...", e);
    }
  }
  return await fallbackAdd();
}

// 3. Upload File Chunk (FSDB)
export async function uploadChunkToDb(chunkData: {
  chunkId: string;
  fileId: string;
  index: number;
  data: string;
  totalChunks: number;
  createdAt: string;
}, fallbackUpload: () => Promise<void>) {
  if (isSupabaseEnabled && supabase) {
    try {
      // Try to save to "fs_files" first
      const { error } = await supabase
        .from("fs_files")
        .upsert({
          id: chunkData.chunkId,
          fileId: chunkData.fileId,
          index: chunkData.index,
          data: chunkData.data,
          totalChunks: chunkData.totalChunks,
          createdAt: chunkData.createdAt
        });

      if (error) {
        // Try camelCase table name "fsFiles"
        console.warn("Supabase fs_files table failed, trying fsFiles...", error);
        const { error: error2 } = await supabase
          .from("fsFiles")
          .upsert({
            id: chunkData.chunkId,
            fileId: chunkData.fileId,
            index: chunkData.index,
            data: chunkData.data,
            totalChunks: chunkData.totalChunks,
            createdAt: chunkData.createdAt
          });
          
        if (error2) throw error2;
      }
      return;
    } catch (e) {
      console.log("Supabase failed to upload file chunk, running fallback to Firestore...", e);
    }
  }
  await fallbackUpload();
}

// 4. Fetch File Chunks (FSDB)
export async function fetchChunksFromDb(fileId: string, fallbackFetch: () => Promise<string>): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    try {
      // Try from fs_files ordered by index asc
      let { data, error } = await supabase
        .from("fs_files")
        .select("data")
        .eq("fileId", fileId)
        .order("index", { ascending: true });

      if (error || !data || data.length === 0) {
        // Try fsFiles
        const res = await supabase
          .from("fsFiles")
          .select("data")
          .eq("fileId", fileId)
          .order("index", { ascending: true });
          
        data = res.data;
        error = res.error;
      }

      if (data && data.length > 0) {
        return data.map((chunk: any) => chunk.data).join("");
      }
    } catch (e) {
      console.log("Supabase failed to fetch chunks, running fallback to Firestore...", e);
    }
  }
  return await fallbackFetch();
}

/**
 * Check which tables are accessible in Supabase
 */
export async function checkSupabaseTables(): Promise<{
  settings: boolean;
  rsvps: boolean;
  fs_files: boolean;
  error?: string;
  details?: {
    settings?: string;
    rsvps?: string;
    fs_files?: string;
  };
}> {
  const status = { settings: false, rsvps: false, fs_files: false };
  const details: { settings?: string; rsvps?: string; fs_files?: string } = {};
  if (!isSupabaseEnabled || !supabase) {
    return { ...status, error: "Supabase keys are not set in your settings/environment." };
  }

  try {
    // 1. Check settings
    const { error: errSettings } = await supabase.from("settings").select("id").limit(1);
    if (errSettings) {
      details.settings = `${errSettings.code || 'ERROR'}: ${errSettings.message}`;
      status.settings = false;
    } else {
      status.settings = true;
    }

    // 2. Check rsvps
    const { error: errRsvps } = await supabase.from("rsvps").select("id").limit(1);
    if (errRsvps) {
      details.rsvps = `${errRsvps.code || 'ERROR'}: ${errRsvps.message}`;
      status.rsvps = false;
    } else {
      status.rsvps = true;
    }

    // 3. Check fs_files / fsFiles
    const { error: errFsFiles } = await supabase.from("fs_files").select("id").limit(1);
    if (!errFsFiles) {
      status.fs_files = true;
    } else {
      const { error: errFsFiles2 } = await supabase.from("fsFiles").select("id").limit(1);
      if (errFsFiles2) {
        details.fs_files = `fs_files: ${errFsFiles.message} | fsFiles: ${errFsFiles2.message}`;
        status.fs_files = false;
      } else {
        status.fs_files = true;
      }
    }

    const firstError = errSettings || errRsvps || errFsFiles;
    return {
      ...status,
      error: firstError ? "Some tables are inaccessible. Check details below." : undefined,
      details
    };
  } catch (err: any) {
    return { ...status, error: err?.message || String(err), details };
  }
}
