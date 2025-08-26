import { Application, Graphics, Text, Container } from "pixi.js";

// --- 게임 상수 ---
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const TETROMINOES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  L: [[1,0,0],[1,1,1]],
  J: [[0,0,1],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
};
const COLORS = {
  I: 0x00f0f0,
  O: 0xf0f000,
  T: 0xbf40ff,
  L: 0xf0a000,
  J: 0x3399ff,
  S: 0x00f066,
  Z: 0xff3366,
};

function randomPiece() {
  const keys = Object.keys(TETROMINOES);
  const k = keys[Math.floor(Math.random() * keys.length)];
  return { k, shape: TETROMINOES[k].map(r=>[...r]), color: COLORS[k], x: 3, y: 0 };
}

// --- 전역 상태 ---
let app;
let board;
let current;
let nextPiece;
let holdPiece = null;
let canHold = true;
let score = 0;
let paused = false;

// 속도
let dropTimer = 0;
let dropInterval = 550;

// 캔버스 위치
let originX = 0;
let originY = 0;

// DOM
const menuEl = document.getElementById("menu");
const stageEl = document.getElementById("stage");
const gameRoot = document.getElementById("game-root");
const scoreEl = document.getElementById("score");
const nameEl  = document.getElementById("playerName");
const nextCanvas = document.getElementById("nextCanvas");
const holdCanvas = document.getElementById("holdCanvas");
const nextCtx = nextCanvas.getContext("2d");
const holdCtx = holdCanvas.getContext("2d");

// --- 유틸 ---
function collide(piece = current, offX = 0, offY = 0) {
  const { shape, x, y } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c + offX;
      const ny = y + r + offY;
      if (ny >= ROWS || nx < 0 || nx >= COLS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function merge() {
  const { shape, x, y, color } = current;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] && y + r >= 0) board[y + r][x + c] = color;
    }
  }
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(v => v)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }
  if (cleared) score += cleared * 100;
}

function rotateWithKick() {
  const s = current.shape;
  const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
  const candidate = { ...current, shape: rotated };

  if (!collide(candidate)) {
    current.shape = rotated;
    return;
  }
  const kicks = [-1, 1, -2, 2];
  for (const dx of kicks) {
    if (!collide(candidate, dx, 0)) {
      current.x += dx;
      current.shape = rotated;
      return;
    }
  }
}

function hardDrop() {
  while (!collide(current, 0, 1)) current.y++;
  lockDown();
}

function lockDown() {
  merge();
  clearLines();
  current = nextPiece;
  nextPiece = randomPiece();
  canHold = true;
  if (collide(current, 0, 0)) {
    alert("Game Over!");
    initGameState();
  }
}

// --- 네온/입체 블럭 ---
function drawBlockG(g, x, y, color, alpha = 1) {
  // 본체
  g.beginFill(color, alpha);
  g.drawRoundedRect(x, y, BLOCK, BLOCK, 7);
  g.endFill();

  // 하이라이트
  g.beginFill(0xffffff, 0.25 * alpha);
  g.drawRoundedRect(x + 2, y + 2, BLOCK - 4, BLOCK / 3, 6);
  g.endFill();

  // 그림자
  g.beginFill(0x000000, 0.22 * alpha);
  g.drawRoundedRect(x + 2, y + BLOCK - BLOCK / 3 - 2, BLOCK - 4, BLOCK / 3, 6);
  g.endFill();

  // 네온 테두리
  g.lineStyle(2.5, 0xffffff, 1 * alpha);
  g.drawRoundedRect(x, y, BLOCK, BLOCK, 7);
  g.lineStyle(2, color, 0.8 * alpha);
  g.drawRoundedRect(x, y, BLOCK, BLOCK, 7);
}

// 보드/패널
function drawPlayfieldBackground() {
  const bg = new Graphics();
  bg.beginFill(0x151a24, 0.95);
  bg.drawRoundedRect(originX - 8, originY - 8, COLS * BLOCK + 16, ROWS * BLOCK + 16, 14);
  bg.endFill();
  bg.lineStyle(4, 0x00eaff, 0.9);
  bg.drawRoundedRect(originX - 8, originY - 8, COLS * BLOCK + 16, ROWS * BLOCK + 16, 14);
  app.stage.addChild(bg);

  for (let r = 0; r <= ROWS; r++) {
    const l = new Graphics();
    l.lineStyle(1, 0x00f0ff, 0.1);
    l.moveTo(originX, originY + r * BLOCK);
    l.lineTo(originX + COLS * BLOCK, originY + r * BLOCK);
    app.stage.addChild(l);
  }
  for (let c = 0; c <= COLS; c++) {
    const l = new Graphics();
    l.lineStyle(1, 0x00f0ff, 0.1);
    l.moveTo(originX + c * BLOCK, originY);
    l.lineTo(originX + c * BLOCK, originY + ROWS * BLOCK);
    app.stage.addChild(l);
  }
}

