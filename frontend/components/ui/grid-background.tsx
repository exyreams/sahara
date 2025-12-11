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

      // Theme-aware colors
      const getThemeColors = () => {
        switch (theme) {
          case "sunset":
            return {
              strokeColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
              pointColor: "rgba(251, 146, 60, 0.4)", // Orange
              gradientPrimary: "rgba(251, 146, 60, 0.15)", // Orange
              gradientSecondary: "rgba(239, 68, 68, 0.15)", // Red
            };
          case "emerald":
            return {
              strokeColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
              pointColor: "rgba(16, 185, 129, 0.4)", // Emerald
              gradientPrimary: "rgba(16, 185, 129, 0.15)", // Emerald
              gradientSecondary: "rgba(34, 197, 94, 0.15)", // Green
            };
          default:
            return {
              strokeColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
              pointColor: "rgba(57, 211, 241, 0.4)", // Cyan
              gradientPrimary: "rgba(57, 211, 241, 0.15)", // Cyan
              gradientSecondary: "rgba(139, 92, 246, 0.15)", // Purple
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

      // Draw floating points at intersections
      const timeScale = 0.001;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        for (let y = 0; y <= canvas.height; y += gridSize) {
          // Subtle wave effect
          const dist = Math.sqrt(
            Math.pow(x - mouseRef.current.x, 2) +
              Math.pow(y - mouseRef.current.y, 2),
          );

          const maxDist = 300;
          const influence = Math.max(0, (maxDist - dist) / maxDist);

          const wave =
            Math.sin(x * 0.01 + time * timeScale) *
            Math.cos(y * 0.01 + time * timeScale) *
            2;
          const size = (1.5 + wave) * (1 + influence * 2);

          if (size > 0.5) {
            ctx.fillStyle = colors.pointColor;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    const animate = () => {
      time++;
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
    animate();

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
                  return "rgba(251, 146, 60, 0.1)"; // Orange
                case "emerald":
                  return "rgba(16, 185, 129, 0.1)"; // Emerald
                default:
                  return "rgba(57, 211, 241, 0.1)"; // Cyan
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
                  return "rgba(239, 68, 68, 0.1)"; // Red
                case "emerald":
                  return "rgba(34, 197, 94, 0.1)"; // Green
                default:
                  return "rgba(139, 92, 246, 0.1)"; // Purple
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
