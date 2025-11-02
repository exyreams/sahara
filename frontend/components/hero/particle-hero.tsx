"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";

const particleThemes = {
  sahara: { color: "#39D3F1" },
  sunset: { color: "#FF8C42" },
  emerald: { color: "#2ECC71" },
  light: { color: "#007BFF" },
};

class Particle {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  springFactor: number;
  friction: number;
  repulsionStrength: number;
  color: string;

  constructor(targetX: number, targetY: number, color: string) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.vx = 0;
    this.vy = 0;
    this.radius = 1.2;
    this.springFactor = 0.015;
    this.friction = 0.92;
    this.repulsionStrength = 20;
    this.color = color;
  }

  changeColor(color: string) {
    this.color = color;
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
}

export function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, isOn: false });
  const animationFrameRef = useRef<number | undefined>(undefined);
  const { currentTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initializeCanvas = async () => {
      // Wait for font to load
      await document.fonts.ready;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // Create text coordinates
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCanvas.width = width;
      tempCanvas.height = height;

      const fontSize = Math.min(width * 0.2, 180);
      tempCtx.font = `${fontSize}px Jacquard24, monospace`;
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillStyle = "#fff";
      tempCtx.fillText("SAHARA", width / 2, height / 2);

      const imageData = tempCtx.getImageData(0, 0, width, height);
      const textCoordinates: { x: number; y: number }[] = [];
      const density = 4;

      for (let y = 0; y < height; y += density) {
        for (let x = 0; x < width; x += density) {
          if (imageData.data[(y * width + x) * 4 + 3] > 128) {
            textCoordinates.push({ x, y });
          }
        }
      }

      const color =
        particleThemes[currentTheme as keyof typeof particleThemes]?.color ||
        particleThemes.sahara.color;
      particlesRef.current = textCoordinates.map(
        (coord) => new Particle(coord.x, coord.y, color),
      );
    };

    const animate = () => {
      const isDark = currentTheme !== "light";
      ctx.fillStyle = isDark
        ? "rgba(13, 17, 23, 0.15)"
        : "rgba(245, 247, 250, 0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.update(mouseRef.current.x, mouseRef.current.y, mouseRef.current.isOn);
        p.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, isOn: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.isOn = false;
    };

    const handleResize = () => {
      initializeCanvas();
    };

    initializeCanvas();
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
    };
  }, [currentTheme]);

  // Update particle colors when theme changes
  useEffect(() => {
    const color =
      particleThemes[currentTheme as keyof typeof particleThemes]?.color ||
      particleThemes.sahara.color;
    for (const p of particlesRef.current) {
      p.changeColor(color);
    }
  }, [currentTheme]);

  return (
    <div className="relative w-screen h-screen bg-theme-background -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
