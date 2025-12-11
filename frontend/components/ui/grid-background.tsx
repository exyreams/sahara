"use client";

import { useEffect, useRef, useState } from "react";

interface GridBackgroundProps {
  className?: string;
}

export function GridBackground({ className = "" }: GridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [currentTheme, setCurrentTheme] = useState("default");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let currentTheme =
      document.documentElement.getAttribute("data-theme") || "default";

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawGrid = (offset: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gridSize = 40;
      const theme =
        document.documentElement.getAttribute("data-theme") || "default";
      const isDark = theme !== "light";

      // Theme-aware colors with even lower opacity
      const getThemeColors = () => {
        switch (theme) {
          case "sunset":
            return {
              strokeColor: isDark
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(0, 0, 0, 0.02)",
              pointColor: "rgba(251, 146, 60, 0.18)", // Orange - further reduced
              gradientPrimary: "rgba(251, 146, 60, 0.05)", // Orange - further reduced
              gradientSecondary: "rgba(239, 68, 68, 0.05)", // Red - further reduced
            };
          case "emerald":
            return {
              strokeColor: isDark
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(0, 0, 0, 0.02)",
              pointColor: "rgba(16, 185, 129, 0.18)", // Emerald - further reduced
              gradientPrimary: "rgba(16, 185, 129, 0.05)", // Emerald - further reduced
              gradientSecondary: "rgba(34, 197, 94, 0.05)", // Green - further reduced
            };
          default:
            return {
              strokeColor: isDark
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(0, 0, 0, 0.02)",
              pointColor: "rgba(57, 211, 241, 0.18)", // Cyan - further reduced
              gradientPrimary: "rgba(57, 211, 241, 0.05)", // Cyan - further reduced
              gradientSecondary: "rgba(139, 92, 246, 0.05)", // Purple - further reduced
            };
        }
      };

      const colors = getThemeColors();
      ctx.strokeStyle = colors.strokeColor;
      ctx.lineWidth = 1;

      // Draw grid lines
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw floating points at intersections with enhanced smooth animation
      const timeScale = 0.0008; // Slightly slower for smoother motion
      for (let x = 0; x <= canvas.width; x += gridSize) {
        for (let y = 0; y <= canvas.height; y += gridSize) {
          // Enhanced smooth wave effect
          const dist = Math.sqrt(
            Math.pow(x - mouseRef.current.x, 2) +
              Math.pow(y - mouseRef.current.y, 2),
          );

          const maxDist = 350; // Slightly larger influence area
          const influence = Math.max(0, (maxDist - dist) / maxDist);

          // Multiple wave layers for smoother animation
          const wave1 =
            Math.sin(x * 0.008 + time * timeScale) *
            Math.cos(y * 0.008 + time * timeScale);
          const wave2 =
            Math.sin(x * 0.012 + time * timeScale * 0.7) *
            Math.cos(y * 0.012 + time * timeScale * 0.7) *
            0.5;
          const combinedWave = (wave1 + wave2) * 1.5;

          // Smoother size calculation with easing
          const baseSize = 1.2;
          const waveSize = baseSize + combinedWave;
          const influenceMultiplier = 1 + influence * influence * 1.8; // Quadratic easing for smoother falloff
          const size = Math.max(0, waveSize * influenceMultiplier);

          if (size > 0.3) {
            // Dynamic opacity based on size and distance for smoother appearance
            const sizeOpacity = Math.min(1, size / 3);
            const distanceOpacity = 0.3 + influence * 0.7;
            const finalOpacity = sizeOpacity * distanceOpacity;

            // Extract RGB values and apply dynamic opacity
            const baseColor = colors.pointColor;
            const rgbMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
              const [, r, g, b] = rgbMatch;
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity * 0.4})`; // Even further reduced opacity
            } else {
              ctx.fillStyle = colors.pointColor;
            }

            ctx.beginPath();
            ctx.arc(x, y, Math.min(size, 2.5), 0, Math.PI * 2); // Cap maximum size
            ctx.fill();
          }
        }
      }
    };

    const animate = (timestamp: number) => {
      // Use timestamp for smoother, frame-rate independent animation
      time = timestamp * 0.001; // Convert to seconds for smoother scaling
      drawGrid(time);
      animationFrameId = requestAnimationFrame(animate);
    };

    // Theme change observer
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          const newTheme =
            document.documentElement.getAttribute("data-theme") || "default";
          if (newTheme !== currentTheme) {
            setCurrentTheme(newTheme);
          }
        }
      });
    });

    // Set initial theme
    setCurrentTheme(
      document.documentElement.getAttribute("data-theme") || "default",
    );

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    resize();
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Theme-aware Background Gradient Mesh */}
      <div className="absolute inset-0 bg-theme-background">
        {/* Dynamic gradient blobs based on theme */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2 transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${(() => {
              switch (currentTheme) {
                case "sunset":
                  return "rgba(251, 146, 60, 0.04)"; // Orange - further reduced
                case "emerald":
                  return "rgba(16, 185, 129, 0.04)"; // Emerald - further reduced
                default:
                  return "rgba(57, 211, 241, 0.04)"; // Cyan - further reduced
              }
            })()} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[100px] transform -translate-x-1/2 translate-y-1/2 transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${(() => {
              switch (currentTheme) {
                case "sunset":
                  return "rgba(239, 68, 68, 0.04)"; // Red - further reduced
                case "emerald":
                  return "rgba(34, 197, 94, 0.04)"; // Green - further reduced
                default:
                  return "rgba(139, 92, 246, 0.04)"; // Purple - further reduced
              }
            })()} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Grid Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
    </div>
  );
}
