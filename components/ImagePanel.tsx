import React, { useState, useEffect } from 'react';
import { GameImage, GameStatus } from '../types';

interface ImagePanelProps {
  images: GameImage[];
  status: GameStatus;
}

export const ImagePanel: React.FC<ImagePanelProps> = ({ images, status }) => {
  const [shuffledImages, setShuffledImages] = useState<GameImage[]>([]);

  useEffect(() => {
    // Shuffle images only when new images arrive to prevent re-shuffle on every render
    if (images.length > 0) {
      setShuffledImages([...images].sort(() => Math.random() - 0.5));
    }
  }, [images]);

  if (status === GameStatus.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-48 sm:h-64 w-full bg-white rounded-2xl shadow-inner border-2 border-dashed border-gray-200 p-8">
         <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-500 mb-4"></div>
         <p className="text-gray-500 font-sans animate-pulse">Painting pictures...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
      {shuffledImages.map((img, idx) => (
        <div 
          key={idx} 
          className={`
            relative group overflow-hidden rounded-xl border-4 shadow-sm bg-white aspect-square
            ${status === GameStatus.WON && img.isTarget ? 'border-green-400 ring-4 ring-green-200 z-10 scale-105 transition-all duration-500' : 'border-white'}
            ${status === GameStatus.LOST && img.isTarget ? 'border-brand-400 ring-4 ring-brand-200' : ''}
            ${(status === GameStatus.WON || status === GameStatus.LOST) && !img.isTarget ? 'opacity-40 grayscale' : ''}
          `}
        >
          <img 
            src={img.src} 
            alt={img.label} 
            className="w-full h-full object-cover"
          />
          {/* Helper label could be shown on hover if we wanted to make it easier, but let's keep it hidden for the game */}
        </div>
      ))}
      <div className="col-span-3 text-center mt-2">
         <p className="text-sm text-gray-500 italic">
            Which picture matches the word?
         </p>
      </div>
    </div>
  );
};
