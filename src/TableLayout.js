import React, { useState } from "react";
import "./TableLayout.css";

function getCardColor(suit) {
  return suit === "♠" || suit === "♣" ? "black" : "red";
}

/**
 * props:
 *  - players (array of 8 players)
 *  - dealer (object)
 *  - phase (number) => 1=Betting, 2=Dealing, 3=Hit/Stand
 *  - currentPlayerIndex (number) => whose turn it is in Phase 3
 *  - bettingIndex (number) => whose turn it is in Phase 1
 *  - onSubmitBet(playerId, betAmount) => called in Phase 1 when "Place Bet" is clicked
 *  - onPlayerHit(playerId), onPlayerStand(playerId) => called in Phase 3
 */
export default function TableLayout({
  players,
  dealer,
  phase,
  currentPlayerIndex,
  bettingIndex,
  onSubmitBet,
  onPlayerHit,
  onPlayerStand,
}) {
  // Local state to store each seat’s bet input (only relevant during Phase 1)
  const [betInputs, setBetInputs] = useState({});

  function handleBetChange(playerId, value) {
    setBetInputs((prev) => ({
      ...prev,
      [playerId]: value,
    }));
  }

  return (
    <div className="table-container">
      {/* Dealer */}
      <div className="dealer">
        <div className="dealer-name">
          DEALER (ID: {dealer.id}) - Score: {dealer.score}
        </div>
        <div className="dealer-cards">
          {dealer.cards.map((card, idx) => (
            <div
              key={idx}
              className="card"
              style={{ color: getCardColor(card.suit) }}
            >
              {card.rank}
              {card.suit}
            </div>
          ))}
        </div>
      </div>

      {/* Players */}
      {players.map((player, index) => {
        const seatNumber = index + 1;
        const isActiveHitStand = currentPlayerIndex === index;  // Phase 3 turn
        const isActiveBetting = bettingIndex === index;          // Phase 1 turn

        return (
          <div key={player.id} className={`seat seat-${seatNumber}`}>
            {/* Score display (you can hide this in Phase 1 if desired) */}
            <div>Score: {player.score}</div>

            {/* Cards */}
            <div className="player-cards">
              {player.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{ color: getCardColor(card.suit) }}
                >
                  {card.rank}
                  {card.suit}
                </div>
              ))}
            </div>

            {/* Player name + bet chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "6px",
              }}
            >
              <div className="player-name">
                Player {seatNumber}:{" "}
                <span className="bet-chip">{player.bet}</span>
              </div>
            </div>

            {/** PHASE 1: Collect Bets */}
            {phase === 1 && (
              <div style={{ marginTop: "10px" }}>
                {isActiveBetting ? (
                  <>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      placeholder="Enter Bet"
                      value={betInputs[player.id] || ""}
                      onChange={(e) =>
                        handleBetChange(player.id, e.target.value)
                      }
                      className="bet-input"
                    />
                    <button
                      onClick={() =>
                        onSubmitBet(player.id, betInputs[player.id])
                      }
                    >
                      Place Bet
                    </button>
                  </>
                ) : (
                  <span style={{ color: "#aaa" }}>Waiting...</span>
                )}
              </div>
            )}

            {/** PHASE 3: Hit/Stand */}
            {phase === 3 && (
              <div
                className={`player-actions ${
                  seatNumber <= 4 ? "actions-left" : "actions-right"
                }`}
              >
                <button
                  onClick={() => onPlayerHit(player.id)}
                  disabled={!isActiveHitStand}
                >
                  Hit
                </button>
                <button
                  onClick={() => onPlayerStand(player.id)}
                  disabled={!isActiveHitStand}
                >
                  Stand
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
