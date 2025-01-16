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

function generateShoe(deckCount) {
  let shoe = [];
  for (let i = 0; i < deckCount; i++) {
    const singleDeck = generateDeck();
    shoe = shoe.concat(singleDeck);
  }
  return shoe;
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
    score -= 10;
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
  const [phase, setPhase] = useState(1); // 1=betting, 2=dealing, 3=hit/stand
  const [players, setPlayers] = useState([]);
  const [dealer, setDealer] = useState({ id: "dealer-1", cards: [], score: 0 });

  // This will track which player is placing a bet in Phase 1
  const [bettingIndex, setBettingIndex] = useState(0);

  // Example dealing logic from previous phases:
  const [dealIndex, setDealIndex] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const dealIntervalRef = useRef(null);

  // Hit/stand logic placeholders if needed:
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    // Create 8 empty players
    const initialPlayers = Array.from({ length: 8 }, (_, i) => ({
      id: `player-${i + 1}`,
      cards: [],
      bet: 0, // will be set in Phase 1
      score: 0,
      actions: [],
    }));

    setPlayers(initialPlayers);
    setDealer({ id: "dealer-1", cards: [], score: 0 });

    // Reset deck / dealing
    setDeck([]);
    setDealIndex(0);
    setIsDealing(false);
    clearInterval(dealIntervalRef.current);

    // Start at Phase 1
    setPhase(1);
    setBettingIndex(0);
    setCurrentPlayerIndex(0); // if needed for Phase 3
  }

  /**
   * Called when the user hits "Place Bet"
   * for the currently active player in Phase 1
   */
   function handleSubmitBet(playerId, betAmount) {
    const pIndex = players.findIndex((p) => p.id === playerId);
    if (pIndex === -1) return;

    const newPlayers = [...players];
    const updatedPlayer = { ...newPlayers[pIndex] };

    // Convert the bet from string -> number (if needed)
    const numericBet = parseInt(betAmount, 10) || 0;
    updatedPlayer.bet = numericBet > 0 ? numericBet : 5; // enforce min bet if desired
    newPlayers[pIndex] = updatedPlayer;

    setPlayers(newPlayers);

    // Move on to the next seat
    setBettingIndex((prev) => prev + 1);
    // If we've reached all 8 seats, proceed to Phase 2
    if (bettingIndex >= 7) {
      // Go to dealing
      goToPhase2();
    }
  }

  function goToPhase2() {
    // Create & shuffle the deck
    // Generate Shoe of 6 decks
    const freshDeck = generateShoe(6);
    shuffleDeck(freshDeck);
    setDeck(freshDeck);

    // Clear any leftover cards just in case
    const resetPlayers = players.map((p) => ({
      ...p,
      cards: [],
      score: 0,
      actions: [],
    }));
    setPlayers(resetPlayers);
    setDealer({ ...dealer, cards: [], score: 0 });

    setPhase(2);
  }

  // Deal one card to the next seat in dealOrder
  function dealNextCard() {
    if (dealIndex >= dealOrder.length) {
      // we've dealt all the initial cards
      setIsDealing(false);
      // Potentially move to phase 3 automatically or via a button
      setPhase(3);
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

 // -------------------------
  // PHASE 3: Hit / Stand
  // -------------------------
  function handlePlayerHit(playerId) {
    // Find which player is hitting
    const pIndex = players.findIndex((p) => p.id === playerId);
    if (pIndex === -1) return;

    // (Optional) If you want only the *current* player to act, check:
    // if (pIndex !== currentPlayerIndex) return;

    const newPlayers = [...players];
    const playerToUpdate = { ...newPlayers[pIndex] };

    // Deal one card from the deck
    // (If you didn’t finish dealing up front, you must ensure you have enough cards left.)
    // For the example, let's assume you still have leftover cards in `deck`.
    const nextCard = deck.pop();

    // Update this player’s hand
    playerToUpdate.cards = [...playerToUpdate.cards, nextCard];
    playerToUpdate.score = calculateScore(playerToUpdate.cards);
    playerToUpdate.actions = [...playerToUpdate.actions, "hit"];
    
    // If they bust
    if (playerToUpdate.score > 21) {
      playerToUpdate.actions.push("bust");
      // Move on to next player, for instance:
      setCurrentPlayerIndex((prev) => prev + 1);
    }

    newPlayers[pIndex] = playerToUpdate;
    setPlayers(newPlayers);
    setDeck([...deck]); // updated deck
  }

  function handlePlayerStand(playerId) {
    // Similar logic
    const pIndex = players.findIndex((p) => p.id === playerId);
    if (pIndex === -1) return;

    // (Optional) If you want only the *current* player to act, check:
    // if (pIndex !== currentPlayerIndex) return;

    const newPlayers = [...players];
    const playerToUpdate = { ...newPlayers[pIndex] };
    
    playerToUpdate.actions = [...playerToUpdate.actions, "stand"];

    newPlayers[pIndex] = playerToUpdate;
    setPlayers(newPlayers);

    // Move on to next player
    setCurrentPlayerIndex((prev) => prev + 1);
  }
  function handlePlayerDouble(playerId) {
    const pIndex = players.findIndex((p) => p.id === playerId);
    if (pIndex === -1) return;

    // (Optional) If you want only the *current* player to act, check:
    // if (pIndex !== currentPlayerIndex) return;

    const newPlayers = [...players];
    const playerToUpdate = { ...newPlayers[pIndex] };

    // Deal one card from the deck
    // (If you didn’t finish dealing up front, you must ensure you have enough cards left.)
    // For the example, let's assume you still have leftover cards in `deck`.
    const nextCard = deck.pop();

    // Update this player’s hand
    playerToUpdate.bet = playerToUpdate.bet * 2
    playerToUpdate.cards = [...playerToUpdate.cards, nextCard];
    playerToUpdate.score = calculateScore(playerToUpdate.cards);
    playerToUpdate.actions = [...playerToUpdate.actions, "hit"];
    
    // If they bust
    if (playerToUpdate.score > 21) {
      playerToUpdate.actions.push("bust");
    }

    newPlayers[pIndex] = playerToUpdate;
    setPlayers(newPlayers);
    setDeck([...deck]); // updated deck
    setCurrentPlayerIndex((prev) => prev + 1);
  
  }

  // Setup or clear the interval whenever isDealing changes
  useEffect(() => {
    if (isDealing) {
      // Every 0.5 seconds, deal one card
      dealIntervalRef.current = setInterval(() => {
        dealNextCard();
      }, 500);

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
      {/* PHASE 1: Collect bets */}
      {phase === 1 && (
        <div>
          <h3>Phase 1: Collect Bets</h3>
          <p>Currently placing bet for Player #{bettingIndex + 1}</p>
        </div>
      )}
      {/* PHASE 2: Dealing */}
      {phase === 2 && (
        <div style={{ marginBottom: "10px" }}>
          <h3>Phase 2: Dealing</h3>
          <button onClick={handleStartDealing} disabled={isDealing}>
            Start Dealing
          </button>
          <button onClick={handleStopDealing} disabled={!isDealing}>
            Stop Dealing
          </button>
        </div>
      )}

      {/* PHASE 3 */}
      {phase === 3 && (
        <div>
          <h3>Phase 3: Player Decisions (Hit/Stand)</h3>
          <p>
            Current player index is: {currentPlayerIndex + 1} 
            ({players[currentPlayerIndex]?.id})
            <button onClick={handleRestart}>
              Restart/Reshuffle
            </button>
          </p>
        </div>
      )}

      {/* Pass phase, currentPlayerIndex, and the handlers to TableLayout */}
      <TableLayout
        players={players}
        dealer={dealer}
        phase={phase}
        currentPlayerIndex={currentPlayerIndex}
        bettingIndex={bettingIndex}
        onSubmitBet={handleSubmitBet}
        onPlayerHit={handlePlayerHit}
        onPlayerStand={handlePlayerStand}
        onPlayerDouble={handlePlayerDouble}
      />

    </div>
  );
}
