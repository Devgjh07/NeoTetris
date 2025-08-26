const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
context.scale(30, 30);

const ROW = 20;
const COL = 10;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

const COLORS = {
  I: "cyan", J: "blue", L: "orange",
  O: "yellow", S: "green", T: "purple", Z: "red",
};

let board = Array.from({ length: ROW }, () => Array(COL).fill(0));

function drawBoard() {
  board.forEach((row, y) =>
    row.forEach((value, x) => {
      context.fillStyle = value ? value : "#111";
      context.fillRect(x, y, 1, 1);
      context.strokeStyle = "#222";
      context.strokeRect(x, y, 1, 1);
    })
  );
}

class Piece {
  constructor(type) {
    this.type = type;
    this.shape = SHAPES[type];
    this.color = COLORS[type];
    this.pos = { x: 3, y: 0 };
  }
}

let currentPiece;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;

function collide(board, piece) {
  return piece.shape.some((row, y) =>
    row.some((value, x) =>
      value &&
      (board[y + piece.pos.y] && board[y + piece.pos.y][x + piece.pos.x]) !== 0
    )
  );
}

function merge(board, piece) {
  piece.shape.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value) board[y + piece.pos.y][x + piece.pos.x] = piece.color;
    })
  );
}

function playerDrop() {
  currentPiece.pos.y++;
  if (collide(board, currentPiece)) {
    currentPiece.pos.y--;
    merge(board, currentPiece);
    resetPiece();
    clearLines();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  currentPiece.pos.x += dir;
  if (collide(board, currentPiece)) {
    currentPiece.pos.x -= dir;
  }
}

function playerRotate() {
  const prev = currentPiece.shape;
  currentPiece.shape = currentPiece.shape[0].map((_, i) =>
    currentPiece.shape.map(r => r[i]).reverse()
  );
  if (collide(board, currentPiece)) {
    currentPiece.shape = prev;
  }
}

function clearLines() {
  outer: for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COL).fill(0));
      score += 100;
      document.getElementById("score").innerText = score;
      y++;
    }
  }
}

function resetPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  currentPiece = new Piece(type);
  if (collide(board, currentPiece)) {
    board = Array.from({ length: ROW }, () => Array(COL).fill(0));
    score = 0;
    document.getElementById("score").innerText = score;
  }
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  currentPiece.shape.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = currentPiece.color;
        context.fillRect(x + currentPiece.pos.x, y + currentPiece.pos.y, 1, 1);
      }
    })
  );
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

// 키 이벤트
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") playerMove(-1);
  else if (event.key === "ArrowRight") playerMove(1);
  else if (event.key === "ArrowDown") playerDrop();
  else if (event.key === "ArrowUp") playerRotate();
  else if (event.key === " ") {
    while (!collide(board, currentPiece)) {
      currentPiece.pos.y++;
    }
    currentPiece.pos.y--;
    merge(board, currentPiece);
    resetPiece();
    clearLines();
  }
});

window.startGame = () => {
  resetPiece();
  update();
};

