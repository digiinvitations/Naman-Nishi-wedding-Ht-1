import React, { useRef, useEffect, useState } from 'react';

interface ScratchRevealProps {
  content: React.ReactNode;
  onReveal: () => void;
  width?: number;
  height?: number;
}

export function ScratchReveal({ content, onReveal, width = 300, height = 100 }: ScratchRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasScratchStarted, setHasScratchStarted] = useState(false);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = 5;
    const y = 5;
    const w = canvas.width - 10;
    const h = canvas.height - 10;

    // Create a beautiful, rich, fully-saturated pure red gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#ff1a40'); // vibrant rich red
    grad.addColorStop(0.5, '#e60026'); // pure red
    grad.addColorStop(1, '#b30019'); // deep rich ruby red
    ctx.fillStyle = grad;

    // Draw parametric heart path
    const topCurveHeight = h * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + topCurveHeight);
    
    // Top-left curve
    ctx.bezierCurveTo(
      x + w / 2, y,
      x, y,
      x, y + topCurveHeight
    );
    // Bottom-left curve
    ctx.bezierCurveTo(
      x, y + (h + topCurveHeight) / 2,
      x + w / 2, y + h,
      x + w / 2, y + h
    );
    // Bottom-right curve
    ctx.bezierCurveTo(
      x + w / 2, y + h,
      x + w, y + (h + topCurveHeight) / 2,
      x + w, y + topCurveHeight
    );
    // Top-right curve
    ctx.bezierCurveTo(
      x + w, y,
      x + w / 2, y,
      x + w / 2, y + topCurveHeight
    );
    ctx.closePath();
    ctx.fill();

    // Red/Crimson Border (Fully red design)
    ctx.strokeStyle = '#cc001b'; // rich crimson border
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Add a gentle glossy reflection shine to make the red heart pop
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.3, w * 0.12, h * 0.08, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }, [width, height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    setHasScratchStarted(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      lastPoint.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current || isRevealed) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    setHasScratchStarted(true);

    const rect = canvas.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;

    // Check if revealed enough
    checkReveal();
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const checkReveal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let opaquePixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 10) {
        opaquePixels++;
      }
    }

    const totalPixels = pixels.length / 4;
    // Since the heart is drawn over a transparent background, the initial opaque pixels are about 50-60% of total pixels.
    // If the remaining opaque pixels drop below 25% of total pixels, it means the heart has been mostly scratched off.
    const opaquePercentage = (opaquePixels / totalPixels) * 100;

    if (opaquePercentage < 25 && !isRevealed) {
      setIsRevealed(true);
      onReveal();
      // Animate canvas fade out
      canvas.style.transition = 'opacity 0.5s ease-out';
      canvas.style.opacity = '0';
      setTimeout(() => {
        canvas.style.display = 'none';
      }, 500);
    }
  };

  return (
    <div className="relative inline-block" style={{ width, height }}>
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
        style={{ opacity: (isRevealed || hasScratchStarted) ? 1 : 0 }}
      >
        {content}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={scratch}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 cursor-pointer touch-none shadow-lg rounded-lg"
      />
    </div>
  );
}
