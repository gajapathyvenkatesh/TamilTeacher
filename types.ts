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
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
  ERROR = 'ERROR'
}

export const MAX_WRONG_GUESSES = 6;
