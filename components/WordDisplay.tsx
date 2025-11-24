import React from 'react';

interface WordDisplayProps {
  wordSegments: string[];
  guessedLetters: Set<string>;
  revealAll?: boolean;
}

export const WordDisplay: React.FC<WordDisplayProps> = ({ wordSegments, guessedLetters, revealAll = false }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 my-6">
      {wordSegments.map((segment, index) => {
        const isGuessed = guessedLetters.has(segment);
        const show = isGuessed || revealAll;

        return (
          <div
            key={`${segment}-${index}`}
            className={`
              w-12 h-14 sm:w-16 sm:h-20 
              border-b-4 
              flex items-center justify-center 
              text-2xl sm:text-4xl font-bold font-tamil
              transition-colors duration-300
              ${show 
                ? 'border-brand-500 text-brand-900 bg-brand-50 rounded-t-lg' 
                : 'border-gray-300 text-transparent bg-gray-50'
              }
              ${revealAll && !isGuessed ? 'text-red-500' : ''}
            `}
          >
            {segment}
          </div>
        );
      })}
    </div>
  );
};
