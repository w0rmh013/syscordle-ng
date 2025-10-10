document.addEventListener('DOMContentLoaded', () => {
  const WIDTH = 5, HEIGHT = 6;
  let board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(''));
  let row = 0, col = 0;

  function getDailyWord() {
    const today = new Date();
    const seed = today.getFullYear() * 1000 + today.getMonth() * 31 + today.getDate();
    return window.WORD_LIST[seed % window.WORD_LIST.length].toLowerCase();
  }

  const solution = getDailyWord();
  const ALLOWED = new Set(window.WORD_LIST.map(w => w.toLowerCase()));

  const boardEl = document.getElementById('board');
  const keyboardEl = document.getElementById('keyboard');
  const notice = document.getElementById('notice');

  // Create grid
  for (let r = 0; r < HEIGHT; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    for (let c = 0; c < WIDTH; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      rowEl.appendChild(cell);
    }
    boardEl.appendChild(rowEl);
  }

  // Build keyboard
  const kbLayout = [
    "1234567890",
    "QWERTYUIOP",
    "ASDFGHJKL",
    "ZXCVBNM"
  ];

  for (const rowKeys of kbLayout) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'kb-row';
    for (const ch of rowKeys) {
      const b = document.createElement('button');
      b.textContent = ch;
      b.className = 'key';
      b.onclick = () => addLetter(ch.toLowerCase());
      rowDiv.appendChild(b);
    }
    keyboardEl.appendChild(rowDiv);
  }

  // Bottom row with Enter / Backspace
  const controlRow = document.createElement('div');
  controlRow.className = 'kb-row';

  const enter = document.createElement('button');
  enter.textContent = 'Enter';
  enter.className = 'key enter';
  enter.onclick = submitGuess;
  controlRow.appendChild(enter);

  const back = document.createElement('button');
  back.textContent = '←';
  back.className = 'key back';
  back.onclick = backspace;
  controlRow.appendChild(back);

  keyboardEl.appendChild(controlRow);

  function getCell(r, c) {
    return boardEl.children[r].children[c];
  }

  function addLetter(ch) {
    if (col < WIDTH && row < HEIGHT) {
      board[row][col] = ch;
      getCell(row, col).textContent = ch;
      col++;
    }
  }

  function backspace() {
    if (col > 0) {
      col--;
      board[row][col] = '';
      getCell(row, col).textContent = '';
    }
  }

  function showNotice(msg) {
    notice.textContent = msg;
    notice.style.opacity = 1;
    setTimeout(() => (notice.style.opacity = 0), 1500);
  }

  function evaluate(guess, sol) {
    const res = Array(WIDTH).fill('absent');
    const sCount = {};
    for (const c of sol) sCount[c] = (sCount[c] || 0) + 1;

    for (let i = 0; i < WIDTH; i++) {
      if (guess[i] === sol[i]) {
        res[i] = 'correct';
        sCount[guess[i]]--;
      }
    }
    for (let i = 0; i < WIDTH; i++) {
      if (res[i] === 'correct') continue;
      if (sol.includes(guess[i]) && sCount[guess[i]] > 0) {
        res[i] = 'present';
        sCount[guess[i]]--;
      }
    }
    return res;
  }

function showStats(win, attempts) {
  const modal = document.getElementById('stats-modal');

  // Load previous stats
  let played = parseInt(localStorage.getItem('played') || '0');
  let wins = parseInt(localStorage.getItem('wins') || '0');
  let streak = parseInt(localStorage.getItem('streak') || '0');
  let maxStreak = parseInt(localStorage.getItem('maxStreak') || '0');
  let guessDist = JSON.parse(localStorage.getItem('guessDist') || '{}');

  // Update stats
  played += 1;
  if (win) wins += 1;
  streak = win ? streak + 1 : 0;
  maxStreak = Math.max(maxStreak, streak);
  localStorage.setItem('played', played);
  localStorage.setItem('wins', wins);
  localStorage.setItem('streak', streak);
  localStorage.setItem('maxStreak', maxStreak);

  // Update guess distribution
  const key = win ? attempts : 'fail';
  guessDist[key] = (guessDist[key] || 0) + 1;
  localStorage.setItem('guessDist', JSON.stringify(guessDist));

  // Update overview
  document.getElementById('stat-played').textContent = played;
  document.getElementById('stat-winpct').textContent = Math.round((wins / played) * 100);
  document.getElementById('stat-current').textContent = streak;
  document.getElementById('stat-max').textContent = maxStreak;

  // Determine max count for scaling bars
  const counts = Object.values(guessDist);
  const maxCount = Math.max(...counts, 1); // avoid division by zero

  // Update bars
  document.querySelectorAll('.guess-bar').forEach(barEl => {
    const tries = barEl.dataset.tries;
    const count = guessDist[tries] || 0;
    const widthPct = (count / maxCount) * 100;

    const fill = barEl.querySelector('.fill');
    const valueEl = barEl.querySelector('.bar-value');

    fill.style.width = '0%'; // reset for animation
    barEl.classList.remove('current');
    if (tries == key) barEl.classList.add('current');

    valueEl.textContent = count;

    // Animate bar fill
    setTimeout(() => {
      fill.style.transition = 'width 0.5s';
      fill.style.width = widthPct + '%';
    }, 100);
  });

  modal.style.display = 'flex';
}


  function submitGuess() {
    if (col !== WIDTH) return showNotice('Not enough letters');
    const guess = board[row].join('').toLowerCase();
    if (!ALLOWED.has(guess)) return showNotice('Not in list');

    const res = evaluate(guess, solution);
    for (let c = 0; c < WIDTH; c++) {
      const el = getCell(row, c);
      setTimeout(() => {
        el.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
          el.classList.add(res[c]);
          el.style.transform = 'rotateX(0deg)';
        }, 200);
      }, c * 200);
    }

    setTimeout(() => {
      if (res.every(r => r === 'correct')) {
        showNotice('You won!');
        showStats(true, row + 1);
      } else if (++row >= HEIGHT) {
        showNotice('Answer: ' + solution.toUpperCase());
        showStats(false, HEIGHT);
      } else {
        col = 0;
      }
    }, WIDTH * 250 + 400);
  }

  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (/^[a-z0-9]$/.test(key)) addLetter(key);
    else if (key === 'backspace') backspace();
    else if (key === 'enter') submitGuess();
  });
});
