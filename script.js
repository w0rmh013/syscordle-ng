const WIDTH = 5, HEIGHT = 6;

let board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(''));
let row = 0, col = 0;

let stats = JSON.parse(localStorage.getItem('stats') || '{}');
stats.played = stats.played || 0;
stats.wins = stats.wins || 0;
stats.streak = stats.streak || 0;
updateStats();

// Choose today's word based on date
function getDailyWord() {
  const today = new Date();
  const seed = today.getFullYear() * 1000 + today.getMonth() * 31 + today.getDate();
  return window.WORD_LIST[seed % window.WORD_LIST.length];
}

const solution = getDailyWord();
const ALLOWED = new Set(window.WORD_LIST);


function setup() {
  const boardEl = document.getElementById('board');
  for (let r = 0; r < HEIGHT; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    for (let c = 0; c < WIDTH; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = `cell-${r}-${c}`;
      rowEl.appendChild(cell);
    }
    boardEl.appendChild(rowEl);
  }

  const keys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
  const kb = document.getElementById('keyboard');
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.textContent = k;
    btn.className = 'key';
    btn.onclick = () => handleKey(k);
    kb.appendChild(btn);
  });

  const enter = document.createElement('button');
  enter.textContent = 'Enter';
  enter.className = 'key enter';
  enter.onclick = () => submitGuess();
  kb.appendChild(enter);

  const back = document.createElement('button');
  back.textContent = '←';
  back.className = 'key back';
  back.onclick = () => backspace();
  kb.appendChild(back);

  document.addEventListener('keydown', handlePhysicalKey);
}

function handlePhysicalKey(e) {
  if (e.key === 'Enter') submitGuess();
  else if (e.key === 'Backspace') backspace();
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
}

function handleKey(k) {
  if (col < WIDTH) {
    board[row][col] = k;
    document.getElementById(`cell-${row}-${col}`).textContent = k;
    col++;
  }
}

function backspace() {
  if (col > 0) {
    col--;
    board[row][col] = '';
    document.getElementById(`cell-${row}-${col}`).textContent = '';
  }
}

function showNotice(msg) {
  const n = document.getElementById('notice');
  n.textContent = msg;
  setTimeout(() => (n.textContent = ''), 1500);
}

function evaluate(g, s) {
  const res = Array(WIDTH).fill('absent');
  const freq = {};
  for (let i = 0; i < WIDTH; i++) freq[s[i]] = (freq[s[i]] || 0) + 1;
  for (let i = 0; i < WIDTH; i++) {
    if (g[i] === s[i]) {
      res[i] = 'correct';
      freq[g[i]]--;
    }
  }
  for (let i = 0; i < WIDTH; i++) {
    if (res[i] === 'correct') continue;
    if (freq[g[i]] > 0) {
      res[i] = 'present';
      freq[g[i]]--;
    }
  }
  return res;
}

function getCellEl(r, c) {
  return document.getElementById(`cell-${r}-${c}`);
}

function submitGuess() {
  if (col !== WIDTH) {
    showNotice('Not enough letters');
    return;
  }
  const guess = board[row].join('');
  if (!ALLOWED.has(guess.toLowerCase())) {
    showNotice('Not in word list');
    return;
  }

  const res = evaluate(guess, solution);

  // Simple & subtle wave animation
  for (let c = 0; c < WIDTH; c++) {
    const el = getCellEl(row, c);
    setTimeout(() => {
      el.style.transform = 'rotateX(180deg)';
      setTimeout(() => {
        el.classList.add(res[c]);
        el.style.transform = 'rotateX(0deg)';
      }, 200);
    }, c * 150);
  }

  if (res.every(x => x === 'correct')) {
    setTimeout(() => endGame(true), WIDTH * 150 + 400);
    return;
  }

  setTimeout(() => {
    row++;
    col = 0;
    if (row >= HEIGHT) endGame(false);
  }, WIDTH * 150 + 400);
}

function endGame(win) {
  stats.played++;
  if (win) {
    stats.wins++;
    stats.streak++;
    showNotice('You Win!');
  } else {
    stats.streak = 0;
    showNotice('The word was ' + solution);
  }
  localStorage.setItem('stats', JSON.stringify(stats));
  updateStats();
}

function updateStats() {
  document.getElementById('played').textContent = stats.played;
  document.getElementById('wins').textContent = stats.wins;
  document.getElementById('streak').textContent = stats.streak;
}

setup();
