"use client";

import { useEffect, useRef } from "react";

interface ParticleSystemProps {
  text?: string;
  className?: string;
}

class Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  springFactor: number;
  friction: number;
  repulsionStrength: number;

  constructor(targetX: number, targetY: number, color: string) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.vx = 0;
    this.vy = 0;
    this.radius = 1.8;
    this.color = color;
    this.springFactor = 0.015;
    this.friction = 0.92;
    this.repulsionStrength = 20;
  }

  update(mouseX: number, mouseY: number, isMouseOn: boolean) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    let ax = dx * this.springFactor;
    let ay = dy * this.springFactor;

    if (isMouseOn) {
      const mx = this.x - mouseX;
      const my = this.y - mouseY;
      const dist = Math.sqrt(mx * mx + my * my);
      if (dist < 100) {
        const force = this.repulsionStrength / (dist * dist);
        ax += (mx / dist) * force;
        ay += (my / dist) * force;
      }
    }

    this.vx += ax;
    this.vy += ay;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  changeColor(color: string) {
    this.color = color;
  }
}

export function ParticleSystem({
  text = "Sahara",
  className = "",
}: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, isOn: false });
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get theme color
    const getThemeColor = () => {
      const root = document.documentElement;
      const theme = root.getAttribute("data-theme") || "sahara";
      const themeColors: Record<string, string> = {
        sahara: "#39D3F1",
        sunset: "#FF8C42",
        emerald: "#2ECC71",
        light: "#007BFF",
      };
      return themeColors[theme] || themeColors.sahara;
    };

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // Ensure minimum canvas size to prevent errors
      canvas.width = Math.max(rect.width, 100);
      canvas.height = Math.max(rect.height, 100);
    };

    const setupText = () => {
      // Validate canvas dimensions before proceeding
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn("Canvas has zero dimensions, skipping particle setup");
        return [];
      }

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return [];

      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      const fontSize = Math.min(canvas.width * 0.3, 280);
      tempCtx.font = `${fontSize}px 'Jacquard 24', cursive`;
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillStyle = "#fff";
      tempCtx.fillText(text, canvas.width / 2, canvas.height * 0.35);

      const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
      const coordinates: { x: number; y: number }[] = [];
      const density = 4;

      for (let y = 0; y < canvas.height; y += density) {
        for (let x = 0; x < canvas.width; x += density) {
          if (imageData.data[(y * canvas.width + x) * 4 + 3] > 128) {
            coordinates.push({ x, y });
          }
        }
      }

      return coordinates;
    };

    const initializeParticles = () => {
      setupCanvas();

      // Only proceed if canvas has valid dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn(
          "Canvas dimensions invalid, skipping particle initialization",
        );
        return;
      }

      const coordinates = setupText();
      const color = getThemeColor();
      particlesRef.current = coordinates.map(
        (coord) => new Particle(coord.x, coord.y, color),
      );
    };

    const animate = () => {
      // Skip animation if canvas is invalid
      if (canvas.width === 0 || canvas.height === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const bgColor =
        document.documentElement.getAttribute("data-theme") === "light"
          ? "rgba(245, 247, 250, 0.25)"
          : "rgba(13, 17, 23, 0.15)";

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.update(
          mouseRef.current.x,
          mouseRef.current.y,
          mouseRef.current.isOn,
        );
        particle.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.isOn = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isOn = false;
    };

    // Theme change observer
    const observer = new MutationObserver(() => {
      const color = getThemeColor();
      for (const particle of particlesRef.current) {
        particle.changeColor(color);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Resize handler
    const handleResize = () => {
      initializeParticles();
    };

    // Initialize
    initializeParticles();
    animate();

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [text]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
}
