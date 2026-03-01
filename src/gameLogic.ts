import { CardData, Rank, RANK_VALUES, RANKS, Suit, SUITS } from './types';

export const createDeck = (): CardData[] => {
  const deck: CardData[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        value: RANK_VALUES[rank]
      });
    });
  });
  return shuffle(deck);
};

export const shuffle = (deck: CardData[]): CardData[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const canPlayCard = (card: CardData, topCard: CardData, activeSuit: Suit | null): boolean => {
  // 8 is wild
  if (card.rank === '8') return true;
  
  const targetSuit = activeSuit || topCard.suit;
  
  // Match suit or rank
  return card.suit === targetSuit || card.rank === topCard.rank;
};

export const getAIAction = (hand: CardData[], topCard: CardData, activeSuit: Suit | null): CardData | 'draw' => {
  const targetSuit = activeSuit || topCard.suit;
  
  // 1. Try to play a non-8 card that matches
  const playableNormal = hand.filter(c => c.rank !== '8' && (c.suit === targetSuit || c.rank === topCard.rank));
  if (playableNormal.length > 0) {
    // Simple AI: play the first playable card
    return playableNormal[0];
  }
  
  // 2. Try to play an 8
  const eight = hand.find(c => c.rank === '8');
  if (eight) return eight;
  
  // 3. Must draw
  return 'draw';
};

export const getBestSuitForAI = (hand: CardData[]): Suit => {
  const counts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
  hand.forEach(c => {
    if (c.rank !== '8') counts[c.suit]++;
  });
  
  let bestSuit: Suit = 'hearts';
  let maxCount = -1;
  
  (Object.keys(counts) as Suit[]).forEach(suit => {
    if (counts[suit] > maxCount) {
      maxCount = counts[suit];
      bestSuit = suit;
    }
  });
  
  return bestSuit;
};
