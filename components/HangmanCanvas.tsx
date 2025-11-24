import React from 'react';

interface HangmanCanvasProps {
  wrongGuesses: number;
}

export const HangmanCanvas: React.FC<HangmanCanvasProps> = ({ wrongGuesses }) => {
  const strokeColor = "#475569"; // Slate-600
  const strokeWidth = 4;

  return (
    <div className="relative w-48 h-56 mx-auto">
      <svg viewBox="0 0 200 240" className="w-full h-full overflow-visible">
        {/* Base */}
        <line x1="20" y1="230" x2="180" y2="230" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Pole */}
        <line x1="100" y1="230" x2="100" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Top Bar */}
        <line x1="100" y1="20" x2="160" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Rope */}
        <line x1="160" y1="20" x2="160" y2="50" stroke={strokeColor} strokeWidth={strokeWidth} />

        {/* Head */}
        {wrongGuesses >= 1 && (
          <circle cx="160" cy="70" r="20" stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" />
        )}
        {/* Body */}
        {wrongGuesses >= 2 && (
          <line x1="160" y1="90" x2="160" y2="150" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        {/* Left Arm */}
        {wrongGuesses >= 3 && (
          <line x1="160" y1="100" x2="130" y2="130" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        {/* Right Arm */}
        {wrongGuesses >= 4 && (
          <line x1="160" y1="100" x2="190" y2="130" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        {/* Left Leg */}
        {wrongGuesses >= 5 && (
          <line x1="160" y1="150" x2="140" y2="190" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        {/* Right Leg */}
        {wrongGuesses >= 6 && (
          <line x1="160" y1="150" x2="180" y2="190" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};
