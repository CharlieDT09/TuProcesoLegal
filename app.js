// ================================================
// Tu Proceso Legal — Lógica del chatbot
// ================================================

// ── Landing Page ─────────────────────────────────
const landing = document.getElementById('landing');
const appRoot  = document.getElementById('appRoot');

(function initLanding() {
  const FLOAT_ITEMS = [
    '⚖️','🏛️','⭐','📄','📌','🔨','🛡️','📋','👨‍⚖️','📜',
    '⚖️','🏛️','⭐','📄','📌','🔨','🛡️','📋','⚖️','🏛️',
    'PA','PA','PA','PA','PA','PA',
  ];

  const bg = document.getElementById('lpBg');
  FLOAT_ITEMS.forEach(item => {
    const el = document.createElement('div');
    el.className = 'lp-float' + (item === 'PA' ? ' is-text' : '');
    el.textContent = item;
    el.style.left = (Math.random() * 96) + '%';
    el.style.top  = (Math.random() * 96) + '%';
    el.style.setProperty('--dur',   (6 + Math.random() * 8) + 's');
    el.style.setProperty('--delay', (Math.random() * 5) + 's');
    bg.appendChild(el);
  });

  document.getElementById('startChatHero').addEventListener('click', launchChat);
  document.getElementById('startChatInfo').addEventListener('click', launchChat);
})();

function launchChat() {
  landing.classList.add('lp-exit');
  landing.addEventListener('animationend', () => {
    landing.style.display = 'none';
    landing.classList.remove('lp-exit');
  }, { once: true });
  appRoot.classList.add('active');
  restoreHistory();
  updateBudgetIndicator();
  chatInput.focus();
}

function goToLanding() {
  resetChat();
  isLoading = false;
  chatInput.disabled = false;
  typingIndicator.classList.add('hidden');
  appRoot.classList.remove('active');
  landing.style.display = '';
}

// ── Referencias DOM ───────────────────────────────
const messagesEl      = document.getElementById('messages');
const welcomeScreen   = document.getElementById('welcomeScreen');
const typingIndicator = document.getElementById('typingIndicator');
const errorBanner     = document.getElementById('errorBanner');
const chatInput       = document.getElementById('chatInput');
const sendBtn         = document.getElementById('sendBtn');
const clearBtn        = document.getElementById('clearBtn');
const charCounterEl   = document.getElementById('charCounter');
const budgetIndicatorEl = document.getElementById('budgetIndicator');
const suggestions     = document.querySelectorAll('.tpl-sug-btn');

// ── Estado ────────────────────────────────────────
let history = [];
let isLoading = false;
let activeTypewriterTimer = null;

// ── Constantes ────────────────────────────────────
const MAX_INPUT_CHARS     = 1000;
const MAX_TEXTAREA_HEIGHT = 120;
const SCROLL_DELAY_MS     = 50;
const MAX_HISTORY_PAIRS   = 10;
const MONTHLY_BUDGET_USD  = 5.00;
const COST_PER_INPUT_TOKEN  = 3.00  / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15.00 / 1_000_000;

// ── Presupuesto ───────────────────────────────────
function getBudgetData() {
  const now = new Date();
  const key = `tpl_cost_${now.getFullYear()}_${now.getMonth()}`;
  const spent = parseFloat(localStorage.getItem(key) || '0');
  return { spent, key };
}

function hasReachedLimit() {
  return getBudgetData().spent >= MONTHLY_BUDGET_USD;
}

function addUsageCost(inputTokens, outputTokens) {
  const { spent, key } = getBudgetData();
  const cost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);
  localStorage.setItem(key, (spent + cost).toFixed(6));
}

function updateBudgetIndicator() {
  if (!budgetIndicatorEl) return;
  const { spent } = getBudgetData();
  const remaining = Math.max(0, MONTHLY_BUDGET_USD - spent);
  budgetIndicatorEl.textContent = `· Crédito mensual restante: $${remaining.toFixed(2)}`;
}

// ── Persistencia del historial ────────────────────
function saveHistory() {
  localStorage.setItem('tpl_history', JSON.stringify(history));
}

function clearSavedHistory() {
  localStorage.removeItem('tpl_history');
}

function restoreHistory() {
  try {
    const saved = localStorage.getItem('tpl_history');
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    history = parsed.filter(msg =>
      msg && typeof msg.role === 'string' && typeof msg.content === 'string'
    );
    if (history.length === 0) return;
    history.forEach(msg => renderSavedMessage(msg.role, msg.content));
    welcomeScreen.classList.add('hidden');
    clearBtn.classList.remove('hidden');
    scrollToBottom();
  } catch {
    clearSavedHistory();
  }
}

function renderSavedMessage(role, content) {
  const row = document.createElement('div');
  row.className = `tpl-row ${role}`;
  if (role === 'assistant') {
    row.appendChild(createAvatar());
  }
  const bubble = document.createElement('div');
  bubble.className = `tpl-bubble ${role}`;
  if (role === 'assistant') {
    bubble.innerHTML = DOMPurify.sanitize(marked.parse(content));
  } else {
    bubble.textContent = content;
  }
  row.appendChild(bubble);
  messagesEl.appendChild(row);
}

