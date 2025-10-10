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
  const todayKey = new Date().toISOString().slice(0,10);
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
    const noticeEl = document.getElementById('notice');
    noticeEl.textContent = msg;
    noticeEl.classList.add('show');

    setTimeout(() => {
      noticeEl.classList.remove('show');
    }, 2000); // hide after 2 seconds
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

  function updateStats(win, attempts) {
    let played = parseInt(localStorage.getItem('played') || '0');
    let wins = parseInt(localStorage.getItem('wins') || '0');
    let streak = parseInt(localStorage.getItem('streak') || '0');
    let maxStreak = parseInt(localStorage.getItem('maxStreak') || '0');
    let guessDist = JSON.parse(localStorage.getItem('guessDist') || '{}');

    played += 1;
    if (win) wins += 1;
    streak = win ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);

    const key = win ? attempts : 'fail';
    guessDist[key] = (guessDist[key] || 0) + 1;

    // Store last game key for highlighting
    localStorage.setItem('lastGameKey', key);

    localStorage.setItem('played', played);
    localStorage.setItem('wins', wins);
    localStorage.setItem('streak', streak);
    localStorage.setItem('maxStreak', maxStreak);
    localStorage.setItem('guessDist', JSON.stringify(guessDist));

    displayStatsModal(key); // highlight last game
  }

  function displayStatsModal(highlightKey = null) {
    const modal = document.getElementById('stats-modal');

    // Display today's answer
    document.getElementById('daily-answer-text').textContent = solution;

    // Load stats
    const played = parseInt(localStorage.getItem('played') || '0');
    const wins = parseInt(localStorage.getItem('wins') || '0');
    const streak = parseInt(localStorage.getItem('streak') || '0');
    const maxStreak = parseInt(localStorage.getItem('maxStreak') || '0');
    const guessDist = JSON.parse(localStorage.getItem('guessDist') || '{}');

    // Use last game key if none provided
    if (!highlightKey) {
      highlightKey = localStorage.getItem('lastGameKey') || null;
    }

    // Update overview
    document.getElementById('stat-played').textContent = played;
    document.getElementById('stat-winpct').textContent = played ? Math.round((wins / played) * 100) : 0;
    document.getElementById('stat-current').textContent = streak;
    document.getElementById('stat-max').textContent = maxStreak;

    // Determine max count for scaling bars
    const counts = Object.values(guessDist);
    const maxCount = Math.max(...counts, 1);

    document.querySelectorAll('.guess-bar').forEach(barEl => {
      const tries = barEl.dataset.tries;
      const count = guessDist[tries] || 0;
      const widthPct = (count / maxCount) * 100;

      const fill = barEl.querySelector('.fill');
      const valueEl = barEl.querySelector('.bar-value');

      fill.style.width = widthPct + '%';
      valueEl.textContent = count;

      // remove previous highlight classes
      barEl.classList.remove('current', 'win', 'fail');

      if (highlightKey && tries == highlightKey) {
        barEl.classList.add('current');
        if (highlightKey === 'fail') {
          barEl.classList.add('fail');
        } else {
          barEl.classList.add('win');
        }
      }
    });

    modal.style.display = 'flex';
  }

  // Close modal
  document.getElementById('close-stats').addEventListener('click', () => {
    document.getElementById('stats-modal').style.display = 'none';
  });

  // Show Stats button
  function showStatsButton() {
    const container = document.getElementById('stats-button-container');
    let btn = document.getElementById('show-stats-btn');

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'show-stats-btn';
      btn.textContent = 'Show Stats';
      btn.onclick = () => displayStatsModal(); // only display modal, do not update stats
      container.appendChild(btn);
    }

    btn.style.display = 'inline-block';
  }

  // Close stats modal when clicking the "Close" button
  document.getElementById('close-stats').addEventListener('click', () => {
    document.getElementById('stats-modal').style.display = 'none';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('stats-modal').style.display = 'none';
    }
  });

  function submitGuess() {
    if (col !== WIDTH) return showNotice('Not enough letters');

    const guess = board[row].join('').toLowerCase();
    if (!ALLOWED.has(guess)) return showNotice('Not in list');

    const res = evaluate(guess, solution);

    // Save guess and result for sharing
    let history = JSON.parse(localStorage.getItem('lastGameHistory') || '[]');
    history.push({ guess, res });
    localStorage.setItem('lastGameHistory', JSON.stringify(history));

    // Flip animation
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
      const won = res.every(r => r === 'correct');
      row += 1; // increment row for next guess

      if (won) {
        showNotice('You won!');
        updateStats(true, row);  // update stats for win
        showStatsButton();       // show persistent stats button
      } else if (row >= HEIGHT) {
        showNotice('Answer: ' + solution.toUpperCase());
        updateStats(false, HEIGHT); // update stats for loss
        showStatsButton();          // show persistent stats button
      } else {
        col = 0; // reset column for next guess
      }
    }, WIDTH * 250 + 400);
  }

  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (/^[a-z0-9]$/.test(key)) addLetter(key);
    else if (key === 'backspace') backspace();
    else if (key === 'enter') submitGuess();
  });

  function shareLastGame() {
    const history = JSON.parse(localStorage.getItem('lastGameHistory') || '[]');
    if (!history.length) return;

    // Build emoji grid
    const emojiMap = {
      correct: '🟩',
      present: '🟨',
      absent: '⬜'
    };

    let grid = history.map(h => h.res.map(r => emojiMap[r] || '⬜').join('')).join('\n');

    // Add attempts summary
    const lastKey = localStorage.getItem('lastGameKey');
    const attempts = lastKey === 'fail' ? 'X' : history.length;
    const text = `syscordle_ng: ${attempts}/6\n${grid}`;

    navigator.clipboard.writeText(text)
      .then(() => showNotice('Copied result to clipboard!'))
      .catch(() => showNotice('Failed to copy result.'));
  }

  // Attach to button
  document.getElementById('share-btn').addEventListener('click', shareLastGame);

  window.addEventListener('load', () => {
    const lastGameDate = localStorage.getItem('dailyDate');
    const lastKey = localStorage.getItem('lastGameKey');
    const history = JSON.parse(localStorage.getItem('lastGameHistory') || '[]');

    if (lastGameDate === todayKey && lastKey && history.length) {
      // Render previous guesses
      history.forEach((h, rowIndex) => {
        h.guess.split('').forEach((letter, colIndex) => {
          const el = getCell(rowIndex, colIndex);
          el.textContent = letter.toUpperCase();
          el.classList.add(h.res[colIndex]);
        });
      });

      // Set row to next empty row (or past last row if finished)
      row = history.length;
      col = 0;

      // Show stats automatically
      displayStatsModal(lastKey);

      // Show persistent "Show Stats" button
      showStatsButton();

      // Mark daily as finished so keyboard can be disabled if needed
      window.dailyFinished = true;
    } else {
      // New game for today
      localStorage.setItem('dailyDate', todayKey);
      localStorage.removeItem('lastGameHistory');
      localStorage.removeItem('lastGameKey');
      window.dailyFinished = false;
    }
  });

  document.getElementById('reset-stats-btn').addEventListener('click', () => {
    if (!confirm('Are you sure you want to reset all stats?')) return;

    // Clear all stored data
    localStorage.removeItem('played');
    localStorage.removeItem('wins');
    localStorage.removeItem('streak');
    localStorage.removeItem('maxStreak');
    localStorage.removeItem('guessDist');
    localStorage.removeItem('lastGameHistory');
    localStorage.removeItem('lastGameKey');
    localStorage.removeItem('dailyDate');

    // Optionally reload page
    location.reload();
  });


});
