/**
 * Операция «38» — главная логика
 */
(function () {
  'use strict';

  const SCREENS = ['intro', 'indy', 'potter', 'pirates', 'chgk', 'final'];
  let currentScreen = 0;
  const answered = { indy: {}, potter: {}, pirates: {}, chgk: {} };
  let crosswordComplete = false;

  // --- DOM ---
  const progressFill = document.getElementById('progress-fill');
  const progressSteps = document.querySelectorAll('.progress-steps li');
  const feedbackModal = document.getElementById('feedback-modal');
  const feedbackIcon = document.getElementById('feedback-icon');
  const feedbackText = document.getElementById('feedback-text');
  const feedbackClose = document.getElementById('feedback-close');

  // --- Init ---
  function init() {
    createParticles();
    renderQuizzes();
    buildCrossword();
    bindEvents();
    updateProgress();
  }

  function bindEvents() {
    document.getElementById('btn-start').addEventListener('click', () => goToScreen(1));
    document.getElementById('btn-replay').addEventListener('click', resetAll);
    feedbackClose.addEventListener('click', hideModal);
    document.getElementById('treasure-chest').addEventListener('click', launchConfetti);
  }

  // --- Particles ---
  function createParticles() {
    const container = document.getElementById('particles');
    const colors = ['#f5c842', '#2ecc71', '#3498db', '#e74c3c', '#fff'];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 6 + 3;
      p.style.cssText = `
        width:${size}px;height:${size}px;
        left:${Math.random() * 100}%;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration:${Math.random() * 15 + 10}s;
        animation-delay:${Math.random() * 10}s;
      `;
      container.appendChild(p);
    }
  }

  // --- Navigation ---
  function goToScreen(index) {
    if (index < 0 || index >= SCREENS.length) return;

    const current = document.querySelector('.screen.active');
    if (current) {
      current.classList.add('screen-exit');
      setTimeout(() => {
        current.classList.remove('active', 'screen-exit');
        showScreen(index);
      }, 400);
    } else {
      showScreen(index);
    }
  }

  function showScreen(index) {
    currentScreen = index;
    document.getElementById(`screen-${SCREENS[index]}`).classList.add('active');
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (SCREENS[index] === 'final') {
      setTimeout(launchConfetti, 800);
    }
  }

  function updateProgress() {
    const pct = (currentScreen / (SCREENS.length - 1)) * 100;
    progressFill.style.width = `${pct}%`;
    progressSteps.forEach((li, i) => {
      li.classList.toggle('active', i === currentScreen);
      li.classList.toggle('done', i < currentScreen);
    });
  }

  function tryAdvanceScreen(section) {
    const questions = QUIZ_DATA[section];
    const allAnswered = questions.every((q) => answered[section][q.id]);

    if (section === 'potter' && !crosswordComplete) return;
    if (!allAnswered) return;

    const nextMap = { indy: 2, potter: 3, pirates: 4, chgk: 5 };
    const next = nextMap[section];
    if (next !== undefined) {
      setTimeout(() => {
        showFeedback('🎉', 'Уровень пройден! Следующее приключение...', () => goToScreen(next));
      }, 600);
    }
  }

  // --- Quiz rendering ---
  function renderQuizzes() {
    renderQuizSection('indy', 'quiz-indy');
    renderQuizSection('potter', 'quiz-potter');
    renderQuizSection('pirates', 'quiz-pirates');
    renderQuizSection('chgk', 'quiz-chgk');
  }

  function renderQuizSection(section, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    QUIZ_DATA[section].forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'quiz-card';
      card.id = `card-${q.id}`;
      card.style.animationDelay = `${idx * 0.1}s`;

      let html = '';
      html += `<p class="quiz-question">${q.question}</p>`;
      if (q.hint) html += `<p class="quiz-hint">💡 ${q.hint}</p>`;

      if (q.type === 'choice') {
        html += '<div class="quiz-options">';
        q.options.forEach((opt) => {
          html += `<button class="quiz-option" data-value="${escapeAttr(opt)}">${opt}</button>`;
        });
        html += '</div>';
      } else {
        html += `
          <div class="quiz-input-wrap">
            <input class="quiz-input" type="text" placeholder="Твой ответ..." autocomplete="off" />
            <button class="btn btn-gold btn-small submit-input">Проверить</button>
          </div>`;
      }

      html += `<div class="fun-fact" id="fact-${q.id}">😄 ${q.funFact}</div>`;
      card.innerHTML = html;
      container.appendChild(card);

      if (q.type === 'choice') {
        card.querySelectorAll('.quiz-option').forEach((btn) => {
          btn.addEventListener('click', () => handleChoice(section, q, btn, card));
        });
      } else {
        const input = card.querySelector('.quiz-input');
        const submit = card.querySelector('.submit-input');
        const check = () => handleInput(section, q, input, card);
        submit.addEventListener('click', check);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      }
    });
  }

  function handleChoice(section, q, btn, card) {
    if (answered[section][q.id]) return;

    const value = btn.dataset.value;
    const correct = normalize(value) === normalize(q.answer);

    card.querySelectorAll('.quiz-option').forEach((b) => {
      b.disabled = true;
      if (normalize(b.dataset.value) === normalize(q.answer)) b.classList.add('correct');
    });

    if (correct) {
      btn.classList.add('correct');
      card.classList.add('answered-correct');
      onCorrect(section, q, card);
    } else {
      btn.classList.add('wrong');
      card.classList.add('answered-wrong');
      onWrong(q, card);
    }
  }

  function handleInput(section, q, input, card) {
    if (answered[section][q.id]) return;

    const value = input.value.trim();
    if (!value) return;

    const accepted = (q.accept || [q.answer]).map(normalize);
    const correct = accepted.includes(normalize(value));

    input.disabled = true;
    card.querySelector('.submit-input').disabled = true;

    if (correct) {
      card.classList.add('answered-correct');
      onCorrect(section, q, card);
    } else {
      card.classList.add('answered-wrong');
      onWrong(q, card);
    }
  }

  function onCorrect(section, q, card) {
    answered[section][q.id] = true;
    document.getElementById(`fact-${q.id}`).classList.add('show');
    showFeedback('✅', 'Верно! ' + (q.funFact || ''), null, 1500);
    tryAdvanceScreen(section);
  }

  function onWrong(q, card) {
    showFeedback('❌', `Мимо! Подумай ещё... Подсказка: ${q.hint || 'ответ проще, чем кажется'}`, () => {
      card.classList.remove('answered-wrong');
      card.querySelectorAll('.quiz-option').forEach((b) => {
        b.disabled = false;
        b.classList.remove('wrong', 'correct');
      });
      const input = card.querySelector('.quiz-input');
      if (input) {
        input.disabled = false;
        input.value = '';
        card.querySelector('.submit-input').disabled = false;
      }
    });
  }

  // --- Crossword ---
  function buildCrossword() {
    const { rows, cols } = CROSSWORD.size;
    const grid = document.getElementById('crossword-grid');
    const cluesEl = document.getElementById('crossword-clues');

    // Build cell map
    const cells = Array.from({ length: rows }, () => Array(cols).fill(null));

    CROSSWORD.words.forEach((w, wi) => {
      for (let i = 0; i < w.word.length; i++) {
        const r = w.dir === 'across' ? w.row : w.row + i;
        const c = w.dir === 'across' ? w.col + i : w.col;
        if (!cells[r][c]) cells[r][c] = { letter: w.word[i], words: [] };
        cells[r][c].words.push({ id: w.id, index: i, letter: w.word[i] });
        if (i === 0) cells[r][c].num = wi + 1;
      }
    });

    grid.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        if (!cells[r][c]) {
          cell.className = 'crossword-cell block';
        } else {
          cell.className = 'crossword-cell';
          cell.dataset.row = r;
          cell.dataset.col = c;
          const info = cells[r][c];
          if (info.num) {
            const num = document.createElement('span');
            num.className = 'cell-num';
            num.textContent = info.num;
            cell.appendChild(num);
          }
          const input = document.createElement('input');
          input.maxLength = 1;
          input.dataset.expected = info.letter;
          input.dataset.words = JSON.stringify(info.words);
          input.addEventListener('input', onCrosswordInput);
          cell.appendChild(input);
        }
        grid.appendChild(cell);
      }
    }

    cluesEl.innerHTML = '<h4>📜 Подсказки</h4><ol>' +
      CROSSWORD.words.map((w) => `<li>${w.clue}</li>`).join('') +
      '</ol>';
  }

  function onCrosswordInput(e) {
    const input = e.target;
    input.value = input.value.toUpperCase().replace(/[^А-ЯA-ZЁ]/g, '');

    if (normalize(input.value) === normalize(input.dataset.expected)) {
      input.parentElement.classList.add('correct');
    } else {
      input.parentElement.classList.remove('correct');
    }

    checkCrosswordComplete();
  }

  function checkCrosswordComplete() {
    const inputs = document.querySelectorAll('#crossword-grid input');
    const allCorrect = [...inputs].every(
      (inp) => normalize(inp.value) === normalize(inp.dataset.expected)
    );

    if (allCorrect && !crosswordComplete) {
      crosswordComplete = true;
      const msg = document.createElement('p');
      msg.className = 'crossword-done-msg';
      msg.textContent = '🎉 Кроссворд решён! Мадам Пинс не заметила — беги дальше!';
      document.querySelector('.crossword-wrap').appendChild(msg);
      tryAdvanceScreen('potter');
    }
  }

  // --- Modal ---
  let modalCallback = null;

  function showFeedback(icon, text, callback, autoClose) {
    feedbackIcon.textContent = icon;
    feedbackText.textContent = text;
    modalCallback = callback;
    feedbackModal.classList.add('show');
    feedbackModal.setAttribute('aria-hidden', 'false');

    if (autoClose) {
      setTimeout(hideModal, autoClose);
    }
  }

  function hideModal() {
    feedbackModal.classList.remove('show');
    feedbackModal.setAttribute('aria-hidden', 'true');
    if (modalCallback) {
      const cb = modalCallback;
      modalCallback = null;
      cb();
    }
  }

  // --- Confetti ---
  function launchConfetti() {
    const container = document.getElementById('confetti-canvas');
    const colors = ['#f5c842', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#fff'];
    for (let i = 0; i < 120; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.cssText = `
        left:${Math.random() * 100}%;
        top:-5%;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration:${Math.random() * 2 + 2}s;
        animation-delay:${Math.random() * 0.5}s;
        border-radius:${Math.random() > 0.5 ? '50%' : '0'};
        width:${Math.random() * 8 + 6}px;
        height:${Math.random() * 8 + 6}px;
      `;
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

  // --- Reset ---
  function resetAll() {
    Object.keys(answered).forEach((k) => { answered[k] = {}; });
    crosswordComplete = false;
    document.querySelector('.crossword-done-msg')?.remove();
    document.querySelectorAll('#crossword-grid input').forEach((inp) => {
      inp.value = '';
      inp.parentElement.classList.remove('correct');
    });
    goToScreen(0);
    renderQuizzes();
  }

  // --- Utils ---
  function normalize(str) {
    return str.toLowerCase().trim()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ');
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;');
  }

  init();
})();
