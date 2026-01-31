const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Helper function for rounded rectangles (compatible with all browsers)
function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

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
function playGoldenEat() { 
  beep(1320, 0.08, "sine", 0.08);
  setTimeout(() => beep(1760, 0.06, "sine", 0.06), 80);
}
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
      type: Math.random() < 0.15 ? 'golden' : 'normal' // 15% chance for golden apple
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
    if (food.type === 'golden') {
      score += 3;
      playGoldenEat();
    } else {
      score++;
      playEat();
    }
    food = randomFood();

    // update speed as score grows
    startLoop();
  } else {
    snake.pop();
  }
}

// ---- Drawing ----
function drawBackground() {
  // Clean light green base color
  ctx.fillStyle = "#7cb342";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Subtle grid lines for game structure
  ctx.strokeStyle = "rgba(104, 159, 56, 0.3)";
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
  
  // Simple scattered grass patches (minimal and clean)
  const grassPatches = [
    {x: 60, y: 100}, {x: 180, y: 60}, {x: 300, y: 140},
    {x: 120, y: 240}, {x: 260, y: 200}, {x: 340, y: 300},
    {x: 40, y: 320}, {x: 200, y: 320}, {x: 80, y: 180}
  ];
  
  grassPatches.forEach((patch, i) => {
    // Small grass blades - simple and clean
    ctx.strokeStyle = "#558b2f";
    ctx.lineWidth = 1;
    
    for (let j = 0; j < 3; j++) {
      const grassX = patch.x + (j - 1) * 3;
      const grassY = patch.y;
      const height = 4 + Math.random() * 2;
      
      ctx.beginPath();
      ctx.moveTo(grassX, grassY);
      ctx.lineTo(grassX + Math.random() - 0.5, grassY - height);
      ctx.stroke();
    }
  });
}

function drawGrid() {
  // Grid is now drawn as part of background
}

