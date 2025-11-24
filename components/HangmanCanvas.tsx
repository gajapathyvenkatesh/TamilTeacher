import React from 'react';

interface HangmanCanvasProps {
  wrongGuesses: number;
  maxGuesses: number;
}

export const HangmanCanvas: React.FC<HangmanCanvasProps> = ({ wrongGuesses, maxGuesses }) => {
  const strokeColor = "#475569"; // Slate-600
  const strokeWidth = 4;

  // Determine which parts to show based on difficulty (maxGuesses)
  const showHead = wrongGuesses >= 1;
  const showBody = wrongGuesses >= 2;
  
  // Logic varies by difficulty
  let showLeftArm = false;
  let showRightArm = false;
  let showLeftLeg = false;
  let showRightLeg = false;
  let showLeftEye = false;
  let showRightEye = false;

  if (maxGuesses === 8) {
    // Easy: 8 steps
    showLeftArm = wrongGuesses >= 3;
    showRightArm = wrongGuesses >= 4;
    showLeftLeg = wrongGuesses >= 5;
    showRightLeg = wrongGuesses >= 6;
    showLeftEye = wrongGuesses >= 7;
    showRightEye = wrongGuesses >= 8;
  } else if (maxGuesses === 6) {
    // Medium: 6 steps (Standard)
    showLeftArm = wrongGuesses >= 3;
    showRightArm = wrongGuesses >= 4;
    showLeftLeg = wrongGuesses >= 5;
    showRightLeg = wrongGuesses >= 6;
  } else {
    // Hard: 4 steps
    // 1: Head, 2: Body, 3: Both Arms, 4: Both Legs
    showLeftArm = wrongGuesses >= 3;
    showRightArm = wrongGuesses >= 3;
    showLeftLeg = wrongGuesses >= 4;
    showRightLeg = wrongGuesses >= 4;
  }

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
        {showHead && (
          <circle cx="160" cy="70" r="20" stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" />
        )}
        
        {/* Eyes for Easy Mode */}
        {showLeftEye && (
           <line x1="152" y1="65" x2="156" y2="69" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        )}
        {showLeftEye && (
           <line x1="156" y1="65" x2="152" y2="69" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        )}

        {showRightEye && (
           <line x1="164" y1="65" x2="168" y2="69" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        )}
        {showRightEye && (
           <line x1="168" y1="65" x2="164" y2="69" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Body */}
        {showBody && (
          <line x1="160" y1="90" x2="160" y2="150" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        
        {/* Left Arm */}
        {showLeftArm && (
          <line x1="160" y1="100" x2="130" y2="130" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        {/* Right Arm */}
        {showRightArm && (
          <line x1="160" y1="100" x2="190" y2="130" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        
        {/* Left Leg */}
        {showLeftLeg && (
          <line x1="160" y1="150" x2="140" y2="190" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        {/* Right Leg */}
        {showRightLeg && (
          <line x1="160" y1="150" x2="180" y2="190" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};