// 네온 텍스트
function neonText(str, x, y, color = 0x00eaff, size = 20) {
  const t = new Text(str, {
    fill: color, fontSize: size, fontWeight: "700",
    dropShadow: true, dropShadowColor: color, dropShadowBlur: 10
  });
  t.x = x; t.y = y;
  app.stage.addChild(t);
  return t;
}

// Next/Hold 미니캔버스
function drawMini(ctx, piece) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!piece) return;
  const s = piece.shape;
  const w = s[0].length * (BLOCK - 8);
  const h = s.length * (BLOCK - 8);
  const offX = (ctx.canvas.width - w) / 2;
  const offY = (ctx.canvas.height - h) / 2;

  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      const x = offX + c * (BLOCK - 8);
      const y = offY + r * (BLOCK - 8);

      ctx.fillStyle = "#00000033";
      ctx.fillRect(x + 2, y + (BLOCK - 8) - 10, BLOCK - 12, 10);

      ctx.fillStyle = "#ffffff44";
      ctx.fillRect(x + 1, y + 1, BLOCK - 10, (BLOCK - 8) / 3);

      ctx.strokeStyle = "#ffffffcc";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, BLOCK - 8, BLOCK - 8);

      ctx.fillStyle = "#" + piece.color.toString(16).padStart(6,"0");
      ctx.fillRect(x, y, BLOCK - 8, BLOCK - 8);
    }
  }
}

// --- 렌더 루프 ---
function draw() {
  app.stage.removeChildren();

  drawPlayfieldBackground();

  // 고정 블럭
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue;
      const g = new Graphics();
      drawBlockG(g, originX + x * BLOCK, originY + y * BLOCK, board[y][x]);
      app.stage.addChild(g);
    }
  }

  // 현재 조각
  const { shape, x, y, color } = current;
  const cont = new Container();
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const g = new Graphics();
      drawBlockG(g, originX + (x + c) * BLOCK, originY + (y + r) * BLOCK, color);
      cont.addChild(g);
    }
  }
  app.stage.addChild(cont);

  // 유령 조각
  let ghostY = y;
  while (!collide({ ...current, y: ghostY + 1 })) ghostY++;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const g = new Graphics();
      drawBlockG(g, originX + (x + c) * BLOCK, originY + (ghostY + r) * BLOCK, color, 0.18);
      app.stage.addChild(g);
    }
  }

  // 컨트롤 힌트
  neonText("← → Move   ↓ Soft   ↑ Rotate   Space Hard   Shift Hold   P Pause",
           originX - 6, originY + ROWS * BLOCK + 14, 0xff4dff, 14);

  scoreEl.textContent = String(score);
  drawMini(nextCtx, nextPiece);
  drawMini(holdCtx, holdPiece);
}

function step(deltaMS) {
  if (!paused) {
    dropTimer += deltaMS;
    if (dropTimer >= dropInterval) {
      if (!collide(current, 0, 1)) {
        current.y++;
      } else {
        lockDown();
      }
      dropTimer = 0;
    }
  }
  draw();
}

// --- 초기화 / 시작 ---
async function start(username = "Guest") {
  app = new Application();
  await app.init({
    width: 800,
    height: 720,
    backgroundAlpha: 0,
    antialias: true,
  });

  gameRoot.innerHTML = "";
  gameRoot.appendChild(app.canvas);

  initGameState();

  originX = (app.renderer.width - COLS * BLOCK) / 2;
  originY = 40;

  app.ticker.add(({ deltaMS }) => step(deltaMS));

  window.onkeydown = (e) => {
    if (paused && e.key.toLowerCase() !== "p") return;
    if (e.key === "ArrowLeft") { if (!collide(current, -1, 0)) current.x--; }
    else if (e.key === "ArrowRight") { if (!collide(current, 1, 0)) current.x++; }
    else if (e.key === "ArrowDown") {
      if (!collide(current, 0, 1)) current.y++;
      else lockDown();
      dropTimer = 0;
    }
    else if (e.key === "ArrowUp") rotateWithKick();
    else if (e.code === "Space") hardDrop();
    else if (e.key === "Shift") hold();
    else if (e.key.toLowerCase() === "p") paused = !paused;
  };

  nameEl.textContent = username;
  menuEl.style.display = "none";
  stageEl.style.display = "grid";
}

function initGameState() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  current = randomPiece();
  nextPiece = randomPiece();
  holdPiece = null;
  canHold = true;
  score = 0;
  paused = false;
  dropTimer = 0;
}

function hold() {
  if (!canHold) return;
  if (!holdPiece) {
    holdPiece = { ...current };
    current = nextPiece;
    nextPiece = randomPiece();
  } else {
    [holdPiece, current] = [current, holdPiece];
    current.x = 3; current.y = 0;
  }
  canHold = false;
}

// --- 시작 버튼 ---
document.getElementById("startBtn").addEventListener("click", () => {
  const username = (document.getElementById("username").value || "Guest").trim();
  start(username);
});