// ── Reset del chat ────────────────────────────────
function resetChat() {
  if (activeTypewriterTimer) { clearInterval(activeTypewriterTimer); activeTypewriterTimer = null; }
  history = [];
  clearSavedHistory();
  messagesEl.innerHTML = '';
  welcomeScreen.classList.remove('hidden');
  clearBtn.classList.add('hidden');
  hideError();
  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatInput.classList.remove('over-limit');
  sendBtn.classList.remove('active');
  updateCharCounter(0);
}

// ── Listeners ─────────────────────────────────────
document.getElementById('backToLanding').addEventListener('click', goToLanding);

clearBtn.addEventListener('click', resetChat);

suggestions.forEach(btn => {
  btn.addEventListener('click', () => sendMessage(btn.textContent.trim()));
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
  const len = chatInput.value.trim().length;
  sendBtn.classList.toggle('active', len > 0 && len <= MAX_INPUT_CHARS);
  chatInput.classList.toggle('over-limit', len > MAX_INPUT_CHARS);
  updateCharCounter(len);
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value.trim());
  }
});

sendBtn.addEventListener('click', () => sendMessage(chatInput.value.trim()));

// ── Enviar mensaje ────────────────────────────────
async function sendMessage(text) {
  if (!text || isLoading) return;

  if (text.length > MAX_INPUT_CHARS) {
    showError(`Tu mensaje supera los ${MAX_INPUT_CHARS} caracteres permitidos.`);
    return;
  }

  if (hasReachedLimit()) {
    showError(`Has alcanzado el presupuesto mensual de $${MONTHLY_BUDGET_USD.toFixed(2)}. Se reinicia automáticamente el próximo mes.`);
    return;
  }

  welcomeScreen.classList.add('hidden');
  clearBtn.classList.remove('hidden');
  hideError();

  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatInput.classList.remove('over-limit');
  sendBtn.classList.remove('active');
  updateCharCounter(0);

  addMessage('user', text);
  const userRow = messagesEl.lastElementChild;
  history.push({ role: 'user', content: text });

  // Limitar historial para no exceder contexto de la API
  if (history.length > MAX_HISTORY_PAIRS * 2) {
    history = history.slice(history.length - MAX_HISTORY_PAIRS * 2);
  }

  setLoading(true);

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    const data = await response.json().catch(() => null);
    if (!data) {
      showError('Respuesta inesperada del servidor. Intenta de nuevo.');
      history.pop();
      userRow.remove();
      return;
    }

    if (!response.ok) {
      showError(data.error || 'Error al procesar tu consulta. Intenta de nuevo.');
      history.pop();
      userRow.remove();
      return;
    }

    const reply = data.reply;
    if (data.usage) {
      addUsageCost(data.usage.input_tokens, data.usage.output_tokens);
      updateBudgetIndicator();
    }
    await addMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });
    saveHistory();

  } catch {
    showError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    history.pop();
    userRow.remove();
  } finally {
    setLoading(false);
    chatInput.focus();
  }
}

// ── Mensajes DOM ──────────────────────────────────
function createAvatar() {
  const avatar = document.createElement('div');
  avatar.className = 'tpl-avatar';
  const img = document.createElement('img');
  img.src = 'logoTuProcesoLegal2.jpeg';
  img.alt = 'Tu Proceso Legal';
  avatar.appendChild(img);
  return avatar;
}

function addMessage(role, content) {
  const row = document.createElement('div');
  row.className = `tpl-row ${role}`;

  if (role === 'assistant') {
    row.appendChild(createAvatar());
  }

  const bubble = document.createElement('div');
  bubble.className = `tpl-bubble ${role}`;

  if (role === 'assistant') {
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    return typeMessage(bubble, content);
  } else {
    bubble.textContent = content;
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    return Promise.resolve();
  }
}

// ── Typewriter ────────────────────────────────────
function typeMessage(bubble, content) {
  const CHARS_PER_TICK = 4;
  const TICK_MS = 18;
  let pos = 0;

  return new Promise(resolve => {
    const finish = () => {
      clearInterval(activeTypewriterTimer);
      activeTypewriterTimer = null;
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(content));
      bubble.style.cursor = '';
      bubble.title = '';
      scrollToBottom();
      resolve();
    };

    bubble.style.cursor = 'pointer';
    bubble.title = 'Clic para mostrar completo';
    bubble.addEventListener('click', finish, { once: true });

    activeTypewriterTimer = setInterval(() => {
      pos = Math.min(pos + CHARS_PER_TICK, content.length);
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(content.slice(0, pos)));

      if (pos % 80 === 0 || pos === content.length) scrollToBottom();

      if (pos >= content.length) finish();
    }, TICK_MS);
  });
}

// ── Loading ───────────────────────────────────────
function setLoading(state) {
  isLoading = state;
  chatInput.disabled = state;
  sendBtn.setAttribute('aria-disabled', state ? 'true' : 'false');
  typingIndicator.classList.toggle('hidden', !state);
  if (state) scrollToBottom();
}

// ── Contadores ────────────────────────────────────
function updateCharCounter(len) {
  if (!charCounterEl) return;
  charCounterEl.textContent = `${len} / ${MAX_INPUT_CHARS}`;
  charCounterEl.classList.toggle('over-limit', len > MAX_INPUT_CHARS);
}

// ── Error ─────────────────────────────────────────
function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
  scrollToBottom();
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';
}

// ── Scroll ────────────────────────────────────────
function scrollToBottom() {
  setTimeout(() => {
    document.getElementById('bottom').scrollIntoView({ behavior: 'smooth' });
  }, SCROLL_DELAY_MS);
}
