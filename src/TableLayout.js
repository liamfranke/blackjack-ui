import React from "react";
import "./TableLayout.css";

/**
 * Decide the color for the card text based on the suit.
 *  - Spades (♠) or Clubs (♣) => black
 *  - Hearts (♥) or Diamonds (♦) => red
 */
function getCardColor(suit) {
  return suit === "♠" || suit === "♣" ? "black" : "red";
}

export default function TableLayout({ players, dealer }) {
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
              {card.rank}{card.suit}
            </div>
          ))}
        </div>
      </div>

      {/* Players */}
      {players.map((player, index) => (
        <div key={player.id} className={`seat seat-${index + 1}`}>
          {/* Score at the top (simple text, no styling) */}
          <div>Score: {player.score}</div>

          {/* Player's cards in the middle */}
          <div className="player-cards">
            {player.cards.map((card, idx) => (
              <div
                key={idx}
                className="card"
                style={{ color: getCardColor(card.suit) }}
              >
                {card.rank}{card.suit}
              </div>
            ))}
          </div>

          {/* Player name + bet chip on the same row */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginTop: "6px" 
            }}
          >
            <div className="player-name">Player {index + 1}: <span className="bet-chip">{player.bet}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}
