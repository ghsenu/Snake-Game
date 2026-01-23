const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game tuning
const START_SPEED_MS = 140;
const MIN_SPEED_MS = 60;
const SPEED_UP_EVERY = 3; // speed increases every N points

let snake, food, dx, dy, score, gameOver, paused;
let intervalId = null;
let directionLock = false; // prevents double-turn in one tick

// ---- Sound (Web Audio) ----
let audioCtx = null;
function beep(freq = 440, duration = 0.06, type = "square", volume = 0.05) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {
    // If audio blocked, just ignore
  }
}

function playEat() { beep(880, 0.05, "square", 0.06); }
function playTurn() { beep(520, 0.03, "square", 0.03); }
function playGameOver() {
  beep(200, 0.12, "sawtooth", 0.05);
  setTimeout(() => beep(140, 0.15, "sawtooth", 0.05), 120);
}

// ---- Helpers ----
function resetGame() {
  snake = [{ x: 10, y: 10 }];
  dx = 1; dy = 0;
  score = 0;
  gameOver = false;
  paused = false;
  directionLock = false;

  food = randomFood();

  startLoop();
  draw();
}

function startLoop() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(gameLoop, getSpeedMs());
}

function getSpeedMs() {
  // speed up every SPEED_UP_EVERY points
  const level = Math.floor(score / SPEED_UP_EVERY);
  const speed = START_SPEED_MS - level * 12;
  return Math.max(MIN_SPEED_MS, speed);
}

function randomFood() {
  while (true) {
    const f = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
    const onSnake = snake?.some(p => p.x === f.x && p.y === f.y);
    if (!onSnake) return f;
  }
}

function gameLoop() {
  if (gameOver || paused) return;
  update();
  draw();
  directionLock = false; // allow next turn after movement happens
}

function endGame() {
  gameOver = true;
  playGameOver();
  draw();
}

// ---- Game Logic ----
function update() {
  const head = snake[0];
  const newHead = { x: head.x + dx, y: head.y + dy };

  // wall collision
  if (newHead.x < 0 || newHead.x >= tileCount || newHead.y < 0 || newHead.y >= tileCount) {
    endGame();
    return;
  }

  // self collision
  if (snake.some(p => p.x === newHead.x && p.y === newHead.y)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  // food eaten
  if (newHead.x === food.x && newHead.y === food.y) {
    score++;
    playEat();
    food = randomFood();

    // update speed as score grows
    startLoop();
  } else {
    snake.pop();
  }
}

// ---- Drawing ----
function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawFood() {
  // a slightly fancy food: square + small shine
  const px = food.x * gridSize;
  const py = food.y * gridSize;

  ctx.fillStyle = "red";
  ctx.fillRect(px, py, gridSize, gridSize);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(px + 4, py + 4, 6, 6);
}

function drawSnake() {
  // Body
  ctx.fillStyle = "lime";
  for (let i = 1; i < snake.length; i++) {
    const part = snake[i];
    ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize, gridSize);
  }

  // Head (slightly different style + eyes)
  const head = snake[0];
  const hx = head.x * gridSize;
  const hy = head.y * gridSize;

  ctx.fillStyle = "#2dff6a";
  ctx.fillRect(hx, hy, gridSize, gridSize);

  // Determine facing direction for eyes
  // dx, dy indicate movement
  const eyeOffset = 5;
  const eyeSize = 3;

  // eye positions for each direction
  let e1 = { x: hx + eyeOffset, y: hy + eyeOffset };
  let e2 = { x: hx + gridSize - eyeOffset - eyeSize, y: hy + eyeOffset };

  if (dx === 1) { // right
    e1 = { x: hx + gridSize - eyeOffset - eyeSize, y: hy + eyeOffset };
    e2 = { x: hx + gridSize - eyeOffset - eyeSize, y: hy + gridSize - eyeOffset - eyeSize };
  } else if (dx === -1) { // left
    e1 = { x: hx + eyeOffset, y: hy + eyeOffset };
    e2 = { x: hx + eyeOffset, y: hy + gridSize - eyeOffset - eyeSize };
  } else if (dy === 1) { // down
    e1 = { x: hx + eyeOffset, y: hy + gridSize - eyeOffset - eyeSize };
    e2 = { x: hx + gridSize - eyeOffset - eyeSize, y: hy + gridSize - eyeOffset - eyeSize };
  } else if (dy === -1) { // up
    e1 = { x: hx + eyeOffset, y: hy + eyeOffset };
    e2 = { x: hx + gridSize - eyeOffset - eyeSize, y: hy + eyeOffset };
  }

  ctx.fillStyle = "black";
  ctx.fillRect(e1.x, e1.y, eyeSize, eyeSize);
  ctx.fillRect(e2.x, e2.y, eyeSize, eyeSize);
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  const level = Math.floor(score / SPEED_UP_EVERY) + 1;
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Level: ${level}`, 10, 40);

  if (paused && !gameOver) {
    ctx.font = "24px Arial";
    ctx.fillText("PAUSED", 150, 200);
    ctx.font = "14px Arial";
    ctx.fillText("Press Space / ⏯️ to Resume", 110, 230);
  }

  if (gameOver) {
    ctx.fillStyle = "white";
    ctx.font = "28px Arial";
    ctx.fillText("GAME OVER", 120, 200);
    ctx.font = "16px Arial";
    ctx.fillText("Press R to Restart", 130, 230);
  }
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  drawSnake();
  drawHUD();
}

// ---- Input ----
function setDirection(newDx, newDy) {
  if (gameOver) return;
  if (directionLock) return; // avoid 2 turns in same tick

  // Prevent reverse
  if (newDx === -dx && newDy === -dy) return;

  dx = newDx;
  dy = newDy;
  directionLock = true;
  playTurn();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") setDirection(0, -1);
  else if (e.key === "ArrowDown") setDirection(0, 1);
  else if (e.key === "ArrowLeft") setDirection(-1, 0);
  else if (e.key === "ArrowRight") setDirection(1, 0);

  if (e.key === "r" || e.key === "R") resetGame();

  if (e.key === " " || e.code === "Space") {
    if (!gameOver) {
      paused = !paused;
      beep(300, 0.05, "square", 0.03);
      draw();
    }
  }
});

// Mobile buttons
function bindButton(id, dirFn) {
  const el = document.getElementById(id);
  if (!el) return;
  const handler = (ev) => {
    ev.preventDefault();
    // Resume audio context on first interaction (mobile browsers)
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    dirFn();
  };
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", handler, { passive: false });
}

bindButton("up", () => setDirection(0, -1));
bindButton("down", () => setDirection(0, 1));
bindButton("left", () => setDirection(-1, 0));
bindButton("right", () => setDirection(1, 0));
bindButton("pause", () => {
  if (!gameOver) {
    paused = !paused;
    beep(300, 0.05, "square", 0.03);
    draw();
  }
});

// Start
resetGame();
