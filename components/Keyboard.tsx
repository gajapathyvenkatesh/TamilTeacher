import React from 'react';

interface KeyboardProps {
  availableLetters: string[];
  guessedLetters: Set<string>;
  onGuess: (letter: string) => void;
  disabled: boolean;
}

export const Keyboard: React.FC<KeyboardProps> = ({ availableLetters, guessedLetters, onGuess, disabled }) => {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-lg mx-auto">
      {availableLetters.map((letter, index) => {
        const isGuessed = guessedLetters.has(letter);
        return (
          <button
            key={`${letter}-${index}`}
            onClick={() => onGuess(letter)}
            disabled={disabled || isGuessed}
            className={`
              h-12 sm:h-14 
              rounded-xl shadow-sm border-b-4 
              font-tamil text-lg sm:text-xl font-semibold
              transition-all duration-150 active:scale-95 active:border-b-0 active:translate-y-1
              ${isGuessed 
                ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
                : 'bg-white border-brand-200 text-brand-800 hover:bg-brand-50 hover:border-brand-300'
              }
            `}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
};
