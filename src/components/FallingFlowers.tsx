import React, { useEffect, useState } from 'react';

interface Flower {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  opacity: number;
  type: number; // to select between different flower SVG paths
}

export function FallingFlowers({ active }: { active: boolean }) {
  const [flowers, setFlowers] = useState<Flower[]>([]);

  useEffect(() => {
    if (active) {
      const newFlowers = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 4,
        size: 15 + Math.random() * 20,
        rotation: Math.random() * 360,
        opacity: 0.6 + Math.random() * 0.4,
        type: Math.floor(Math.random() * 3)
      }));
      setFlowers(newFlowers);

      const timeout = setTimeout(() => {
        setFlowers([]);
      }, 8000); // clear after 8 seconds

      return () => clearTimeout(timeout);
    }
  }, [active]);

  if (!active || flowers.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {flowers.map((f, i) => (
        <div
          key={f.id}
          className={`absolute top-[-50px] animate-flower-fall drop-shadow-sm ${
            i % 3 === 0 ? 'text-pink-300' : i % 3 === 1 ? 'text-pink-400' : 'text-rose-300'
          }`}
          style={{
            left: `${f.x}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            opacity: f.opacity,
            transform: `rotate(${f.rotation}deg)`,
            width: `${f.size}px`,
            height: `${f.size}px`
          }}
        >
          {f.type === 0 ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C12 2 15 8 18 8C21 8 22 5 22 5C22 5 21 11 18 13C15 15 12 12 12 12C12 12 9 15 6 13C3 11 2 5 2 5C2 5 3 8 6 8C9 8 12 2 12 2Z" />
              <path d="M12 12C12 12 15 15 15 19C15 22 12 22 12 22C12 22 9 22 9 19C9 15 12 12 12 12Z" />
            </svg>
          ) : f.type === 1 ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,22 C12,22 17,16 17,12 C17,8 14.5,6 12,6 C9.5,6 7,8 7,12 C7,16 12,22 12,22 Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          )}
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flower-fall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
        .animate-flower-fall {
          animation-name: flower-fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}} />
    </div>
  );
}
