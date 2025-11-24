import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWordData, generateImageForWord, generateAudioForWord } from './services/geminiService';
import { playPCMAudio } from './utils/audio';
import { GameStatus, GameWordData, GameImage, Difficulty, GUESS_LIMITS } from './types';
import { HangmanCanvas } from './components/HangmanCanvas';
import { WordDisplay } from './components/WordDisplay';
import { Keyboard } from './components/Keyboard';
import { ImagePanel } from './components/ImagePanel';

const TOTAL_ROUNDS = 6;

// Utility to segment Tamil text correctly into graphemes
const segmentText = (text: string): string[] => {
  const segmenter = new (Intl as any).Segmenter('ta', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text)).map((segment: any) => segment.segment);
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [wordData, setWordData] = useState<GameWordData | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Track words used in current session to prevent duplicates
  const [usedWords, setUsedWords] = useState<string[]>([]);

  // Team Logic State
  const [scores, setScores] = useState<{ A: number; B: number }>({ A: 0, B: 0 });
  const [currentTeam, setCurrentTeam] = useState<'A' | 'B'>('A');
  const [roundStarter, setRoundStarter] = useState<'A' | 'B'>('A');
  const [roundNumber, setRoundNumber] = useState<number>(1);

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

  // Load a single word/puzzle without resetting the series score
  const loadPuzzle = useCallback(async (currentDifficulty: Difficulty) => {
    try {
      setStatus(GameStatus.LOADING);
      setErrorMsg(null);
      setGuessedLetters(new Set());
      setWrongGuesses(0);
      setImages([]);
      setAudioData(null);

      // 1. Fetch Word Data with difficulty and history
      const data = await fetchWordData(currentDifficulty, usedWords);
      setWordData(data);
      
      // Update history
      setUsedWords(prev => [...prev, data.word]);

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
  }, [usedWords]);

  const initSeries = () => {
     setStatus(GameStatus.DIFFICULTY_SELECT);
  };

  const startNewSeries = useCallback((selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setScores({ A: 0, B: 0 });
    setRoundNumber(1);
    setRoundStarter('A');
    setCurrentTeam('A');
    setUsedWords([]); // Reset word history for new tournament
    loadPuzzle(selectedDifficulty);
  }, [loadPuzzle]);

  const handleNextRound = () => {
    if (roundNumber >= TOTAL_ROUNDS) {
      setStatus(GameStatus.SERIES_OVER);
    } else {
      const nextRound = roundNumber + 1;
      setRoundNumber(nextRound);
      
      // Rotate starter: Puzzle 1->A, Puzzle 2->B, Puzzle 3->A...
      const nextStarter = roundStarter === 'A' ? 'B' : 'A';
      setRoundStarter(nextStarter);
      setCurrentTeam(nextStarter); // The starter takes the first turn
      
      loadPuzzle(difficulty);
    }
  };

  // Initial load
  useEffect(() => {
    initSeries();
  }, []);

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

    const isCorrect = wordSegments.includes(letter);
    const maxGuesses = GUESS_LIMITS[difficulty];

    if (!isCorrect) {
      // Wrong guess
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      if (newWrong >= maxGuesses) {
        setStatus(GameStatus.LOST);
        // No score change on loss
      } else {
        // Switch turn to other team on failure
        setCurrentTeam(prev => prev === 'A' ? 'B' : 'A');
      }
    } else {
      // Correct guess: Current team KEEPS the turn
      // Check win condition
      const allGuessed = wordSegments.every(seg => newGuessed.has(seg));
      if (allGuessed) {
        setStatus(GameStatus.WON);
        // Award point to the team that made the winning guess
        setScores(prev => ({
          ...prev,
          [currentTeam]: prev[currentTeam] + 1
        }));
      }
    }
  };

  const playAudio = () => {
    if (audioData) playPCMAudio(audioData);
  };

  const getTeamColor = (team: 'A' | 'B') => {
    if (team === 'A') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getTeamBadgeStyle = (team: 'A' | 'B') => {
    const isActive = currentTeam === team && status === GameStatus.PLAYING;
    const baseStyle = "flex-1 p-3 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center";
    
    if (team === 'A') {
      return `${baseStyle} ${isActive ? 'bg-blue-100 border-blue-500 ring-4 ring-blue-200 transform scale-105 shadow-md' : 'bg-white border-gray-200 opacity-80 grayscale-[0.3]'}`;
    } else {
      return `${baseStyle} ${isActive ? 'bg-orange-100 border-orange-500 ring-4 ring-orange-200 transform scale-105 shadow-md' : 'bg-white border-gray-200 opacity-80 grayscale-[0.3]'}`;
    }
  };

  if (status === GameStatus.DIFFICULTY_SELECT || status === GameStatus.IDLE) {
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center bg-brand-50 p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-lg w-full border border-gray-200">
           <h1 className="text-4xl md:text-5xl font-extrabold text-brand-600 mb-2 font-tamil tracking-tight">
             தமிழ் <span className="text-accent-pink">Hangman</span>
           </h1>
           <p className="text-gray-500 mb-8 text-lg">Choose your difficulty to start!</p>
           
           <div className="space-y-4">
              <button 
                onClick={() => startNewSeries(Difficulty.EASY)}
                className="w-full p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xl transition-all hover:scale-105 flex items-center justify-between group"
              >
                <span>🌱 Easy</span>
                <span className="text-sm bg-green-200 px-2 py-1 rounded text-green-800 opacity-0 group-hover:opacity-100 transition-opacity">8 Chances</span>
              </button>

              <button 
                onClick={() => startNewSeries(Difficulty.MEDIUM)}
                className="w-full p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-bold text-xl transition-all hover:scale-105 flex items-center justify-between group"
              >
                <span>🌿 Medium</span>
                <span className="text-sm bg-yellow-200 px-2 py-1 rounded text-yellow-800 opacity-0 group-hover:opacity-100 transition-opacity">6 Chances</span>
              </button>

              <button 
                onClick={() => startNewSeries(Difficulty.HARD)}
                className="w-full p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xl transition-all hover:scale-105 flex items-center justify-between group"
              >
                <span>🌳 Hard</span>
                <span className="text-sm bg-red-200 px-2 py-1 rounded text-red-800 opacity-0 group-hover:opacity-100 transition-opacity">4 Chances</span>
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.SERIES_OVER) {
    const winner = scores.A > scores.B ? 'Team A' : scores.B > scores.A ? 'Team B' : 'Tie';
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-2xl w-full border-4 border-white">
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-brand-800 mb-2 font-tamil">
            Game Over!
          </h1>
          <p className="text-xl text-gray-500 mb-8">Tournament Results ({difficulty})</p>
          
          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-blue-600 font-bold text-lg">Team A</p>
              <p className="text-5xl font-black text-gray-800">{scores.A}</p>
            </div>
            <div className="h-20 w-px bg-gray-200"></div>
            <div className="text-center">
              <p className="text-orange-600 font-bold text-lg">Team B</p>
              <p className="text-5xl font-black text-gray-800">{scores.B}</p>
            </div>
          </div>

          <div className="mb-10">
             {winner === 'Tie' ? (
               <div className="text-3xl font-bold text-gray-600">It's a Tie! 🤝</div>
             ) : (
               <div className={`text-4xl font-bold ${winner === 'Team A' ? 'text-blue-600' : 'text-orange-600'}`}>
                 {winner} Wins! 🎉
               </div>
             )}
          </div>

          <button 
            onClick={initSeries}
            className="w-full md:w-auto px-10 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 text-lg"
          >
            Start New Match ➜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col items-center py-6 px-4 max-w-5xl mx-auto">
      
      {/* Header */}
      <header className="w-full flex flex-col items-center mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-600 tracking-tight font-tamil">
            தமிழ் <span className="text-accent-pink">Hangman</span>
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-bold uppercase tracking-wider">{difficulty}</span>
        </div>
        
        {/* Scoreboard */}
        <div className="w-full max-w-lg flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-3xl border border-white/60 shadow-sm">
          <div className={getTeamBadgeStyle('A')}>
             <span className="font-bold text-blue-700 text-sm md:text-base">TEAM A</span>
             <span className="text-2xl md:text-3xl font-black text-blue-900">{scores.A}</span>
          </div>
          
          <div className="flex flex-col items-center px-2">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">VS</span>
             <span className="text-xs font-medium text-gray-400 mt-1 whitespace-nowrap">Round {roundNumber}/{TOTAL_ROUNDS}</span>
          </div>

          <div className={getTeamBadgeStyle('B')}>
             <span className="font-bold text-orange-700 text-sm md:text-base">TEAM B</span>
             <span className="text-2xl md:text-3xl font-black text-orange-900">{scores.B}</span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full bg-white rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8 border border-gray-100 flex flex-col lg:flex-row gap-8 relative overflow-hidden">
        
        {/* Turn Indicator Banner - Only show when playing */}
        {status === GameStatus.PLAYING && (
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentTeam === 'A' ? 'bg-blue-500' : 'bg-orange-500'}`} />
        )}

        {/* Left: Hangman & Visuals */}
        <div className="flex-1 flex flex-col items-center order-2 lg:order-1">
            
            {/* Image Grid (The "Visual Clue" + Tricks) */}
            <div className="w-full max-w-sm mb-6">
               <ImagePanel images={images} status={status} />
            </div>

            {/* Hangman Figure */}
            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <HangmanCanvas wrongGuesses={wrongGuesses} maxGuesses={GUESS_LIMITS[difficulty]} />
            </div>

        </div>

        {/* Right: Word & Controls */}
        <div className="flex-1 flex flex-col justify-center order-1 lg:order-2">
            
            {/* Turn Announcer */}
            {status === GameStatus.PLAYING && (
              <div className={`mb-6 text-center py-2 px-4 rounded-full font-bold text-lg animate-pulse inline-block mx-auto border-2 ${getTeamColor(currentTeam)}`}>
                 It's {currentTeam === 'A' ? 'Team A' : 'Team B'}'s Turn!
              </div>
            )}

            {status === GameStatus.ERROR && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg text-center mb-4">
                    {errorMsg}
                    <button onClick={() => loadPuzzle(difficulty)} className="block mx-auto mt-2 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
                </div>
            )}

            {status === GameStatus.LOADING && (
                <div className="text-center py-12">
                   <p className="text-xl text-brand-500 animate-pulse font-bold">Creating {difficulty} Puzzle...</p>
                   <p className="text-sm text-gray-400 mt-2">Round {roundNumber} - Team {roundStarter} starts</p>
                </div>
            )}

            {(status === GameStatus.PLAYING || status === GameStatus.WON || status === GameStatus.LOST) && (
                <>
                    {/* Clue Text */}
                    <div className="text-center mb-6">
                       <span className="bg-brand-50 text-brand-700 px-4 py-2 rounded-xl text-lg font-bold border border-brand-100 shadow-sm">
                          Clue: {wordData?.english}
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
                        <div className="text-center mb-6 animate-bounce bg-green-50 p-4 rounded-2xl border border-green-100">
                            <h2 className="text-2xl md:text-3xl font-bold text-green-600 mb-2">
                              {currentTeam === 'A' ? 'Team A' : 'Team B'} scored a point! 🎉
                            </h2>
                            <div className="flex items-center justify-center gap-2 text-gray-600">
                                <span>The word was <b>{wordData?.word}</b> ({wordData?.transliteration})</span>
                                {audioData && (
                                    <button 
                                        onClick={playAudio}
                                        className="p-1.5 rounded-full bg-green-200 text-green-700 hover:bg-green-300 transition-colors"
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
                        <div className="text-center mb-6 bg-red-50 p-4 rounded-2xl border border-red-100">
                            <h2 className="text-2xl md:text-3xl font-bold text-red-500 mb-2">Round Failed 😢</h2>
                            <p className="text-red-400 mb-2">No points awarded this round.</p>
                            <div className="flex items-center justify-center gap-2 text-gray-600">
                                <span>The word was <b>{wordData?.word}</b> ({wordData?.transliteration})</span>
                                {audioData && (
                                    <button 
                                        onClick={playAudio}
                                        className="p-1.5 rounded-full bg-red-200 text-red-700 hover:bg-red-300 transition-colors"
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
                    <div className="mt-auto relative z-10">
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
                            onClick={handleNextRound}
                            className="mt-8 w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-xl"
                        >
                            {roundNumber >= TOTAL_ROUNDS ? "Show Final Results 🏆" : `Start Round ${roundNumber + 1} ➜`}
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
