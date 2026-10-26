import React, { useState, useEffect } from "react";
import { fetchFromFsdb, transformGoogleDriveUrl } from "../lib/fsdb";

export function FirestoreImage(props: React.ComponentProps<"img">) {
  const { src, ...rest } = props;
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(src);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const universalFallback = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800";

  useEffect(() => {
    const cleanSrc = typeof src === "string" ? src.trim() : src;
    if (cleanSrc && cleanSrc.startsWith("fsdb://")) {
      setLoading(true);
      setError(false);
      fetchFromFsdb(cleanSrc).then(base64 => {
        if (!base64) {
          setError(true);
        } else {
          setResolvedSrc(base64);
        }
        setLoading(false);
      });
    } else if (cleanSrc) {
      const transformed = transformGoogleDriveUrl(cleanSrc);
      setResolvedSrc(transformed);
      setError(false);
    } else {
      setResolvedSrc(universalFallback);
      setError(true);
    }
  }, [src]);

  if (loading) {
    return (
      <div 
        className={`animate-pulse bg-pink-100 flex items-center justify-center ${props.className || ''}`}
        style={props.style}
      >
        <span className="text-xs text-pink-300">Loading...</span>
      </div>
    );
  }

  // If there is an error or no resolved src, show clean fallback
  if (error || !resolvedSrc) {
    return (
      <img 
        src={universalFallback} 
        {...rest} 
        className={props.className}
        style={props.style}
      />
    );
  }

  return (
    <img 
      src={resolvedSrc} 
      {...rest} 
      className={props.className}
      style={props.style}
      onError={() => {
        setResolvedSrc(universalFallback);
      }} 
    />
  );
}
