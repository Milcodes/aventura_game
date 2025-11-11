export const memoryGameHTML = `
<style>
  .memory-game-box {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .memory-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .memory-stat {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    text-align: center;
    flex: 1;
  }

  .memory-stat-label {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 0.25rem;
  }

  .memory-stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e0e0e0;
  }

  .memory-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 1.5rem;
  }

  .memory-card {
    aspect-ratio: 1;
    perspective: 1000px;
    cursor: pointer;
  }

  .memory-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s;
    transform-style: preserve-3d;
  }

  .memory-card.flipped .memory-card-inner {
    transform: rotateY(180deg);
  }

  .memory-card.matched .memory-card-inner {
    transform: rotateY(180deg) scale(1.1);
  }

  .memory-card-front,
  .memory-card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-size: 3rem;
  }

  .memory-card-front {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 3px solid rgba(255, 255, 255, 0.3);
  }

  .memory-card-back {
    background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
    border: 3px solid rgba(255, 255, 255, 0.3);
    transform: rotateY(180deg);
  }

  .memory-card.matched .memory-card-back {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
  }

  .memory-message {
    text-align: center;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .memory-message.success {
    background: rgba(76, 175, 80, 0.2);
    border: 2px solid rgba(76, 175, 80, 0.5);
    color: #4caf50;
  }

  .memory-message.failure {
    background: rgba(255, 107, 107, 0.2);
    border: 2px solid rgba(255, 107, 107, 0.5);
    color: #ff6b6b;
  }

  .memory-message.info {
    background: rgba(102, 126, 234, 0.2);
    border: 2px solid rgba(102, 126, 234, 0.5);
    color: #667eea;
  }

  @media (max-width: 768px) {
    .memory-card-front,
    .memory-card-back {
      font-size: 2.5rem;
    }
  }
</style>

<div class="memory-game-box">
  <div class="memory-stats">
    <div class="memory-stat">
      <div class="memory-stat-label">Idő</div>
      <div class="memory-stat-value" id="memory-time">20</div>
    </div>
    <div class="memory-stat">
      <div class="memory-stat-label">Lépések</div>
      <div class="memory-stat-value" id="memory-moves">0</div>
    </div>
    <div class="memory-stat">
      <div class="memory-stat-label">Párok</div>
      <div class="memory-stat-value" id="memory-pairs">0/4</div>
    </div>
  </div>

  <div class="memory-grid" id="memory-grid"></div>

  <div class="memory-message info" id="memory-message">
    5 másodperc múlva elrejtjük a kártyákat...
  </div>
</div>

<script>
(function() {
  const symbols = ['🎁', '🎉', '🧩', '🎈', '🎁', '🎉', '🧩', '🎈', '⭐'];
  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  let moves = 0;
  let timeRemaining = 20;
  let gameStarted = false;
  let gameOver = false;
  let timerInterval = null;

  const grid = document.getElementById('memory-grid');
  const timeEl = document.getElementById('memory-time');
  const movesEl = document.getElementById('memory-moves');
  const pairsEl = document.getElementById('memory-pairs');
  const messageEl = document.getElementById('memory-message');

  // Shuffle array
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Initialize game
  function initGame() {
    const shuffled = shuffle(symbols);

    shuffled.forEach((symbol, index) => {
      const card = document.createElement('div');
      card.className = 'memory-card flipped';
      card.innerHTML = \`
        <div class="memory-card-inner">
          <div class="memory-card-front">?</div>
          <div class="memory-card-back">\${symbol}</div>
        </div>
      \`;
      card.dataset.index = index;
      card.dataset.symbol = symbol;
      card.addEventListener('click', () => handleCardClick(card));
      grid.appendChild(card);
      cards.push(card);
    });

    // Show all cards for 5 seconds
    setTimeout(() => {
      cards.forEach(card => card.classList.remove('flipped'));
      gameStarted = true;
      messageEl.textContent = 'Találd meg a párokat!';
      startTimer();
    }, 5000);
  }

  // Start countdown timer
  function startTimer() {
    timerInterval = setInterval(() => {
      timeRemaining--;
      timeEl.textContent = timeRemaining;

      if (timeRemaining <= 0) {
        endGame(false);
      }
    }, 1000);
  }

  // Handle card click
  function handleCardClick(card) {
    if (!gameStarted || gameOver || card.classList.contains('matched') || card.classList.contains('flipped')) {
      return;
    }

    if (flippedCards.length >= 2) {
      return;
    }

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      moves++;
      movesEl.textContent = moves;
      checkMatch();
    }
  }

  // Check if cards match
  function checkMatch() {
    const [card1, card2] = flippedCards;

    if (card1.dataset.symbol === card2.dataset.symbol && card1.dataset.index !== card2.dataset.index) {
      // Match!
      setTimeout(() => {
        card1.classList.add('matched');
        card2.classList.add('matched');
        matchedPairs++;
        pairsEl.textContent = \`\${matchedPairs}/4\`;
        flippedCards = [];

        if (matchedPairs === 4) {
          endGame(true);
        }
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        flippedCards = [];
      }, 1000);
    }
  }

  // End game
  function endGame(won) {
    gameOver = true;
    clearInterval(timerInterval);

    if (won) {
      messageEl.className = 'memory-message success';
      messageEl.textContent = \`🎉 Nyertél! \${moves} lépésből!\`;

      // Send win event to parent
      window.parent.postMessage({
        type: 'GAME_WIN',
        payload: {
          success: true,
          moves: moves,
          timeRemaining: timeRemaining
        }
      }, '*');
    } else {
      messageEl.className = 'memory-message failure';
      messageEl.textContent = '⏱️ Lejárt az idő! Próbáld újra!';

      // Send lose event to parent
      window.parent.postMessage({
        type: 'GAME_LOSE',
        payload: {
          success: false,
          moves: moves
        }
      }, '*');
    }
  }

  // Start game
  initGame();
})();
</script>
`
