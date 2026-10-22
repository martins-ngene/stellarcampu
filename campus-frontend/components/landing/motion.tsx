"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useRef,
  type ReactNode,
  type PointerEvent,
  type CSSProperties,
} from "react";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 1, y: 0 }}
      whileInView={reduced ? undefined : { opacity: [0, 1], y: [20, 0] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function InteractiveCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const card = useRef<HTMLDivElement>(null);

  function point(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--pointer-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--pointer-y",
      `${event.clientY - bounds.top}px`,
    );
  }

  function ripple(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = card.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const wave = document.createElement("span");
    wave.className = "card-ripple";
    wave.style.left = `${event.clientX - bounds.left}px`;
    wave.style.top = `${event.clientY - bounds.top}px`;
    wave.setAttribute("aria-hidden", "true");
    // Limit decoration during repeated activations; animationend removes each wave.
    if (element.querySelectorAll(".card-ripple").length >= 3)
      element.querySelector(".card-ripple")?.remove();
    element.append(wave);
    wave.addEventListener("animationend", () => wave.remove(), { once: true });
  }

  return (
    <div
      ref={card}
      className={`interactive-card ${className}`}
      onPointerMove={point}
      onPointerDown={ripple}
    >
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      className={`progress-track ${className}`}
      role="progressbar"
      aria-label="Illustrative challenge progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.span
        style={
          {
            "--progress": `${value}%`,
            width: `${value}%`,
            transformOrigin: "left",
          } as CSSProperties
        }
        initial={{ scaleX: 1 }}
        whileInView={reduced ? undefined : { scaleX: [0, 1] }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
