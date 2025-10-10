// script.js — centered keyboard + numpad, date-seeded word, lowercase comparisons
document.addEventListener('DOMContentLoaded', () => {
  const WIDTH = 5, HEIGHT = 6;
  const WORDS = (window.WORD_LIST || []).map(w => w.toLowerCase());
  if (!WORDS.length) {
    document.getElementById('board').textContent = 'No words in words.js';
    return;
  }

  // daily word (date-seeded)
  function getDailyWord() {
    const d = new Date();
    const seed = d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate();
    return WORDS[seed % WORDS.length];
  }
  const SOLUTION = getDailyWord();

  // state
  const allowed = new Set(WORDS);
  let board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(''));
  let row = 0, col = 0, gameOver = false;

  // DOM
  const boardEl = document.getElementById('board');
  const keyboardEl = document.getElementById('keyboard');
  const numpadEl = document.getElementById('numpad');
  const noticeEl = document.getElementById('notice');

  // build board
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < HEIGHT; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'row';
      for (let c = 0; c < WIDTH; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        rowDiv.appendChild(cell);
      }
      boardEl.appendChild(rowDiv);
    }
  }

  function getCell(r, c) { return boardEl.children[r].children[c]; }

  function showNotice(msg, ms = 1400) {
    noticeEl.textContent = msg;
    noticeEl.style.opacity = '1';
    clearTimeout(noticeEl._t);
    noticeEl._t = setTimeout(() => { noticeEl.style.opacity = '0'; noticeEl.textContent = ''; }, ms);
  }

  // keyboard layout: three rows
  const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    // first row
    const r1 = document.createElement('div'); r1.className = 'krow';
    for (const ch of ROWS[0]) r1.appendChild(makeKey(ch));
    keyboardEl.appendChild(r1);
    // second row
    const r2 = document.createElement('div'); r2.className = 'krow';
    for (const ch of ROWS[1]) r2.appendChild(makeKey(ch));
    keyboardEl.appendChild(r2);
    // third row: Enter + letters + Back
    const r3 = document.createElement('div'); r3.className = 'krow';
    const enter = makeKey('Enter', 'enter'); enter.addEventListener('click', submitGuess);
    r3.appendChild(enter);
    for (const ch of ROWS[2]) r3.appendChild(makeKey(ch));
    const back = makeKey('⌫', 'back'); back.addEventListener('click', handleBack);
    r3.appendChild(back);
    keyboardEl.appendChild(r3);
  }

  function makeKey(label, extraClass) {
    const b = document.createElement('button');
    b.className = 'key' + (extraClass ? ' ' + extraClass : '');
    b.textContent = label;
    if (!extraClass) {
      b.addEventListener('click', () => handleInput(label.toLowerCase()));
    }
    return b;
  }

  // numpad (centered under keyboard)
  function buildNumpad() {
    numpadEl.innerHTML = '';
    // create a 3x4-style layout: rows 1-3, 4-6, 7-9,   0 in center of last row
    const numbers = ['1','2','3','4','5','6','7','8','9'];
    for (const n of numbers) {
      const b = document.createElement('button');
      b.className = 'key';
      b.textContent = n;
      b.addEventListener('click', () => handleInput(n));
      numpadEl.appendChild(b);
    }
    // add placeholder, 0, placeholder to center 0
    const ph = document.createElement('div');
    ph.style.width = getComputedStyle(document.documentElement).getPropertyValue('--key-w') || '44px';
    ph.style.visibility = 'hidden';
    numpadEl.appendChild(ph);

    const b0 = document.createElement('button');
    b0.className = 'key';
    b0.textContent = '0';
    b0.addEventListener('click', () => handleInput('0'));
    numpadEl.appendChild(b0);

    const ph2 = ph.cloneNode(true);
    numpadEl.appendChild(ph2);
  }

  // input handlers
  function handleInput(ch) {
    if (gameOver) return;
    if (col >= WIDTH) return;
    board[row][col] = ch;
    const el = getCell(row, col);
    el.textContent = ch.toUpperCase();
    el.classList.add('filled');
    col++;
  }

  function handleBack() {
    if (gameOver) return;
    if (col <= 0) return;
    col--;
    board[row][col] = '';
    const el = getCell(row, col);
    el.textContent = '';
    el.classList.remove('filled');
  }

  // evaluation logic (lowercase compare)
  function evaluate(guess, sol) {
    // guess and sol are lowercase strings
    const res = Array(WIDTH).fill('absent');
    const freq = {};
    for (const ch of sol) freq[ch] = (freq[ch] || 0) + 1;
    // correct
    for (let i = 0; i < WIDTH; i++) {
      if (guess[i] === sol[i]) { res[i] = 'correct'; freq[guess[i]]--; }
    }
    // present
    for (let i = 0; i < WIDTH; i++) {
      if (res[i] === 'correct') continue;
      const ch = guess[i];
      if (freq[ch] > 0) { res[i] = 'present'; freq[ch]--; }
    }
    return res;
  }

  function revealRow(result) {
    for (let c = 0; c < WIDTH; c++) {
      const el = getCell(row, c);
      setTimeout(() => {
        el.style.transition = 'transform .28s';
        el.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
          el.classList.add(result[c]);
          el.style.transform = 'rotateX(0deg)';
        }, 140);
      }, c * 140);
    }
  }

  function submitGuess() {
    if (gameOver) return;
    if (col !== WIDTH) { showNotice('Not enough letters'); return; }

    const guess = board[row].join('').toLowerCase();
    if (!allowed.has(guess)) { showNotice('Not in word list'); return; }

    const res = evaluate(guess, SOLUTION);
    revealRow(res);

    const revealTime = WIDTH * 140 + 300;
    setTimeout(() => {
      if (res.every(x => x === 'correct')) {
        showNotice('You win!', 2500);
        gameOver = true;
        return;
      }
      row++;
      col = 0;
      if (row >= HEIGHT) {
        showNotice('Out of tries — answer: ' + SOLUTION.toUpperCase(), 4000);
        gameOver = true;
      }
    }, revealTime);
  }

  // physical keyboard support
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    const k = e.key;
    if (/^[a-zA-Z0-9]$/.test(k)) handleInput(k.toLowerCase());
    else if (k === 'Backspace') handleBack();
    else if (k === 'Enter') submitGuess();
  });

  // init
  function init() {
    renderBoard();
    buildKeyboard();
    buildNumpad();
    // debug: console.log('SOLUTION', SOLUTION);
  }
  init();
});
