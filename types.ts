export interface GameWordData {
  word: string; // The Tamil word (e.g., 'யானை')
  english: string; // English meaning (e.g., 'Elephant')
  transliteration: string; // Phonetic (e.g., 'Yanai')
  distractors: string[]; // List of 2 other English nouns for image generation
  distractorLetters: string[]; // List of random Tamil letters for the keyboard
}

export interface GameImage {
  label: string;
  src: string; // base64 data
  isTarget: boolean;
}

export enum GameStatus {
  IDLE = 'IDLE',
  DIFFICULTY_SELECT = 'DIFFICULTY_SELECT',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
  ERROR = 'ERROR',
  SERIES_OVER = 'SERIES_OVER'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export const GUESS_LIMITS: Record<Difficulty, number> = {
  [Difficulty.EASY]: 8,
  [Difficulty.MEDIUM]: 6,
  [Difficulty.HARD]: 4,
};
