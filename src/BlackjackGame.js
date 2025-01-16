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
    score -= 10;
    aces--;
  }

  return score;
}

/** Returns a random bet (multiple of 5) between 5 and 50 */
function getRandomBet() {
  // Possible bets: 5,10,15,...,50
  const bets = [];
  for (let b = 5; b <= 50; b += 5) {
    bets.push(b);
  }
  const randomIndex = Math.floor(Math.random() * bets.length);
  return bets[randomIndex];
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
  // HIT/STAND logic (Phase 3)
  const [isHitStandActive, setIsHitStandActive] = useState(false);
  const [hitStandIndex, setHitStandIndex] = useState(0);
  const hitStandIntervalRef = useRef(null);

  /**
   * PHASES:
   *  1) Collect Bets
   *  2) Deal Cards
   *  3) (Future) Post-Deal actions (hit/stand or finalize round)
   */
  const [phase, setPhase] = useState(1);

  // On mount (or after a full "Restart"), set up initial state
  useEffect(() => {
    // Start fresh
    initializeGame();
  }, []); // run once

  function initializeGame() {
    // Phase 1 by default: collect bets
    setPhase(1);

    // Create empty players with 0 bets initially (we'll fill them in Phase 1)
    const initialPlayers = Array.from({ length: 8 }, (_, i) => ({
      id: `player-${i + 1}`,
      cards: [],
      bet: 0,
      score: 0,
      actions: [],  // track hit/stand steps
      isBlackjack: false,
      isBust: false
    }));
    setPlayers(initialPlayers);
    
    // Reset the dealer
    setDealer({ id: "dealer-1", cards: [], score: 0 });

    // Reset dealing logic
    setDeck([]);
    setDealIndex(0);
    setIsDealing(false);
  }

  // Phase 1 action: randomize bets
  function collectBets() {
    // Randomize each player’s bet
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, bet: getRandomBet() }))
    );
  }

  // Move from phase 1 (betting) to phase 2 (dealing)
  function goToPhase2() {
    // Create and shuffle a fresh deck
    const d = generateDeck();
    shuffleDeck(d);
    setDeck(d);

    // Clear out any old cards from a previous round just in case
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, cards: [], score: 0 }))
    );
    setDealer({ id: "dealer-1", cards: [], score: 0 });

    // Start the dealing phase
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

  function startHitStandPhase() {
    // Move to phase 3
    setPhase(3);
    setHitStandIndex(0);
    setIsHitStandActive(true);
  }

  /**
   * The main loop that runs every 2.5s to handle
   * a single "hit or stand" action for the current player.
   */
  useEffect(() => {
    if (!isHitStandActive) {
      clearInterval(hitStandIntervalRef.current);
      return;
    }

    hitStandIntervalRef.current = setInterval(() => {
      doNextHitOrStand();
    }, 500);

    return () => clearInterval(hitStandIntervalRef.current);
  }, [isHitStandActive, hitStandIndex]);

  /**
   * Decide randomly to hit or stand for the current player,
   * deal one card if "hit". If bust or stand, move on to next player.
   */
  function doNextHitOrStand() {
    // If we've gone beyond the last player, stop
    if (hitStandIndex >= players.length) {
      setIsHitStandActive(false);
      return;
    }

    // Grab the current player
    const pIndex = hitStandIndex;
    const currentPlayer = players[pIndex];

    if (currentPlayer.score === 21) {
      currentPlayer.isBlackjack = true
      setHitStandIndex(pIndex + 1);
    }

    if (currentPlayer.score > 21) {
      currentPlayer.isBust = true
      setHitStandIndex(pIndex + 1)
    }

    // If they've already busted or stood (edge case), skip to next
    // but normally we won't call doNextHitOrStand() once they've ended
    // so let's just proceed with random logic:

    // 50/50 random
    const action = Math.random() < 0.5 ? "hit" : "stand";

    // Clone the deck and players
    let newDeck = [...deck];
    let newPlayers = [...players];
    let updatedPlayer = { ...currentPlayer };

    if (action === "stand") {
      // Record the action
      updatedPlayer.actions.push("stand");
      // Next player
      newPlayers[pIndex] = updatedPlayer;
      setPlayers(newPlayers);
      setHitStandIndex(pIndex + 1);

    } else {
      // action === "hit"
      updatedPlayer.actions.push("hit");

      // Deal one card
      const nextCard = newDeck.pop();
      updatedPlayer.cards = [...updatedPlayer.cards, nextCard];
      updatedPlayer.score = calculateScore(updatedPlayer.cards);

      // Check bust
      if (updatedPlayer.score > 21) {
        updatedPlayer.isBust = true

        // Move to next player
        newPlayers[pIndex] = updatedPlayer;
        setPlayers(newPlayers);
        setHitStandIndex(pIndex + 1);
      } else {
        // Not bust yet, so we reinsert updated player and deck
        // BUT we keep the same player index for the next tick
        newPlayers[pIndex] = updatedPlayer;
        console.log(newPlayers[pIndex])
        setPlayers(newPlayers);
        setDeck(newDeck);

        // Notice we do NOT increment hitStandIndex, so next tick is the same player
        // That allows them to "hit again" or eventually "stand."
      }
    }
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
        <div style={{ marginBottom: "10px" }}>
          <h3>Phase 1: Collect Bets</h3>
          <button onClick={collectBets}>Randomize Bets (5 to 50)</button>
          <button onClick={goToPhase2} style={{ marginLeft: 8 }}>
            Next (Go to Dealing)
          </button>
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

      {/* PHASE 3: Hit or Stand */}
      {phase === 3 && (
        <div>
          <h3>Phase 3: Hit or Stand</h3>
          {/* Kick off the random "one at a time" logic if not active yet */}
          {!isHitStandActive && (
            <button onClick={startHitStandPhase}>Start Hit/Stand</button>
          )}
          {isHitStandActive && (
            <p>Players are actively hitting or standing one card at a time...</p>
          )}
        </div>
      )}

      {/* Common: Restart button */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={handleRestart}>Reshuffle / Restart</button>
      </div>

      {/* Table Layout always visible, showing players/dealer status */}
      <TableLayout players={players} dealer={dealer} />
    </div>
  );
}
