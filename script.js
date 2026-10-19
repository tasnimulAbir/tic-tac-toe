const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const STORAGE_KEY = "ttt-history";
const THEME_KEY = "ttt-theme";
const RECENT_LIMIT = 6;

const cells = document.querySelectorAll(".cell");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const resetScoresBtn = document.getElementById("reset-scores");
const themeToggle = document.getElementById("theme-toggle");
const playerEls = {
  X: document.getElementById("player-x"),
  O: document.getElementById("player-o"),
};
const scoreEls = {
  X: document.getElementById("score-x"),
  O: document.getElementById("score-o"),
  draw: document.getElementById("score-draw"),
};
const tooltip = document.getElementById("tooltip");

let board = Array(9).fill(null);
let currentPlayer = "X";
let gameOver = false;
let moveCount = 0;
// Each finished game: { result: "X" | "O" | "draw", moves, line, board, at }
let history = loadHistory();

// ---------- Storage (wrapped: storage can be blocked or unavailable) ----------

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Stats still work for this session; they just won't persist.
  }
}

// ---------- Game ----------

function getWinningLine() {
  return WIN_LINES.find(([a, b, c]) =>
    board[a] && board[a] === board[b] && board[a] === board[c]
  );
}

function cellLabel(index) {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  return `Row ${row}, column ${col}, ${board[index] || "empty"}`;
}

function setActivePlayer(player) {
  playerEls.X.classList.toggle("active", player === "X");
  playerEls.O.classList.toggle("active", player === "O");
}

function handleCellClick(event) {
  const index = Number(event.currentTarget.dataset.index);
  if (gameOver || board[index]) return;

  board[index] = currentPlayer;
  moveCount++;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.setAttribute("aria-label", cellLabel(index));
  cell.setAttribute("aria-disabled", "true");

  const winLine = getWinningLine();
  if (winLine) {
    endGame(`Player ${currentPlayer} wins!`, currentPlayer, winLine);
    winLine.forEach((i) => cells[i].classList.add("win"));
  } else if (board.every(Boolean)) {
    endGame("It's a draw!", "draw", null);
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusEl.textContent = `Player ${currentPlayer}'s turn`;
    setActivePlayer(currentPlayer);
  }
}

function endGame(message, result, line) {
  gameOver = true;
  statusEl.textContent = message;
  setActivePlayer(result === "draw" ? null : result);
  history.push({
    result,
    moves: moveCount,
    line,
    board: board.map((mark) => mark || "-").join(""),
    at: Date.now(),
  });
  saveHistory();
  renderDashboard();
  cells.forEach((cell) => cell.setAttribute("aria-disabled", "true"));
}

function startRound() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  gameOver = false;
  moveCount = 0;
  statusEl.textContent = "Player X's turn";
  setActivePlayer("X");
  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.className = "cell";
    cell.setAttribute("aria-label", cellLabel(index));
    cell.removeAttribute("aria-disabled");
  });
}

function resetScores() {
  if (history.length && !confirm("Clear all saved stats? This can't be undone.")) return;
  history = [];
  saveHistory();
  renderDashboard();
}

// ---------- Dashboard ----------

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function computeStats() {
  const counts = { X: 0, O: 0, draw: 0 };
  const heat = Array(9).fill(0);
  let totalMoves = 0;
  let best = { player: null, length: 0 };
  let run = { player: null, length: 0 };

  history.forEach((game) => {
    counts[game.result]++;
    totalMoves += game.moves;
    if (game.line) game.line.forEach((i) => heat[i]++);

    if (game.result === "draw") {
      run = { player: null, length: 0 };
    } else if (game.result === run.player) {
      run.length++;
    } else {
      run = { player: game.result, length: 1 };
    }
    if (run.length > best.length) best = { ...run };
  });

  return {
    total: history.length,
    counts,
    heat,
    avgMoves: history.length ? totalMoves / history.length : null,
    streak: run,
    best,
  };
}

function relativeTime(timestamp) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function resultLabel(result) {
  return result === "draw" ? "Draw" : `${result} won`;
}

function renderKpis({ total, counts }) {
  document.getElementById("kpi-games").textContent = total;
  document.getElementById("kpi-games-sub").textContent =
    total ? `${total === 1 ? "game" : "games"} played` : "No games yet";

  Object.keys(scoreEls).forEach((key) => {
    scoreEls[key].textContent = counts[key];
    document.getElementById(`score-${key.toLowerCase()}-sub`).textContent = `${percent(counts[key], total)}% of games`;
  });
}

