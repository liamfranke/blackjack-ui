import React, { useState, useEffect, useRef } from "react";
import TableLayout from "./TableLayout";

/** Generate a simple 52-card deck */
function generateDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Shuffle in place with Fisher-Yates */
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/** 
 * The order: 
 *  - First pass: deal 1 card to each of the 8 players (0..7)
 *  - Then 1 card to the dealer ("dealer")
 *  - Then second pass: 1 card each to the 8 players again
 */
const dealOrder = [
  0, 1, 2, 3, 4, 5, 6, 7, // pass 1
  "dealer",               // dealer gets 1 card
  0, 1, 2, 3, 4, 5, 6, 7, // pass 2
];

/** 
 * Calculate Blackjack-style score for a set of cards:
 * - Aces start as 11; if score > 21, reduce some aces to 1.
 */
function calculateScore(cards) {
  let score = 0;
  let aces = 0;

  for (let card of cards) {
    if (card.rank === "A") {
      aces++;
      score += 11; // treat Ace as 11 initially
    } else if (["K", "Q", "J", "10"].includes(card.rank)) {
      score += 10;
    } else {
      score += parseInt(card.rank, 10);
    }
  }

  // If score is over 21 and we have aces counted as 11, reduce them to 1
  while (score > 21 && aces > 0) {
    score -= 10; // subtract 10, effectively making one ace worth 1 instead of 11
    aces--;
  }

  return score;
}

export default function BlackjackGame() {
  const [deck, setDeck] = useState([]);
  
  // 8 players, each with:
  //   - id
  //   - cards: []
  //   - bet: number
  //   - score: number
  const [players, setPlayers] = useState([]);

  const [dealer, setDealer] = useState({ id: "dealer-1", cards: [], score: 0 });

  // Which card in the dealOrder we’re currently on (0..dealOrder.length)
  const [dealIndex, setDealIndex] = useState(0);

  // Are we currently dealing automatically?
  const [isDealing, setIsDealing] = useState(false);

  // We’ll store the interval ID in a ref so we can clear it on unmount / stop
  const dealIntervalRef = useRef(null);

  // On mount (or after a full "Restart"), set up initial state
  useEffect(() => {
    initializeGame();
  }, []); // run once

  function initializeGame() {
    // Create and shuffle a fresh deck
    const d = generateDeck();
    shuffleDeck(d);

    // Create 8 players, each with empty cards, a bet of $5, and 0 score
    const initialPlayers = Array.from({ length: 8 }, (_, i) => ({
      id: `player-${i + 1}`,
      cards: [],
      bet: 5,      // Minimum bet of $5 to buy in
      score: 0,
    }));

    setDeck(d);
    setPlayers(initialPlayers);
    setDealer({ id: "dealer-1", cards: [], score: 0 });
    setDealIndex(0);
    setIsDealing(false);
  }

  // Deal one card to the next seat in dealOrder
  function dealNextCard() {
    // If we’ve dealt all 17 cards, stop
    if (dealIndex >= dealOrder.length) {
      setIsDealing(false);
      return;
    }

    // Pop one card off the top of the deck
    const currentDeck = [...deck];
    const nextCard = currentDeck.pop();
    setDeck(currentDeck);

    // Identify seat (player index or "dealer")
    const seat = dealOrder[dealIndex];

    if (typeof seat === "number") {
      // It's a player
      setPlayers((prev) => {
        const updated = [...prev];
        const player = { ...updated[seat] };

        // Add the card
        player.cards = [...player.cards, nextCard];
        // Calculate new score
        player.score = calculateScore(player.cards);

        updated[seat] = player;
        return updated;
      });
    } else {
      // seat === 'dealer'
      setDealer((prev) => {
        const newCards = [...prev.cards, nextCard];
        return {
          ...prev,
          cards: newCards,
          score: calculateScore(newCards),
        };
      });
    }

    // Move to the next item in dealOrder
    setDealIndex((prev) => prev + 1);
  }

  // Setup or clear the interval whenever isDealing changes
  useEffect(() => {
    if (isDealing) {
      // Every 5 seconds, deal one card
      dealIntervalRef.current = setInterval(() => {
        dealNextCard();
      }, 2500);

      // Cleanup if we stop dealing
      return () => {
        clearInterval(dealIntervalRef.current);
      };
    } else {
      // If not dealing, ensure no interval is running
      clearInterval(dealIntervalRef.current);
    }
  }, [isDealing, dealIndex]);

  // Start dealing from the current position
  function handleStartDealing() {
    // If we’ve already dealt all cards, do nothing
    if (dealIndex >= dealOrder.length) return;
    setIsDealing(true);
  }

  // Stop dealing mid-way
  function handleStopDealing() {
    setIsDealing(false);
  }

  // Reshuffle / Restart everything
  function handleRestart() {
    clearInterval(dealIntervalRef.current);
    initializeGame();
  }

  return (
    <div style={{ padding: "10px" }}>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={handleStartDealing} disabled={isDealing}>
          Start Dealing
        </button>
        <button onClick={handleStopDealing} disabled={!isDealing}>
          Stop Dealing
        </button>
        <button onClick={handleRestart}>
          Reshuffle / Restart
        </button>
      </div>

      <TableLayout players={players} dealer={dealer} />
    </div>
  );
}
