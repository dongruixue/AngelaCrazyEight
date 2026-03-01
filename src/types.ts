import { LucideIcon } from 'lucide-react';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface CardData {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface GameState {
  deck: CardData[];
  playerHand: CardData[];
  aiHand: CardData[];
  discardPile: CardData[];
  currentTurn: 'player' | 'ai';
  gameStatus: 'waiting' | 'playing' | 'gameOver';
  winner: 'player' | 'ai' | null;
  activeSuit: Suit | null; // For when an 8 is played
  isSuitPickerOpen: boolean;
  lastAction: string;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};
