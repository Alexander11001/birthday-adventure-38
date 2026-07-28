/**
 * Операция «38» — главная логика
 */
(function () {
  'use strict';

  const SCREENS = ['intro', 'indy', 'potter', 'pirates', 'chgk', 'final'];
  const SECTION_ORDER = ['indy', 'potter', 'pirates', 'chgk'];
  const SCREEN_TO_SECTION = { 1: 'indy', 2: 'potter', 3: 'pirates', 4: 'chgk' };
  const STORAGE_KEY = 'operation38-state-v2';
  const DEBUG_ENABLED = new URLSearchParams(window.location.search).get('debug') === '1'
    || localStorage.getItem('operation38-debug') === 'true';

  let currentScreen = 0;
  let modalCallback = null;
  let levelCompletedShown = {};
  let state = createDefaultState();

  const progressFill = document.getElementById('progress-fill');
  const progressSteps = document.querySelectorAll('.progress-steps li');
  const feedbackModal = document.getElementById('feedback-modal');
  const feedbackIcon = document.getElementById('feedback-icon');
  const feedbackText = document.getElementById('feedback-text');
  const feedbackClose = document.getElementById('feedback-close');

  function createDefaultState() {
    const answered = {};
    SECTION_ORDER.forEach((section) => {
      answered[section] = {};
      QUIZ_DATA[section].forEach((q) => {
        answered[section][q.id] = {
          completed: false,
          solved: false,
          revealed: false,
          attempts: 0,
          hintLevel: 0,
          shownAnswer: '',
          lastWrong: '',
        };
      });
    });

    return {
      currentScreen: 0,
      answered,
      crosswordComplete: false,
      crosswordValues: {},
    };
  }

  function init() {
    hydrateBirthdayText();
    loadState();
    createParticles();
    validateCrossword();
    buildCrossword();
    bindEvents();
    renderQuizzes();
    renderDebugPanel();
    showScreen(state.currentScreen || 0, true);
  }

  function hydrateBirthdayText() {
    const ageDisplay = document.getElementById('age-display');
    if (ageDisplay) ageDisplay.textContent = String(BIRTHDAY_PERSON.age);
  }

  function bindEvents() {
    document.getElementById('btn-start').addEventListener('click', () => goToScreen(1));
    document.getElementById('btn-replay').addEventListener('click', resetAll);
    feedbackClose.addEventListener('click', hideModal);
    document.getElementById('treasure-chest').addEventListener('click', launchConfetti);
  }

  function createParticles() {
    const container = document.getElementById('particles');
    if (!container || container.childElementCount) return;
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

  function validateCrossword() {
    const cells = {};
    CROSSWORD.words.forEach((word) => {
      for (let i = 0; i < word.word.length; i++) {
        const row = word.dir === 'across' ? word.row : word.row + i;
        const col = word.dir === 'across' ? word.col + i : word.col;
        const key = `${row}:${col}`;
        const letter = word.word[i];
        if (row >= CROSSWORD.size.rows || col >= CROSSWORD.size.cols) {
          throw new Error(`Crossword word ${word.id} is out of bounds`);
        }
        if (cells[key] && cells[key] !== letter) {
          throw new Error(`Crossword conflict at ${key}`);
        }
        cells[key] = letter;
      }
    });
  }

  function goToScreen(index) {
    if (index < 0 || index >= SCREENS.length) return;

    const current = document.querySelector('.screen.active');
    if (current) {
      current.classList.add('screen-exit');
      setTimeout(() => {
        current.classList.remove('active', 'screen-exit');
        showScreen(index);
      }, 250);
    } else {
      showScreen(index);
    }
  }

  function showScreen(index, immediate) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    currentScreen = index;
    state.currentScreen = index;
    saveState();

    const screen = document.getElementById(`screen-${SCREENS[index]}`);
    screen.classList.add('active');
    updateProgress();
    window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
    focusScreen(screen);

    if (SCREENS[index] === 'final') {
      setTimeout(launchConfetti, 500);
    }
  }

  function focusScreen(screen) {
    const target = screen.querySelector('h1, h2, input, button');
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }

  function totalTasks() {
    return SECTION_ORDER.reduce((sum, section) => sum + QUIZ_DATA[section].length, 0) + 1;
  }

  function completedTasks() {
    const questionCount = SECTION_ORDER.reduce((sum, section) => {
      return sum + QUIZ_DATA[section].filter((q) => state.answered[section][q.id].completed).length;
    }, 0);
    return questionCount + (state.crosswordComplete ? 1 : 0);
  }

  function updateProgress() {
    const pct = (completedTasks() / totalTasks()) * 100;
    progressFill.style.width = `${pct}%`;
    progressSteps.forEach((li, i) => {
      li.classList.toggle('active', i === currentScreen);
      li.classList.toggle('done', i < currentScreen);
    });
  }

  function renderQuizzes() {
    renderQuizSection('indy', 'quiz-indy');
    renderQuizSection('potter', 'quiz-potter');
    renderQuizSection('pirates', 'quiz-pirates');
    renderQuizSection('chgk', 'quiz-chgk');
  }

  function renderQuizSection(section, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    QUIZ_DATA[section].forEach((q) => {
      const qState = state.answered[section][q.id];
      const card = document.createElement('div');
      card.className = `quiz-card${qState.completed ? (qState.solved ? ' answered-correct' : ' answered-revealed') : ''}`;
      card.id = `card-${q.id}`;

      let html = '';
      if (q.bossLabel) html += `<span class="boss-label">${q.bossLabel}</span>`;
      html += `<p class="quiz-question">${q.question.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`;

      if (q.type === 'choice') {
        html += '<div class="quiz-options">';
        q.options.forEach((opt) => {
          const disabled = qState.completed ? ' disabled' : '';
          const correctClass = qState.completed && isAnswerMatch(opt, q.answer, q.accept) ? ' correct' : '';
          html += `<button class="quiz-option${correctClass}" type="button" data-value="${escapeAttr(opt)}"${disabled}>${opt}</button>`;
        });
        html += '</div>';
      } else {
        const disabled = qState.completed ? ' disabled' : '';
        const value = qState.completed && qState.shownAnswer ? escapeAttr(qState.shownAnswer) : '';
        html += `
          <div class="quiz-input-wrap">
            <input class="quiz-input" type="text" placeholder="Твой ответ..." autocomplete="off" value="${value}"${disabled} />
            <button class="btn btn-gold btn-small submit-input" type="button"${disabled}>Проверить</button>
          </div>`;
      }

      html += `
        <div class="quiz-status" id="status-${q.id}"></div>
        <div class="quiz-hints" id="hints-${q.id}"></div>
        <div class="quiz-actions" id="actions-${q.id}"></div>
        <div class="fun-fact${qState.completed ? ' show' : ''}" id="fact-${q.id}">
          ${qState.solved ? '🏆' : qState.revealed ? '🗺️' : '😄'} ${q.explanation}
        </div>
      `;

      card.innerHTML = html;
      container.appendChild(card);

      if (!qState.completed) {
        if (q.type === 'choice') {
          card.querySelectorAll('.quiz-option').forEach((btn) => {
            btn.addEventListener('click', () => handleChoice(section, q, btn, card));
          });
        } else {
          const input = card.querySelector('.quiz-input');
          const submit = card.querySelector('.submit-input');
          const check = () => handleInput(section, q, input, card);
          submit.addEventListener('click', check);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') check();
          });
        }
      }

      renderQuestionMeta(section, q, card);
    });
  }

  function renderQuestionMeta(section, q, card) {
    const qState = state.answered[section][q.id];
    const status = card.querySelector(`#status-${q.id}`);
    const hints = card.querySelector(`#hints-${q.id}`);
    const actions = card.querySelector(`#actions-${q.id}`);

    status.textContent = qState.lastWrong || '';
    status.className = `quiz-status${qState.lastWrong ? ' visible' : ''}`;

    hints.innerHTML = '';
    for (let i = 0; i < qState.hintLevel; i++) {
      const hint = document.createElement('p');
      hint.className = 'quiz-hint visible';
      hint.innerHTML = `💡 ${q.hints[i]}`;
      hints.appendChild(hint);
    }

    actions.innerHTML = '';
    if (qState.completed) return;

    if (qState.attempts >= 1 && qState.hintLevel === 0 && q.hints?.[0]) {
      const hintBtn = document.createElement('button');
      hintBtn.className = 'btn btn-ghost btn-small';
      hintBtn.type = 'button';
      hintBtn.textContent = 'Дать намек';
      hintBtn.addEventListener('click', () => {
        qState.hintLevel = 1;
        saveState();
        renderQuizSection(section, `quiz-${section}`);
      });
      actions.appendChild(hintBtn);
    }

    if (qState.attempts >= 3) {
      const revealBtn = document.createElement('button');
      revealBtn.className = 'btn btn-ghost btn-small';
      revealBtn.type = 'button';
      revealBtn.textContent = 'Показать ответ и идти дальше';
      revealBtn.addEventListener('click', () => revealAnswer(section, q));
      actions.appendChild(revealBtn);
    }
  }

  function handleChoice(section, q, btn, card) {
    const qState = state.answered[section][q.id];
    if (qState.completed) return;

    if (isAnswerMatch(btn.dataset.value, q.answer, q.accept)) {
      completeQuestion(section, q, true, q.answer);
      return;
    }

    registerWrongAttempt(section, q, card, btn.dataset.value);
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 500);
  }

  function handleInput(section, q, input) {
    const qState = state.answered[section][q.id];
    if (qState.completed) return;

    const value = input.value.trim();
    if (!value) return;

    if (isAnswerMatch(value, q.answer, q.accept)) {
      completeQuestion(section, q, true, value);
      return;
    }

    registerWrongAttempt(section, q, document.getElementById(`card-${q.id}`), value);
  }

  function registerWrongAttempt(section, q, card, value) {
    const qState = state.answered[section][q.id];
    qState.attempts += 1;
    qState.lastWrong = wrongMessage(section, qState.attempts);

    if (qState.attempts >= 2 && q.hints?.[1]) {
      qState.hintLevel = 2;
    }

    saveState();
    card.classList.remove('answered-wrong');
    void card.offsetWidth;
    card.classList.add('answered-wrong');
    renderQuizSection(section, `quiz-${section}`);
  }

  function wrongMessage(section, attempts) {
    const messages = {
      indy: ['Не оно. Карта подозрительно молчит.', 'Мимо. Даже пьяный компас показывает точнее.', 'Храм закатил глаза, но еще терпит.'],
      potter: ['Палочка дернулась, но заклинание не сработало.', 'Сова посмотрела осуждающе.', 'Хогвартс пока не аплодирует.'],
      pirates: ['Капитан записал ответ в журнал позора. Пока карандашом.', 'Мимо. Ром не считается логикой.', 'Команда начала тихо ржать.'],
      chgk: ['Черный ящик молчит с достоинством.', 'Почти красиво, но нет.', 'Знатоки бы тоже спорили, но все же нет.'],
    };
    return messages[section][Math.min(attempts - 1, messages[section].length - 1)];
  }

  function revealAnswer(section, q) {
    completeQuestion(section, q, false, q.answer);
  }

  function completeQuestion(section, q, solved, shownAnswer) {
    const qState = state.answered[section][q.id];
    qState.completed = true;
    qState.solved = solved;
    qState.revealed = !solved;
    qState.lastWrong = '';
    qState.shownAnswer = shownAnswer;
    saveState();
    renderQuizSection(section, `quiz-${section}`);
    updateProgress();
    tryAdvanceScreen(section);
  }

  function isSectionComplete(section) {
    const questionsDone = QUIZ_DATA[section].every((q) => state.answered[section][q.id].completed);
    return section === 'potter' ? questionsDone && state.crosswordComplete : questionsDone;
  }

  function tryAdvanceScreen(section) {
    if (!isSectionComplete(section)) return;
    if (levelCompletedShown[section]) return;
    levelCompletedShown[section] = true;

    const nextMap = { indy: 2, potter: 3, pirates: 4, chgk: 5 };
    const next = nextMap[section];
    if (next !== undefined) {
      setTimeout(() => {
        showFeedback('🎉', 'Артефакт найден. Спина пока тоже на месте.', () => goToScreen(next));
      }, 350);
    }
  }

  function buildCrossword() {
    const { rows, cols } = CROSSWORD.size;
    const grid = document.getElementById('crossword-grid');
    const cluesEl = document.getElementById('crossword-clues');
    grid.innerHTML = '';

    const cells = Array.from({ length: rows }, () => Array(cols).fill(null));
    CROSSWORD.words.forEach((w, wi) => {
      for (let i = 0; i < w.word.length; i++) {
        const r = w.dir === 'across' ? w.row : w.row + i;
        const c = w.dir === 'across' ? w.col + i : w.col;
        if (!cells[r][c]) cells[r][c] = { letter: w.word[i], num: null };
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
          const key = `${r}:${c}`;
          cell.className = 'crossword-cell';
          if (cells[r][c].num) {
            const num = document.createElement('span');
            num.className = 'cell-num';
            num.textContent = cells[r][c].num;
            cell.appendChild(num);
          }
          const input = document.createElement('input');
          input.maxLength = 1;
          input.dataset.key = key;
          input.dataset.expected = cells[r][c].letter;
          input.value = state.crosswordValues[key] || '';
          input.disabled = state.crosswordComplete;
          if (normalize(input.value) === normalize(input.dataset.expected)) {
            cell.classList.add('correct');
          }
          input.addEventListener('input', onCrosswordInput);
          cell.appendChild(input);
        }
        grid.appendChild(cell);
      }
    }

    cluesEl.innerHTML = '<h4>📜 Подсказки</h4><ol>' +
      CROSSWORD.words.map((w) => `<li>${w.clue}</li>`).join('') +
      '</ol>';

    if (state.crosswordComplete && !document.querySelector('.crossword-done-msg')) {
      const msg = document.createElement('p');
      msg.className = 'crossword-done-msg';
      msg.textContent = '🎉 Кроссворд собран. Библиотекарь ничего не заметил.';
      document.querySelector('.crossword-wrap').appendChild(msg);
    }
  }

  function onCrosswordInput(e) {
    const input = e.target;
    input.value = input.value.toUpperCase().replace(/[^А-ЯA-ZЁ]/g, '');
    state.crosswordValues[input.dataset.key] = input.value;
    if (normalize(input.value) === normalize(input.dataset.expected)) {
      input.parentElement.classList.add('correct');
    } else {
      input.parentElement.classList.remove('correct');
    }
    saveState();
    checkCrosswordComplete();
  }

  function checkCrosswordComplete() {
    const inputs = document.querySelectorAll('#crossword-grid input');
    const allCorrect = [...inputs].every((inp) => normalize(inp.value) === normalize(inp.dataset.expected));
    if (allCorrect && !state.crosswordComplete) {
      state.crosswordComplete = true;
      saveState();
      buildCrossword();
      updateProgress();
      tryAdvanceScreen('potter');
    }
  }

  function renderDebugPanel() {
    if (!DEBUG_ENABLED) return;
    const panel = document.createElement('aside');
    panel.className = 'debug-panel';
    panel.innerHTML = `
      <strong>Debug</strong>
      <button class="btn btn-debug btn-small" type="button" data-action="skip-question">Пропустить вопрос</button>
      <button class="btn btn-debug btn-small" type="button" data-action="skip-screen">Завершить экран</button>
      <button class="btn btn-debug btn-small" type="button" data-action="reset">Сбросить прогресс</button>
      <select class="debug-select" data-action="goto">
        <option value="0">Вступление</option>
        <option value="1">Храм</option>
        <option value="2">Хогвартс</option>
        <option value="3">Карибы</option>
        <option value="4">Черный ящик</option>
        <option value="5">Финал</option>
      </select>
    `;
    document.body.appendChild(panel);

    panel.querySelector('[data-action="skip-question"]').addEventListener('click', debugSkipQuestion);
    panel.querySelector('[data-action="skip-screen"]').addEventListener('click', debugSkipSection);
    panel.querySelector('[data-action="reset"]').addEventListener('click', resetAll);
    panel.querySelector('[data-action="goto"]').addEventListener('change', (e) => goToScreen(Number(e.target.value)));
  }

  function debugSkipQuestion() {
    const section = SCREEN_TO_SECTION[currentScreen];
    if (!section) return;
    const nextQuestion = QUIZ_DATA[section].find((q) => !state.answered[section][q.id].completed);
    if (nextQuestion) {
      revealAnswer(section, nextQuestion);
      return;
    }
    if (section === 'potter' && !state.crosswordComplete) {
      state.crosswordComplete = true;
      saveState();
      buildCrossword();
      updateProgress();
      tryAdvanceScreen('potter');
    }
  }

  function debugSkipSection() {
    const section = SCREEN_TO_SECTION[currentScreen];
    if (!section) return;
    QUIZ_DATA[section].forEach((q) => {
      if (!state.answered[section][q.id].completed) {
        completeQuestion(section, q, false, q.answer);
      }
    });
    if (section === 'potter' && !state.crosswordComplete) {
      state.crosswordComplete = true;
      saveState();
      buildCrossword();
      updateProgress();
    }
    tryAdvanceScreen(section);
  }

  function showFeedback(icon, text, callback) {
    feedbackIcon.textContent = icon;
    feedbackText.textContent = text;
    modalCallback = callback;
    feedbackModal.classList.add('show');
    feedbackModal.setAttribute('aria-hidden', 'false');
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

  function resetAll() {
    state = createDefaultState();
    levelCompletedShown = {};
    localStorage.removeItem(STORAGE_KEY);
    buildCrossword();
    renderQuizzes();
    showScreen(0, true);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state = {
        ...createDefaultState(),
        ...parsed,
        answered: {
          ...createDefaultState().answered,
          ...(parsed.answered || {}),
        },
      };
    } catch (err) {
      state = createDefaultState();
    }
  }

  function normalize(str) {
    return String(str)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[«»"'`.,!?;:()[\]{}]/g, ' ')
      .replace(/[–—-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isAnswerMatch(value, answer, accept) {
    const normalizedValue = normalize(value);
    const candidates = [...new Set([answer, ...(accept || [])].map(normalize))];
    return candidates.some((candidate) => {
      if (normalizedValue === candidate) return true;
      if (candidate.length >= 6 && normalizedValue.length === candidate.length) {
        return levenshtein(normalizedValue, candidate) === 1;
      }
      const parts = candidate.split(' ');
      if (parts.length > 1 && parts.includes(normalizedValue)) return true;
      return false;
    });
  }

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  init();
})();
