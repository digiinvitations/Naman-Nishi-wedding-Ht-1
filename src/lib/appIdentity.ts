/**
 * Application Identity & Data Partitioning
 * Ensures strict, 100% data isolation between this master website
 * ('Remix Hindu Wedding template 1') and any upcoming remix websites
 * (specifically 'hindu template 1 nov client 1').
 * All settings, RSVPs, backups, and media caches are partitioned by ID.
 */

export const MASTER_APP_ID = "5cdd2c03-d01a-4805-a62a-d4966a1b77ce";
export const MASTER_PARTITION_ID = "remix_hindu_wedding_template_1";
export const UPCOMING_REMIX_PARTITION_ID = "hindu_template_1_nov_client_1";

export const KNOWN_PARTITIONS = [
  {
    id: MASTER_PARTITION_ID,
    name: "Remix Hindu Wedding template 1 (Official Master)",
    description: "Official original website for Naman & Nishi"
  },
  {
    id: UPCOMING_REMIX_PARTITION_ID,
    name: "hindu template 1 nov client 1",
    description: "Dedicated partition for upcoming Nov Client 1 remix"
  }
];

export function getAppPartitionId(): string {
  if (typeof window === "undefined") {
    return MASTER_PARTITION_ID;
  }

  // 1. Explicit query parameter has highest priority: ?client=... or ?remix=... or ?clientId=...
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("client") || params.get("clientId") || params.get("remix");
  if (explicit && explicit.trim()) {
    const sanitized = explicit.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (sanitized) return sanitized;
  }

  // 2. Host-selected active partition from localStorage
  try {
    const saved = localStorage.getItem("active_app_partition_id");
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {}

  // 3. Automatic detection by page title, URL path, or hostname
  const title = (document.title || "").toLowerCase();
  const host = (window.location.hostname || "").toLowerCase();
  const path = (window.location.pathname || "").toLowerCase();

  if (
    title.includes("nov client 1") ||
    title.includes("nov-client-1") ||
    host.includes("nov-client-1") ||
    host.includes("novclient1") ||
    path.includes("nov-client-1")
  ) {
    return UPCOMING_REMIX_PARTITION_ID;
  }

  // 4. Fallback to master template
  return MASTER_PARTITION_ID;
}

export function setAppPartitionId(partitionId: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("active_app_partition_id", partitionId);
    } catch {}
  }
}
