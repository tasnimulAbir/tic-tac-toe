const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const cells = document.querySelectorAll(".cell");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const resetScoresBtn = document.getElementById("reset-scores");
const scoreEls = {
  X: document.getElementById("score-x"),
  O: document.getElementById("score-o"),
  draw: document.getElementById("score-draw"),
};

let board = Array(9).fill(null);
let currentPlayer = "X";
let gameOver = false;
const scores = { X: 0, O: 0, draw: 0 };

function getWinningLine() {
  return WIN_LINES.find(([a, b, c]) =>
    board[a] && board[a] === board[b] && board[a] === board[c]
  );
}

function handleCellClick(event) {
  const index = Number(event.currentTarget.dataset.index);
  if (gameOver || board[index]) return;

  board[index] = currentPlayer;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.disabled = true;

  const winLine = getWinningLine();
  if (winLine) {
    endGame(`Player ${currentPlayer} wins!`, currentPlayer);
    winLine.forEach((i) => cells[i].classList.add("win"));
  } else if (board.every(Boolean)) {
    endGame("It's a draw!", "draw");
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusEl.textContent = `Player ${currentPlayer}'s turn`;
  }
}

function endGame(message, result) {
  gameOver = true;
  statusEl.textContent = message;
  scores[result]++;
  renderScores();
  cells.forEach((cell) => (cell.disabled = true));
}

function renderScores() {
  Object.keys(scores).forEach((key) => {
    scoreEls[key].textContent = scores[key];
  });
}

function startRound() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  gameOver = false;
  statusEl.textContent = "Player X's turn";
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.className = "cell";
    cell.disabled = false;
  });
}

function resetScores() {
  Object.keys(scores).forEach((key) => (scores[key] = 0));
  renderScores();
  startRound();
}

cells.forEach((cell) => cell.addEventListener("click", handleCellClick));
restartBtn.addEventListener("click", startRound);
resetScoresBtn.addEventListener("click", resetScores);