function renderSplitBar({ total, counts }) {
  const bar = document.getElementById("split-bar");
  bar.replaceChildren();

  ["X", "draw", "O"].forEach((key) => {
    document.getElementById(`legend-${key.toLowerCase()}`).textContent =
      `${percent(counts[key], total)}%`;
    if (!counts[key]) return;
    const seg = document.createElement("div");
    seg.className = `split-seg ${key.toLowerCase()}`;
    seg.style.flexGrow = counts[key];
    seg.dataset.tip = `${resultLabel(key === "draw" ? "draw" : key)}: ${counts[key]} (${percent(counts[key], total)}%)`;
    bar.appendChild(seg);
  });

  bar.setAttribute(
    "aria-label",
    total
      ? `X won ${percent(counts.X, total)}%, draws ${percent(counts.draw, total)}%, O won ${percent(counts.O, total)}%`
      : "No games played yet"
  );
}

function renderStreaks({ streak, best }) {
  document.getElementById("streak-current").textContent =
    streak.length ? `${streak.player} × ${streak.length}` : "–";
  document.getElementById("streak-best").textContent =
    best.length ? `Best: ${best.player} × ${best.length}` : "Best: –";
}

function renderAvgMoves({ avgMoves }) {
  document.getElementById("avg-moves").textContent =
    avgMoves === null ? "–" : avgMoves.toFixed(1);
}

function renderHeatmap({ heat }) {
  const map = document.getElementById("heatmap");
  const max = Math.max(...heat);
  map.replaceChildren();

  heat.forEach((count, index) => {
    const square = document.createElement("div");
    const share = max ? count / max : 0;
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    square.className = "heat";
    square.classList.toggle("strong", share > 0.6);
    // Floor at 12% so any non-zero square reads as different from an empty one.
    square.style.setProperty("--heat", `${count ? 12 + share * 88 : 0}%`);
    square.textContent = count;
    square.setAttribute("role", "img");
    square.setAttribute("aria-label", `Row ${row}, column ${col}: ${count} wins`);
    square.dataset.tip = `Row ${row}, col ${col}: in ${count} winning ${count === 1 ? "line" : "lines"}`;
    map.appendChild(square);
  });
}

function renderRecent() {
  const list = document.getElementById("recent");
  list.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Finished games show up here.";
    list.appendChild(empty);
    return;
  }

  history.slice(-RECENT_LIMIT).reverse().forEach((game) => {
    const item = document.createElement("li");
    item.className = "recent-item";

    const mini = document.createElement("span");
    mini.className = "mini";
    mini.setAttribute("aria-hidden", "true");
    [...game.board].forEach((mark, index) => {
      const square = document.createElement("i");
      if (mark !== "-") square.className = mark.toLowerCase();
      if (game.line && game.line.includes(index)) square.classList.add("win");
      mini.appendChild(square);
    });

    const result = document.createElement("span");
    result.className = "recent-result";
    result.textContent = resultLabel(game.result);

    const meta = document.createElement("span");
    meta.className = "recent-meta";
    meta.textContent = `${game.moves} moves · ${relativeTime(game.at)}`;

    item.append(mini, result, meta);
    list.appendChild(item);
  });
}

function renderDashboard() {
  const stats = computeStats();
  renderKpis(stats);
  renderSplitBar(stats);
  renderStreaks(stats);
  renderAvgMoves(stats);
  renderHeatmap(stats);
  renderRecent();
}

// ---------- Tooltip (for any element with data-tip) ----------

function showTip(event) {
  const target = event.target.closest("[data-tip]");
  if (!target) return;
  tooltip.textContent = target.dataset.tip;
  tooltip.hidden = false;
  const rect = target.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - tooltip.offsetWidth / 2),
    window.innerWidth - tooltip.offsetWidth - 8
  );
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(8, rect.top - tooltip.offsetHeight - 8)}px`;
}

function hideTip(event) {
  if (event.target.closest("[data-tip]")) tooltip.hidden = true;
}

// ---------- Theme ----------

function currentTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit) return explicit;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Theme still switches; it just won't be remembered.
  }
}

try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) applyTheme(saved);
} catch {
  // Fall back to the system theme.
}
themeToggle.setAttribute("aria-label", `Switch to ${currentTheme() === "dark" ? "light" : "dark"} theme`);

cells.forEach((cell) => cell.addEventListener("click", handleCellClick));
restartBtn.addEventListener("click", startRound);
resetScoresBtn.addEventListener("click", resetScores);
themeToggle.addEventListener("click", toggleTheme);
document.addEventListener("pointerover", showTip);
document.addEventListener("pointerout", hideTip);

renderDashboard();
