import { db, handleFirestoreError, OperationType } from "./firebase";
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { uploadChunkToDb, fetchChunksFromDb } from "./supabase";

const CHUNK_SIZE = 500000;
const DIRECT_RETURN_THRESHOLD = 1000000; // 1MB direct return threshold to avoid Firestore quota limits on Vercel

export async function uploadToFsdb(base64: string): Promise<string> {
  // If it's small enough, just return the base64 directly to save reads/writes
  if (base64.length < DIRECT_RETURN_THRESHOLD) {
    return base64;
  }

  const fileId = `fsdb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const chunks = [];
  
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.substring(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `${fileId}_${i}`;
    const chunkData = {
      chunkId,
      fileId,
      index: i,
      data: chunks[i],
      totalChunks: chunks.length,
      createdAt: new Date().toISOString()
    };

    await uploadChunkToDb(chunkData, async () => {
      try {
        await setDoc(doc(db, "fsFiles", chunkId), {
          fileId,
          index: i,
          data: chunks[i],
          totalChunks: chunks.length,
          createdAt: chunkData.createdAt
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `fsFiles/${chunkId}`);
      }
    });
  }

  return `fsdb://${fileId}`;
}

const memoryCache = new Map<string, string>();
// Isolated cache namespace for this remixed applet
const IDB_STORE_NAME = "FSDB_Cache_remix_5cdd2c03";

// Simple IndexedDB wrapper for persistent caching with isolated store
function getIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_STORE_NAME, 1);
    request.onupgradeneeded = (e) => {
      const idb = (e.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains("files")) {
        idb.createObjectStore("files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromIDB(key: string): Promise<string | null> {
  try {
    const idb = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function saveToIDB(key: string, value: string): Promise<void> {
  try {
    const idb = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    // Ignore cache write errors
  }
}

export function transformGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Handle drive.google.com/file/d/ID/view format
  const match1 = url.match(/\/file\/d\/([^/]+)/);
  if (match1 && match1[1]) {
    return `https://drive.google.com/uc?export=download&id=${match1[1]}`;
  }
  
  // Handle drive.google.com/open?id=ID format
  const match2 = url.match(/id=([^&]+)/);
  if (url.includes('drive.google.com') && match2 && match2[1]) {
    return `https://drive.google.com/uc?export=download&id=${match2[1]}`;
  }
  
  return url;
}

let isFsdbQuotaExceeded = false;

export async function fetchFromFsdb(fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;
  if (!fileUrl.startsWith("fsdb://")) return transformGoogleDriveUrl(fileUrl);
  
  if (memoryCache.has(fileUrl)) {
    return memoryCache.get(fileUrl)!;
  }

  const idbCache = await getFromIDB(fileUrl);
  if (idbCache) {
    memoryCache.set(fileUrl, idbCache);
    return idbCache;
  }

  // If quota was already exceeded during this session, avoid failing network requests
  if (isFsdbQuotaExceeded) {
    return "";
  }

  const fileId = fileUrl.replace("fsdb://", "");

  const result = await fetchChunksFromDb(fileId, async () => {
    const q = query(
      collection(db, "fsFiles"),
      where("fileId", "==", fileId)
    );
    
    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return "";

      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const indexA = a.data().index ?? 0;
        const indexB = b.data().index ?? 0;
        return indexA - indexB;
      });

      let base64 = "";
      sortedDocs.forEach(doc => {
        base64 += doc.data().data;
      });
      return base64;
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("Quota exceeded") || msg.includes("quota metric") || msg.includes("offline")) {
        isFsdbQuotaExceeded = true;
        console.warn("Firestore daily free quota limit reached while reading fsdb chunks. Using fallback asset.");
      } else {
        console.warn("Could not fetch file from fsdb:", msg);
      }
      return "";
    }
  });

  if (result) {
    memoryCache.set(fileUrl, result);
    saveToIDB(fileUrl, result);
  }
  return result;
}
