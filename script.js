// script.js
// Entire game runs client-side. Initialization is wrapped to avoid DOM timing issues.

document.addEventListener('DOMContentLoaded', () => {
  // ---- config ----
  const WIDTH = 5, HEIGHT = 6;
  const WORDS = (window.WORD_LIST || []).map(w => w.toLowerCase()); // ensure lowercase
  if (!WORDS.length) {
    document.getElementById('board').textContent = 'No words found in words.js';
    return;
  }

  // date-seeded daily word
  function getDailyWord() {
    const d = new Date();
    const seed = d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate();
    return WORDS[seed % WORDS.length];
  }
  const SOLUTION = getDailyWord();

  // ---- state ----
  const allowed = new Set(WORDS);
  let board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(''));
  let row = 0, col = 0;
  let gameOver = false;

  // stats
  const LS = 'cs_wordle_daily_v2';
  function loadStats() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
  }
  function saveStats(s) { localStorage.setItem(LS, JSON.stringify(s)); }
  const stats = loadStats();
  stats.played = stats.played || 0;
  stats.wins = stats.wins || 0;
  stats.streak = stats.streak || 0;

  // ---- DOM refs ----
  const boardEl = document.getElementById('board');
  const keyboardEl = document.getElementById('keyboard');
  const numpadEl = document.getElementById('numpad');
  const noticeEl = document.getElementById('notice');
  const playedEl = document.getElementById('played');
  const winsEl = document.getElementById('wins');
  const streakEl = document.getElementById('streak');
  const enterBtn = document.getElementById('enterKey');
  const backBtn = document.getElementById('backKey');

  // ---- build grid ----
  function renderEmptyBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < HEIGHT; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'row';
      for (let c = 0; c < WIDTH; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('data-r', r);
        cell.setAttribute('data-c', c);
        rowDiv.appendChild(cell);
      }
      boardEl.appendChild(rowDiv);
    }
  }

  // ---- keyboard & numpad ----
  const KEY_LAYOUT = 'QWERTYUIOPASDFGHJKLZXCVBNM';
  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    for (const ch of KEY_LAYOUT) {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.textContent = ch;
      btn.addEventListener('click', () => handleInput(ch.toLowerCase()));
      keyboardEl.appendChild(btn);
    }
    // Enter and Back are separate (already in DOM)
  }
  function buildNumpad() {
    numpadEl.innerHTML = '';
    // layout 1-9 then 0
    for (let i = 1; i <= 9; i++) {
      const b = document.createElement('button');
      b.className = 'key';
      b.textContent = String(i);
      b.addEventListener('click', () => handleInput(String(i)));
      numpadEl.appendChild(b);
    }
    const b0 = document.createElement('button');
    b0.className = 'key';
    b0.textContent = '0';
    b0.addEventListener('click', () => handleInput('0'));
    // center 0 in grid by appending an empty placeholder first
    const placeholder = document.createElement('div');
    placeholder.style.width = '48px';
    placeholder.style.height = '1px';
    placeholder.style.visibility = 'hidden';
    numpadEl.appendChild(placeholder);
    numpadEl.appendChild(b0);
  }

  // ---- helpers ----
  function getCellEl(r, c) {
    return boardEl.children[r].children[c];
  }

  function showNotice(msg, timeout = 1500) {
    noticeEl.textContent = msg;
    noticeEl.style.opacity = '1';
    clearTimeout(noticeEl._t);
    noticeEl._t = setTimeout(() => { noticeEl.style.opacity = ''; noticeEl.textContent = ''; }, timeout);
  }

  function updateStatsUI() {
    playedEl.textContent = stats.played || 0;
    winsEl.textContent = stats.wins || 0;
    streakEl.textContent = stats.streak || 0;
  }

  // ---- input handling ----
  function handleInput(ch) {
    if (gameOver) return;
    if (col < WIDTH) {
      board[row][col] = ch;
      const el = getCellEl(row, col);
      el.textContent = ch;
      el.classList.add('filled');
      col++;
    }
  }
  function handleBack() {
    if (gameOver) return;
    if (col > 0) {
      col--;
      board[row][col] = '';
      const el = getCellEl(row, col);
      el.textContent = '';
      el.classList.remove('filled');
    }
  }

  // evaluate guess: returns array of 'correct'|'present'|'absent'
  function evaluateGuess(guess, sol) {
    const res = Array(WIDTH).fill('absent');
    const solArr = sol.split('');
    const freq = {};
    for (let ch of solArr) freq[ch] = (freq[ch] || 0) + 1;
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

  // ---- submit and reveal ----
  function revealRow(result) {
    // subtle stagger flip
    for (let c = 0; c < WIDTH; c++) {
      const el = getCellEl(row, c);
      // apply small flip via transform then add class
      setTimeout(() => {
        el.style.transition = 'transform 0.28s';
        el.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
          el.classList.add(result[c]); // correct/present/absent
          el.style.transform = 'rotateX(0deg)';
        }, 160);
      }, c * 140);
    }
  }

  function submitGuess() {
    if (gameOver) return;
    if (col !== WIDTH) {
      showNotice('Not enough letters');
      return;
    }
    const guess = board[row].join('').toLowerCase();
    if (!allowed.has(guess)) {
      showNotice('Not in word list');
      return;
    }

    const result = evaluateGuess(guess, SOLUTION);
    revealRow(result);

    // after reveal complete
    const revealDuration = WIDTH * 140 + 300;
    setTimeout(() => {
      if (result.every(r => r === 'correct')) {
        // win
        stats.played = (stats.played || 0) + 1;
        stats.wins = (stats.wins || 0) + 1;
        stats.streak = (stats.streak || 0) + 1;
        saveStats(stats);
        updateStatsUI();
        showNotice('You win!');
        gameOver = true;
        return;
      }

      // next row or out of tries
      row++;
      col = 0;
      if (row >= HEIGHT) {
        stats.played = (stats.played || 0) + 1;
        stats.streak = 0;
        saveStats(stats);
        updateStatsUI();
        showNotice('Out of tries — answer: ' + SOLUTION.toUpperCase(), 4000);
        gameOver = true;
      }
    }, revealDuration);
  }

  // ---- keyboard events ----
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    const k = e.key;
    if (/^[a-zA-Z0-9]$/.test(k)) handleInput(k.toLowerCase());
    else if (k === 'Backspace') handleBack();
    else if (k === 'Enter') submitGuess();
  });

  // wire on-screen buttons
  enterBtn.addEventListener('click', submitGuess);
  backBtn.addEventListener('click', handleBack);

  // ---- init ----
  function init() {
    renderEmptyBoard();
    buildKeyboard();
    buildNumpad();
    updateStatsUI();
    // For debugging: console.log('Solution:', SOLUTION);
  }

  init();
});
