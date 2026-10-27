import React from 'react';

interface VitalEchoLogoProps {
  className?: string;
  size?: number;
}

/**
 * VitalEchoLogo:
 * An integrated brand mark combining:
 * 1. A heart shape (Vitality / Cardiovascular health)
 * 2. An ECG heartbeat line pulse (Vitals & Monitoring)
 * 3. Expanding acoustic echo waves radiating from the pulse (Echo & Caretaker Sync)
 */
export default function VitalEchoLogo({ className = 'w-8 h-8', size }: VitalEchoLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="VitalEcho Logo"
    >
      <defs>
        {/* Emerald to Teal Gradient */}
        <linearGradient id="vitalEchoGradient" x1="10" y1="20" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Pulse Glow Filter */}
        <filter id="vitalGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#059669" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer Heart Shape */}
      <path
        d="M50 86
           C46 82 14 56 14 34
           C14 20 25 12 37 12
           C44 12 48 16 50 20
           C52 16 56 12 63 12
           C75 12 86 20 86 34
           C86 46 76 62 68 72"
        stroke="url(#vitalEchoGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#vitalGlow)"
        className="transition-all"
      />

      {/* Heartbeat ECG Pulse Spikes running across the heart */}
      <path
        d="M20 44 L32 44 L37 32 L43 56 L49 26 L55 58 L60 44 L66 44"
        stroke="#047857"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Concentric Acoustic Echo Waves radiating from the heartbeat (The "Echo") */}
      {/* Wave 1 - Inner Echo */}
      <path
        d="M72 34 C77 39 77 49 72 54"
        stroke="#0d9488"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Wave 2 - Middle Echo */}
      <path
        d="M80 27 C88 35 88 53 80 61"
        stroke="#06b6d4"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Wave 3 - Outer Echo */}
      <path
        d="M88 20 C99 31 99 59 88 70"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 0"
        opacity="0.9"
      />

      {/* Heart Center Pulse Dot */}
      <circle cx="49" cy="26" r="3" fill="#10b981" />
    </svg>
  );
}