function drawFood() {
  const px = food.x * gridSize;
  const py = food.y * gridSize;
  const centerX = px + gridSize / 2;
  const centerY = py + gridSize / 2;

  if (food.type === 'golden') {
    // Golden apple with sparkle animation
    const sparkleTime = Date.now() * 0.01;
    
    // Golden apple body
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 10);
    gradient.addColorStop(0, "#ffed4e");
    gradient.addColorStop(0.7, "#ff9800");
    gradient.addColorStop(1, "#f57c00");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 2, 9, 0, Math.PI * 2);
    ctx.fill();
    
    // Golden shine (brighter)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY - 1, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Golden stem
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(centerX - 1, py + 1, 2, 5);
    
    // Golden leaf
    ctx.fillStyle = "#66BB6A";
    ctx.beginPath();
    ctx.arc(centerX + 4, py + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Enhanced sparkle effects around golden apple
    // Main rotating sparkles
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    for (let i = 0; i < 6; i++) {
      const angle = sparkleTime + i * Math.PI / 3;
      const sparkleX = centerX + Math.cos(angle) * 14;
      const sparkleY = centerY + Math.sin(angle) * 14;
      const sparkleSize = 1.5 + Math.sin(sparkleTime * 4 + i) * 0.8;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Secondary counter-rotating sparkles
    ctx.fillStyle = "rgba(255, 237, 78, 0.7)";
    for (let i = 0; i < 4; i++) {
      const angle = -sparkleTime * 0.7 + i * Math.PI / 2;
      const sparkleX = centerX + Math.cos(angle) * 10;
      const sparkleY = centerY + Math.sin(angle) * 10;
      const sparkleSize = 0.8 + Math.sin(sparkleTime * 5 + i) * 0.4;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Tiny inner sparkles
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    for (let i = 0; i < 3; i++) {
      const angle = sparkleTime * 2 + i * Math.PI * 2 / 3;
      const sparkleX = centerX + Math.cos(angle) * 6;
      const sparkleY = centerY + Math.sin(angle) * 6;
      const sparkleSize = 0.5 + Math.sin(sparkleTime * 6 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Golden glow effect
    ctx.shadowColor = "#ffed4e";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(255, 237, 78, 0.3)";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
  } else {
    // Regular red apple with subtle sparkles
    const subtleSparkleTime = Date.now() * 0.005;
    
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Apple shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY - 1, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Apple stem
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(centerX - 1, py + 2, 2, 4);
    
    // Apple leaf
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(centerX + 4, py + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle sparkles for regular apples (less prominent)
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 3; i++) {
      const angle = subtleSparkleTime + i * Math.PI * 2 / 3;
      const sparkleX = centerX + Math.cos(angle) * 11;
      const sparkleY = centerY + Math.sin(angle) * 11;
      const sparkleSize = 0.5 + Math.sin(subtleSparkleTime * 3 + i) * 0.3;
      if (sparkleSize > 0.7) { // Only show when sparkle is bright enough
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Wave animation counter
let waveTime = 0;

function drawSnake() {
  waveTime += 0.3; // Increment wave animation
  
  // Body with waving effect
  for (let i = snake.length - 1; i >= 1; i--) {
    const part = snake[i];
    
    // Calculate wave offset based on position in snake and time
    const waveOffset = Math.sin(waveTime + i * 0.5) * 3;
    
    // Determine wave direction (perpendicular to movement)
    let offsetX = 0, offsetY = 0;
    if (dx !== 0) {
      offsetY = waveOffset; // Wave up/down when moving left/right
    } else {
      offsetX = waveOffset; // Wave left/right when moving up/down
    }
    
    const px = part.x * gridSize + offsetX;
    const py = part.y * gridSize + offsetY;
    
    // Gradient color from head to tail
    const gradient = 1 - (i / snake.length) * 0.4;
    const green = Math.floor(255 * gradient);
    ctx.fillStyle = `rgb(50, ${green}, 100)`;
    
    // Draw rounded body segment
    drawRoundedRect(px + 1, py + 1, gridSize - 2, gridSize - 2, 5);
    
    // Add shine to body
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    drawRoundedRect(px + 3, py + 3, 6, 4, 2);
  }

  // Head (cute round face)
  const head = snake[0];
  const hx = head.x * gridSize;
  const hy = head.y * gridSize;
  const centerX = hx + gridSize / 2;
  const centerY = hy + gridSize / 2;

  // Draw round head
  ctx.fillStyle = "#50ff80";
  drawRoundedRect(hx, hy, gridSize, gridSize, 6);
  
  // Head shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.beginPath();
  ctx.arc(hx + 6, hy + 5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Cute eyes with sparkle
  const eyeSize = 5;
  const pupilSize = 2;
  let e1, e2;

  if (dx === 1) { // right
    e1 = { x: centerX + 3, y: centerY - 4 };
    e2 = { x: centerX + 3, y: centerY + 4 };
  } else if (dx === -1) { // left
    e1 = { x: centerX - 5, y: centerY - 4 };
    e2 = { x: centerX - 5, y: centerY + 4 };
  } else if (dy === 1) { // down
    e1 = { x: centerX - 4, y: centerY + 3 };
    e2 = { x: centerX + 4, y: centerY + 3 };
  } else { // up
    e1 = { x: centerX - 4, y: centerY - 5 };
    e2 = { x: centerX + 4, y: centerY - 5 };
  }

  // White of eyes
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(e1.x, e1.y, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e2.x, e2.y, eyeSize, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (looking in movement direction)
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(e1.x + dx * 1.5, e1.y + dy * 1.5, pupilSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e2.x + dx * 1.5, e2.y + dy * 1.5, pupilSize, 0, Math.PI * 2);
  ctx.fill();

  // Eye sparkles (cute!)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(e1.x - 1, e1.y - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e2.x - 1, e2.y - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Cute blush marks (pink circles on cheeks)
  ctx.fillStyle = "rgba(255, 150, 150, 0.5)";
  if (dx === 1) { // right
    ctx.beginPath();
    ctx.arc(centerX, centerY - 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY + 6, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (dx === -1) { // left
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY - 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY + 6, 2, 0, Math.PI * 2);
    ctx.fill();
  } else { // up or down
    ctx.beginPath();
    ctx.arc(centerX - 6, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 6, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cute smile
  ctx.strokeStyle = "#2a5a3a";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  
  if (dx === 1) { // right
    ctx.beginPath();
    ctx.arc(centerX + 6, centerY, 3, 0.3 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();
  } else if (dx === -1) { // left
    ctx.beginPath();
    ctx.arc(centerX - 6, centerY, 3, 0.3 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();
  } else if (dy === 1) { // down
    ctx.beginPath();
    ctx.arc(centerX, centerY + 6, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else { // up
    ctx.beginPath();
    ctx.arc(centerX, centerY - 6, 3, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.stroke();
  }
  
  // Little tongue when moving (cute detail)
  if (!gameOver && !paused) {
    const tongueWiggle = Math.sin(waveTime * 2) * 1;
    ctx.fillStyle = "#ff6b8a";
    if (dx === 1) {
      ctx.beginPath();
      ctx.arc(hx + gridSize + 2, centerY + tongueWiggle, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (dx === -1) {
      ctx.beginPath();
      ctx.arc(hx - 2, centerY + tongueWiggle, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (dy === 1) {
      ctx.beginPath();
      ctx.arc(centerX + tongueWiggle, hy + gridSize + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(centerX + tongueWiggle, hy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHUD() {
  // Animated background for score display
  const time = Date.now() * 0.003;
  const gradient = ctx.createLinearGradient(5, 5, 125, 50);
  gradient.addColorStop(0, `rgba(46, 125, 50, ${0.8 + Math.sin(time) * 0.1})`);
  gradient.addColorStop(1, `rgba(27, 94, 32, ${0.9 + Math.sin(time + 1) * 0.1})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(5, 5, 120, 45);
  
  // Score display with game-style font
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#2e7d32";
  ctx.lineWidth = 2;
  ctx.font = "bold 16px 'Courier New', monospace";
  
  const level = Math.floor(score / SPEED_UP_EVERY) + 1;
  const scoreText = `SCORE: ${score}`;
  const levelText = `LEVEL: ${level}`;
  
  // Text with outline effect
  ctx.strokeText(scoreText, 10, 22);
  ctx.fillText(scoreText, 10, 22);
  ctx.strokeText(levelText, 10, 42);
  ctx.fillText(levelText, 10, 42);

  if (paused && !gameOver) {
    // Decorative pause screen with garden theme
    const pauseBoxX = 80, pauseBoxY = 160, pauseBoxW = 240, pauseBoxH = 100;
    
    // Decorative background with garden pattern
    const pauseGradient = ctx.createRadialGradient(200, 210, 0, 200, 210, 120);
    pauseGradient.addColorStop(0, "rgba(76, 175, 80, 0.95)");
    pauseGradient.addColorStop(1, "rgba(27, 94, 32, 0.95)");
    ctx.fillStyle = pauseGradient;
    drawRoundedRect(pauseBoxX, pauseBoxY, pauseBoxW, pauseBoxH, 15);
    
    // Decorative border
    ctx.strokeStyle = "#ffeb3b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(pauseBoxX, pauseBoxY, pauseBoxW, pauseBoxH, 15);
    ctx.stroke();
    
    // Animated "PAUSED" text
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1b5e20";
    ctx.lineWidth = 3;
    ctx.font = "bold 32px 'Impact', 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    
    const pauseScale = 1 + Math.sin(time * 2) * 0.05;
    ctx.save();
    ctx.translate(200, 195);
    ctx.scale(pauseScale, pauseScale);
    ctx.strokeText("⏸️ PAUSED ⏸️", 0, 0);
    ctx.fillText("⏸️ PAUSED ⏸️", 0, 0);
    ctx.restore();
    
    // Instruction text
    ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#ffeb3b";
    ctx.strokeStyle = "#1b5e20";
    ctx.lineWidth = 2;
    ctx.strokeText("Press SPACE or ⏯️ to Resume", 200, 230);
    ctx.fillText("Press SPACE or ⏯️ to Resume", 200, 230);
    
    ctx.textAlign = "left";
  }

  if (gameOver) {
    // Epic game over screen with decorative elements
    const gameOverBoxX = 60, gameOverBoxY = 140, gameOverBoxW = 280, gameOverBoxH = 120;
    
    // Dramatic background with pulsing effect
    const pulseIntensity = 0.8 + Math.sin(time * 3) * 0.2;
    const gameOverGradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 140);
    gameOverGradient.addColorStop(0, `rgba(183, 28, 28, ${pulseIntensity})`);
    gameOverGradient.addColorStop(0.7, `rgba(136, 14, 79, ${pulseIntensity * 0.9})`);
    gameOverGradient.addColorStop(1, `rgba(49, 27, 146, ${pulseIntensity * 0.8})`);
    ctx.fillStyle = gameOverGradient;
    drawRoundedRect(gameOverBoxX, gameOverBoxY, gameOverBoxW, gameOverBoxH, 20);
    
    // Glowing border effect
    ctx.shadowColor = "#ff5722";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#ff8a65";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(gameOverBoxX, gameOverBoxY, gameOverBoxW, gameOverBoxH, 20);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Animated "GAME OVER" text with dramatic effect
    ctx.textAlign = "center";
    ctx.font = "bold 36px 'Impact', 'Arial Black', sans-serif";
    
    // Multiple text layers for depth
    const textScale = 1 + Math.sin(time * 2) * 0.03;
    ctx.save();
    ctx.translate(200, 185);
    ctx.scale(textScale, textScale);
    
    // Shadow layer
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillText("💀 GAME OVER 💀", 3, 3);
    
    // Outline layer
    ctx.strokeStyle = "#b71c1c";
    ctx.lineWidth = 4;
    ctx.strokeText("💀 GAME OVER 💀", 0, 0);
    
    // Main text
    const textGradient = ctx.createLinearGradient(-100, -20, 100, 20);
    textGradient.addColorStop(0, "#ff5252");
    textGradient.addColorStop(0.5, "#ffffff");
    textGradient.addColorStop(1, "#ff5252");
    ctx.fillStyle = textGradient;
    ctx.fillText("💀 GAME OVER 💀", 0, 0);
    
    ctx.restore();
    
    // Restart instruction with glow effect
    ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#4caf50";
    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#4caf50";
    ctx.shadowBlur = 5;
    ctx.strokeText("🔄 Press R to Restart 🔄", 200, 225);
    ctx.fillText("🔄 Press R to Restart 🔄", 200, 225);
    ctx.shadowBlur = 0;
    
    // Decorative sparkles around game over box
    for (let i = 0; i < 8; i++) {
      const angle = time + i * Math.PI / 4;
      const sparkleX = 200 + Math.cos(angle) * 160;
      const sparkleY = 200 + Math.sin(angle) * 80;
      const sparkleSize = 2 + Math.sin(time * 4 + i) * 1;
      
      ctx.fillStyle = `hsl(${(time * 50 + i * 45) % 360}, 100%, 70%)`;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.textAlign = "left";
  }
}

function draw() {
  drawBackground();
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
