import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWordData, generateImageForWord, generateAudioForWord } from './services/geminiService';
import { playPCMAudio } from './utils/audio';
import { GameStatus, GameWordData, GameImage, MAX_WRONG_GUESSES } from './types';
import { HangmanCanvas } from './components/HangmanCanvas';
import { WordDisplay } from './components/WordDisplay';
import { Keyboard } from './components/Keyboard';
import { ImagePanel } from './components/ImagePanel';

// Utility to segment Tamil text correctly into graphemes
const segmentText = (text: string): string[] => {
  const segmenter = new (Intl as any).Segmenter('ta', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text)).map((segment: any) => segment.segment);
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [wordData, setWordData] = useState<GameWordData | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derived state: The word split into functional Tamil letters
  const wordSegments = useMemo(() => {
    return wordData ? segmentText(wordData.word) : [];
  }, [wordData]);

  // Derived state: Keyboard letters (Target letters + Distractors) shuffled
  const keyboardLetters = useMemo(() => {
    if (!wordData) return [];
    const targetSet = new Set(segmentText(wordData.word));
    // Filter out distractors that might accidentally be in the target
    const validDistractors = wordData.distractorLetters.filter(l => !targetSet.has(l));
    // Combine and shuffle
    const combined = [...Array.from(targetSet), ...validDistractors];
    return combined.sort(() => Math.random() - 0.5);
  }, [wordData]);

  const loadGame = useCallback(async () => {
    try {
      setStatus(GameStatus.LOADING);
      setErrorMsg(null);
      setGuessedLetters(new Set());
      setWrongGuesses(0);
      setImages([]);
      setAudioData(null);

      // 1. Fetch Word Data
      const data = await fetchWordData();
      setWordData(data);

      // 2. Generate Images and Audio in Parallel
      const imagePrompts = [
        { label: data.english, isTarget: true },
        { label: data.distractors[0], isTarget: false },
        { label: data.distractors[1], isTarget: false },
      ];

      const imagePromises = imagePrompts.map(async (item) => {
        const src = await generateImageForWord(item.label);
        return { ...item, src } as GameImage;
      });

      // Fetch audio for the target word
      const audioPromise = generateAudioForWord(data.word);

      const [loadedImages, audioResult] = await Promise.all([
        Promise.all(imagePromises),
        audioPromise
      ]);

      setImages(loadedImages);
      setAudioData(audioResult);
      setStatus(GameStatus.PLAYING);

    } catch (err) {
      console.error(err);
      setErrorMsg("Oops! Something went wrong loading the game. Please try again.");
      setStatus(GameStatus.ERROR);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Auto-play audio when won
  useEffect(() => {
    if (status === GameStatus.WON && audioData) {
      const timer = setTimeout(() => {
        playPCMAudio(audioData);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, audioData]);

  const handleGuess = (letter: string) => {
    if (status !== GameStatus.PLAYING) return;
    
    // Optimistic update
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    if (!wordSegments.includes(letter)) {
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      if (newWrong >= MAX_WRONG_GUESSES) {
        setStatus(GameStatus.LOST);
      }
    } else {
      // Check win condition
      const allGuessed = wordSegments.every(seg => newGuessed.has(seg));
      if (allGuessed) {
        setStatus(GameStatus.WON);
      }
    }
  };

  const playAudio = () => {
    if (audioData) playPCMAudio(audioData);
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center py-8 px-4 max-w-4xl mx-auto">
      
      {/* Header */}
      <header className="w-full text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-600 tracking-tight font-tamil">
          தமிழ் <span className="text-accent-pink">Hangman</span>
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Guess the Tamil word for one of the pictures!</p>
      </header>

      {/* Main Game Area */}
      <main className="w-full bg-white rounded-3xl shadow-xl p-4 sm:p-8 border border-gray-100 flex flex-col lg:flex-row gap-8">
        
        {/* Left: Hangman & Visuals */}
        <div className="flex-1 flex flex-col items-center">
            
            {/* Image Grid (The "Visual Clue" + Tricks) */}
            <div className="w-full max-w-sm mb-6">
               <ImagePanel images={images} status={status} />
            </div>

            {/* Hangman Figure */}
            <div className="w-full bg-gray-50 rounded-2xl p-4">
                <HangmanCanvas wrongGuesses={wrongGuesses} />
            </div>

        </div>

        {/* Right: Word & Controls */}
        <div className="flex-1 flex flex-col justify-center">
            
            {status === GameStatus.ERROR && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg text-center mb-4">
                    {errorMsg}
                    <button onClick={loadGame} className="block mx-auto mt-2 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
                </div>
            )}

            {status === GameStatus.LOADING && (
                <div className="text-center py-12">
                   <p className="text-xl text-brand-500 animate-pulse font-bold">Creating a new puzzle...</p>
                   <p className="text-sm text-gray-400 mt-2">Generating images and audio with AI</p>
                </div>
            )}

            {(status === GameStatus.PLAYING || status === GameStatus.WON || status === GameStatus.LOST) && (
                <>
                    {/* Progress Info */}
                    <div className="flex justify-between items-center px-2 mb-4 text-gray-500 font-semibold">
                       <span>Attempts: {wrongGuesses}/{MAX_WRONG_GUESSES}</span>
                       <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-sm">
                          {wordData?.english}
                       </span>
                    </div>

                    {/* The Word Slots */}
                    <WordDisplay 
                        wordSegments={wordSegments} 
                        guessedLetters={guessedLetters} 
                        revealAll={status !== GameStatus.PLAYING}
                    />

                    {/* Game Over / Win Messages */}
                    {status === GameStatus.WON && (
                        <div className="text-center mb-6 animate-bounce">
                            <h2 className="text-3xl font-bold text-green-500 mb-1">Wow! Correct! 🎉</h2>
                            <div className="flex items-center justify-center gap-2 text-gray-600">
                                <span>You found <b>{wordData?.word}</b> ({wordData?.transliteration})</span>
                                {audioData && (
                                    <button 
                                        onClick={playAudio}
                                        className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                        title="Play Pronunciation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {status === GameStatus.LOST && (
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-bold text-red-500 mb-1">Game Over 😢</h2>
                            <div className="flex items-center justify-center gap-2 text-gray-600">
                                <span>The word was <b>{wordData?.word}</b> ({wordData?.transliteration})</span>
                                {audioData && (
                                    <button 
                                        onClick={playAudio}
                                        className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                        title="Play Pronunciation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Keyboard */}
                    <div className="mt-auto">
                        <Keyboard 
                            availableLetters={keyboardLetters} 
                            guessedLetters={guessedLetters} 
                            onGuess={handleGuess}
                            disabled={status !== GameStatus.PLAYING}
                        />
                    </div>

                    {/* Next Button */}
                    {(status === GameStatus.WON || status === GameStatus.LOST) && (
                        <button 
                            onClick={loadGame}
                            className="mt-8 w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-xl"
                        >
                            Next Word ➜
                        </button>
                    )}
                </>
            )}

        </div>
      </main>

      <footer className="mt-8 text-gray-400 text-sm text-center">
         Powered by Gemini AI • Learning Tamil made fun
      </footer>
    </div>
  );
};

export default App;