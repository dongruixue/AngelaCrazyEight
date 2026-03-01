/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Diamond, 
  Club, 
  Spade, 
  RotateCcw, 
  Trophy, 
  User, 
  Cpu,
  Info,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { CardData, GameState, Suit, Rank } from './types';
import { createDeck, canPlayCard, getAIAction, getBestSuitForAI } from './gameLogic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SuitIcon = ({ suit, className = "" }: { suit: Suit; className?: string }) => {
  switch (suit) {
    case 'hearts': return <Heart className={`fill-red-500 text-red-500 ${className}`} />;
    case 'diamonds': return <Diamond className={`fill-red-500 text-red-500 ${className}`} />;
    case 'clubs': return <Club className={`fill-slate-900 text-slate-900 ${className}`} />;
    case 'spades': return <Spade className={`fill-slate-900 text-slate-900 ${className}`} />;
  }
};

interface CardProps {
  card?: CardData;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
  key?: React.Key;
}

const Card = ({ 
  card, 
  isFaceDown = false, 
  onClick, 
  isPlayable = false,
  className = ""
}: CardProps) => {
  if (isFaceDown) {
    return (
      <motion.div 
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className={`w-16 h-24 sm:w-24 sm:h-36 bg-blue-800 rounded-lg border-2 border-white/20 flex items-center justify-center card-shadow relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="w-10 h-16 sm:w-16 sm:h-24 border border-white/30 rounded flex items-center justify-center">
          <span className="text-white/20 font-serif text-2xl italic">A</span>
        </div>
      </motion.div>
    );
  }

  if (!card) return null;

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <motion.div 
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        w-16 h-24 sm:w-24 sm:h-36 bg-white rounded-lg border border-slate-200 flex flex-col p-1 sm:p-2 card-shadow cursor-pointer select-none relative
        ${isPlayable ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-green-800' : ''}
        ${className}
      `}
    >
      <div className={`flex flex-col items-start leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <span className="text-sm sm:text-lg font-bold font-mono">{card.rank}</span>
        <SuitIcon suit={card.suit} className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {card.rank === '8' ? (
          <div className="relative">
            <span className="text-2xl sm:text-4xl font-bold font-serif italic opacity-10">8</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <SuitIcon suit={card.suit} className="w-6 h-6 sm:w-10 sm:h-10" />
            </div>
          </div>
        ) : (
          <SuitIcon suit={card.suit} className="w-8 h-8 sm:w-12 sm:h-12" />
        )}
      </div>

      <div className={`flex flex-col items-end leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <span className="text-sm sm:text-lg font-bold font-mono">{card.rank}</span>
        <SuitIcon suit={card.suit} className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
    </motion.div>
  );
};

export default function App() {
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [state, setState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentTurn: 'player',
    gameStatus: 'waiting',
    winner: null,
    activeSuit: null,
    isSuitPickerOpen: false,
    lastAction: 'Welcome to Angela Crazy Eights!'
  });

  const generateCover = async () => {
    if (coverImage || isGeneratingCover) return;
    setIsGeneratingCover(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: "A professional and elegant game cover for a card game titled 'Angela Crazy Eights'. The background is a high-quality green felt poker table with cinematic lighting. Several standard playing cards are scattered artistically, with the number 8 cards prominently displayed. The title 'Angela Crazy Eights' is written in a sophisticated, gold-embossed serif font. 16:9 aspect ratio, high resolution, luxurious casino atmosphere.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setCoverImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to generate cover image:", error);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  useEffect(() => {
    if (state.gameStatus === 'waiting') {
      generateCover();
    }
  }, [state.gameStatus]);

  const startGame = () => {
    const fullDeck = createDeck();
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    
    // Initial discard must not be an 8 for simplicity, or we just handle it
    let discard = fullDeck.splice(0, 1);
    while (discard[0].rank === '8') {
      fullDeck.push(discard[0]);
      discard = fullDeck.splice(0, 1);
    }

    setState({
      deck: fullDeck,
      playerHand,
      aiHand,
      discardPile: discard,
      currentTurn: 'player',
      gameStatus: 'playing',
      winner: null,
      activeSuit: null,
      isSuitPickerOpen: false,
      lastAction: 'Game started! Your turn.'
    });
  };

  const checkWinner = (newState: GameState) => {
    if (newState.playerHand.length === 0) {
      return { ...newState, gameStatus: 'gameOver', winner: 'player', lastAction: 'You win!' };
    }
    if (newState.aiHand.length === 0) {
      return { ...newState, gameStatus: 'gameOver', winner: 'ai', lastAction: 'AI wins!' };
    }
    return newState;
  };

  const handleDraw = () => {
    if (state.currentTurn !== 'player' || state.gameStatus !== 'playing' || state.isSuitPickerOpen) return;

    if (state.deck.length === 0) {
      const topCard = state.discardPile[state.discardPile.length - 1];
      const hasPlayable = state.playerHand.some(c => canPlayCard(c, topCard, state.activeSuit));
      if (!hasPlayable) {
        setState(prev => ({ ...prev, currentTurn: 'ai', lastAction: 'No moves left and deck is empty. Passing turn.' }));
      } else {
        setState(prev => ({ ...prev, lastAction: 'Deck is empty! You must play a card from your hand.' }));
      }
      return;
    }

    const newDeck = [...state.deck];
    const drawnCard = newDeck.pop()!;
    const newHand = [...state.playerHand, drawnCard];
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    const isDrawnPlayable = canPlayCard(drawnCard, topCard, state.activeSuit);

    setState(prev => ({
      ...prev,
      deck: newDeck,
      playerHand: newHand,
      // If the drawn card is playable, let the player choose to play it.
      // Otherwise, in many Crazy Eights variants, the turn ends after drawing one non-matching card.
      currentTurn: isDrawnPlayable ? 'player' : 'ai',
      lastAction: isDrawnPlayable 
        ? `You drew ${drawnCard.rank} of ${drawnCard.suit}. It matches! You can play it.` 
        : `You drew ${drawnCard.rank} of ${drawnCard.suit}. No match, AI's turn.`
    }));
  };

  const handlePlayCard = (card: CardData) => {
    if (state.currentTurn !== 'player' || state.gameStatus !== 'playing' || state.isSuitPickerOpen) return;

    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!canPlayCard(card, topCard, state.activeSuit)) return;

    const newHand = state.playerHand.filter(c => c.id !== card.id);
    const newDiscard = [...state.discardPile, card];

    if (card.rank === '8') {
      setState(prev => ({
        ...prev,
        playerHand: newHand,
        discardPile: newDiscard,
        isSuitPickerOpen: true,
        lastAction: 'You played an 8! Pick a suit.'
      }));
    } else {
      const nextState = checkWinner({
        ...state,
        playerHand: newHand,
        discardPile: newDiscard,
        currentTurn: 'ai',
        activeSuit: null,
        lastAction: `You played ${card.rank} of ${card.suit}.`
      });
      setState(nextState);
    }
  };

  const handleSuitSelect = (suit: Suit) => {
    const nextState = checkWinner({
      ...state,
      activeSuit: suit,
      isSuitPickerOpen: false,
      currentTurn: 'ai',
      lastAction: `Suit changed to ${suit}. AI's turn.`
    });
    setState(nextState);
  };

  // AI Turn Effect
  useEffect(() => {
    if (state.currentTurn === 'ai' && state.gameStatus === 'playing' && !state.winner) {
      const timer = setTimeout(() => {
        const topCard = state.discardPile[state.discardPile.length - 1];
        const action = getAIAction(state.aiHand, topCard, state.activeSuit);

        if (action === 'draw') {
          if (state.deck.length === 0) {
            setState(prev => ({ ...prev, currentTurn: 'player', lastAction: 'AI has no moves and deck is empty. Your turn.' }));
          } else {
            const newDeck = [...state.deck];
            const drawn = newDeck.pop()!;
            const topCardNow = state.discardPile[state.discardPile.length - 1];
            const isDrawnPlayable = canPlayCard(drawn, topCardNow, state.activeSuit);
            
            if (isDrawnPlayable) {
              // AI plays the drawn card immediately if it can
              const newAiHand = [...state.aiHand]; // drawn is not in hand yet in this logic branch
              const newDiscard = [...state.discardPile, drawn];
              let nextSuit = null;
              if (drawn.rank === '8') {
                nextSuit = getBestSuitForAI(newAiHand);
              }
              
              const nextState = checkWinner({
                ...state,
                deck: newDeck,
                aiHand: newAiHand, // hand stays same size because it drew then played
                discardPile: newDiscard,
                currentTurn: 'player',
                activeSuit: nextSuit,
                lastAction: drawn.rank === '8'
                  ? `AI drew an 8 and played it! Suit: ${nextSuit}`
                  : `AI drew and played ${drawn.rank} of ${drawn.suit}.`
              });
              setState(nextState);
            } else {
              // AI keeps the card and ends turn
              setState(prev => ({
                ...prev,
                deck: newDeck,
                aiHand: [...prev.aiHand, drawn],
                currentTurn: 'player',
                lastAction: 'AI drew a card.'
              }));
            }
          }
        } else {
          const newHand = state.aiHand.filter(c => c.id !== action.id);
          const newDiscard = [...state.discardPile, action];
          
          let nextSuit = null;
          if (action.rank === '8') {
            nextSuit = getBestSuitForAI(newHand);
          }

          const nextState = checkWinner({
            ...state,
            aiHand: newHand,
            discardPile: newDiscard,
            currentTurn: 'player',
            activeSuit: nextSuit,
            lastAction: action.rank === '8' 
              ? `AI played an 8 and chose ${nextSuit}!` 
              : `AI played ${action.rank} of ${action.suit}.`
          });
          setState(nextState);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.currentTurn, state.gameStatus, state.winner]);

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const playerHasPlayable = state.playerHand.some(c => canPlayCard(c, topDiscard, state.activeSuit));
  const shouldHighlightDeck = state.currentTurn === 'player' && state.gameStatus === 'playing' && !playerHasPlayable && !state.isSuitPickerOpen;

  return (
    <div className="felt-texture min-h-screen flex flex-col items-center justify-between p-4 overflow-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-500 p-2 rounded-lg shadow-lg">
            <Trophy className="text-slate-900 w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif font-bold italic tracking-tight">Angela Crazy Eights</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
            <Cpu className="w-4 h-4 opacity-70" />
            <span className="font-mono text-sm">{state.aiHand.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
            <User className="w-4 h-4 opacity-70" />
            <span className="font-mono text-sm">{state.playerHand.length}</span>
          </div>
          <button 
            onClick={startGame}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Restart Game"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Game Board */}
      <main className="flex-1 w-full max-w-6xl flex flex-col justify-center gap-8 relative">
        
        {/* AI Hand */}
        <div className="flex justify-center -space-x-8 sm:-space-x-12">
          {state.aiHand.map((_, i) => (
            <Card key={i} isFaceDown className="rotate-180" />
          ))}
          {state.gameStatus === 'waiting' && (
             <div className="text-white/30 font-serif italic text-xl">Opponent waiting...</div>
          )}
        </div>

        {/* Center Area: Deck & Discard */}
        <div className="flex justify-center items-center gap-8 sm:gap-16 my-4">
          {/* Deck */}
          <div className="relative">
            <div className="absolute -top-1 -left-1 w-16 h-24 sm:w-24 sm:h-36 bg-blue-900 rounded-lg border border-white/10"></div>
            <div className="absolute -top-0.5 -left-0.5 w-16 h-24 sm:w-24 sm:h-36 bg-blue-850 rounded-lg border border-white/10"></div>
            <Card 
              isFaceDown 
              onClick={handleDraw}
              className={`
                ${state.currentTurn === 'player' && state.gameStatus === 'playing' ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-50'}
                ${state.deck.length === 0 ? 'invisible' : ''}
                ${shouldHighlightDeck ? 'ring-4 ring-blue-400 animate-pulse' : ''}
              `}
            />
            {state.deck.length > 0 && (
               <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono opacity-50">
                 {state.deck.length}
               </div>
            )}
          </div>

          {/* Discard Pile */}
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {topDiscard && (
                <Card 
                  key={topDiscard.id}
                  card={topDiscard} 
                  className="z-10"
                />
              )}
            </AnimatePresence>
            
            {/* Active Suit Indicator (for 8s) */}
            {state.activeSuit && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center"
              >
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest opacity-70">Active:</span>
                  <SuitIcon suit={state.activeSuit} className="w-4 h-4" />
                </div>
                <ChevronDown className="w-4 h-4 text-white/50 animate-bounce mt-1" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-4">
          {state.playerHand.map((card) => (
            <Card 
              key={card.id} 
              card={card} 
              isPlayable={state.currentTurn === 'player' && state.gameStatus === 'playing' && canPlayCard(card, topDiscard, state.activeSuit)}
              onClick={() => handlePlayCard(card)}
            />
          ))}
        </div>

        {/* Action Log Overlay */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none">
          <motion.div 
            key={state.lastAction}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-sm font-medium shadow-2xl"
          >
            {state.lastAction}
          </motion.div>
        </div>
      </main>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {state.gameStatus === 'waiting' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <div className="bg-[#1a472a] rounded-3xl border border-white/20 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-1/2 h-48 md:h-auto relative bg-black/20">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt="Angela Crazy Eights Cover" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/30 p-6">
                    {isGeneratingCover ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-mono uppercase tracking-widest">Generating Cover...</span>
                      </>
                    ) : (
                      <span className="text-xs font-mono uppercase tracking-widest">Angela Crazy Eights</span>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a472a] via-transparent to-transparent md:bg-gradient-to-r"></div>
              </div>
              
              <div className="md:w-1/2 p-8 flex flex-col justify-center text-center md:text-left">
                <h2 className="text-4xl font-serif font-bold italic mb-4">Angela Crazy Eights</h2>
                <p className="text-white/70 mb-8 text-sm leading-relaxed">
                  Match suit or rank. 8s are wild. Be the first to clear your hand in this classic strategic card game.
                </p>
                <button 
                  onClick={startGame}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
                >
                  Start New Game
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {state.isSuitPickerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full">
              <h3 className="text-slate-900 text-xl font-bold mb-6 text-center">Choose a Suit</h3>
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 hover:border-yellow-400 hover:bg-slate-50 transition-all group"
                  >
                    <SuitIcon suit={suit} className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-slate-600 capitalize font-medium">{suit}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {state.gameStatus === 'gameOver' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="bg-[#1a472a] p-12 rounded-[3rem] border border-white/20 shadow-2xl max-w-md w-full text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-yellow-500"></div>
              <Trophy className={`w-20 h-20 mx-auto mb-6 ${state.winner === 'player' ? 'text-yellow-500' : 'text-slate-400'}`} />
              <h2 className="text-5xl font-serif font-bold italic mb-2">
                {state.winner === 'player' ? 'Victory!' : 'Defeat'}
              </h2>
              <p className="text-white/60 mb-8">
                {state.winner === 'player' ? 'You played brilliantly.' : 'The AI outsmarted you this time.'}
              </p>
              <button 
                onClick={startGame}
                className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-lg hover:bg-slate-100 transition-all"
              >
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Info */}
      <footer className="w-full max-w-4xl mt-4 flex justify-between items-center text-white/40 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Info className="w-3 h-3" />
          <span>Rules: Match suit/rank. 8 is wild.</span>
        </div>
        <div>&copy; 2024 Angela Crazy Eights</div>
      </footer>
    </div>
  );
}
