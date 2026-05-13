// ================================================
// Tu Proceso Legal — Lógica del chatbot
// ================================================

// ── Landing Page ─────────────────────────────────
const landing = document.getElementById('landing');
const appRoot = document.getElementById('appRoot');

(function initLanding() {
  const FLOAT_ITEMS = [
    '⚖️','🏛️','⭐','📄','📌','🔨','🛡️','📋','👨‍⚖️','📜',
    '⚖️','🏛️','⭐','📄','📌','🔨','🛡️','📋','⚖️','🏛️',
    'PA','PA','PA','PA','PA','PA',
  ];

  const bg = document.getElementById('lpBg');
  FLOAT_ITEMS.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'lp-float' + (item === 'PA' ? ' is-text' : '');
    el.textContent = item;
    el.style.left   = (Math.random() * 96) + '%';
    el.style.top    = (Math.random() * 96) + '%';
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
  appRoot.style.display = '';
}

function goToLanding() {
  history = [];
  messagesEl.innerHTML = '';
  welcomeScreen.classList.remove('hidden');
  clearBtn.classList.add('hidden');
  hideError();
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.classList.remove('active');
  isLoading = false;
  chatInput.disabled = false;
  typingIndicator.classList.add('hidden');

  appRoot.style.display = 'none';
  landing.style.display = '';
}

const chatMain        = document.getElementById('chatMain');
const messagesEl      = document.getElementById('messages');
const welcomeScreen   = document.getElementById('welcomeScreen');
const typingIndicator = document.getElementById('typingIndicator');
const errorBanner     = document.getElementById('errorBanner');
const chatInput       = document.getElementById('chatInput');
const sendBtn         = document.getElementById('sendBtn');
const clearBtn        = document.getElementById('clearBtn');
const suggestions     = document.querySelectorAll('.tpl-sug-btn');

// Historial de mensajes para enviar al backend
let history = [];
let isLoading = false;

// ── Límite mensual basado en costo real de la API ─
const MAX_INPUT_CHARS    = 1000;
const MONTHLY_BUDGET_USD = 5.00;
const COST_PER_INPUT_TOKEN  = 3.00  / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15.00 / 1_000_000;

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

// ── Botón regresar ────────────────────────────────
document.getElementById('backToLanding').addEventListener('click', goToLanding);

// ── Sugerencias ──────────────────────────────────
suggestions.forEach(btn => {
  btn.addEventListener('click', () => sendMessage(btn.textContent.trim()));
});

// ── Input ────────────────────────────────────────
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  const len = chatInput.value.trim().length;
  sendBtn.classList.toggle('active', len > 0 && len <= MAX_INPUT_CHARS);
  chatInput.classList.toggle('over-limit', len > MAX_INPUT_CHARS);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value.trim());
  }
});

sendBtn.addEventListener('click', () => sendMessage(chatInput.value.trim()));

// ── Limpiar chat ──────────────────────────────────
clearBtn.addEventListener('click', () => {
  history = [];
  messagesEl.innerHTML = '';
  welcomeScreen.classList.remove('hidden');
  clearBtn.classList.add('hidden');
  hideError();
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.classList.remove('active');
});

// ── Enviar mensaje ────────────────────────────────
async function sendMessage(text) {
  if (!text || isLoading) return;

  if (text.length > MAX_INPUT_CHARS) {
    showError(`Tu mensaje supera los ${MAX_INPUT_CHARS} caracteres permitidos.`);
    return;
  }

  if (hasReachedLimit()) {
    showError('Has alcanzado el límite de 10 consultas gratuitas este mes. El contador se reinicia el próximo mes.');
    return;
  }

  welcomeScreen.classList.add('hidden');
  clearBtn.classList.remove('hidden');
  hideError();

  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.classList.remove('active');

  addMessage('user', text);
  history.push({ role: 'user', content: text });

  setLoading(true);

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Error al procesar tu consulta. Intenta de nuevo.');
      history.pop();
      return;
    }

    const reply = data.reply;
    if (data.usage) addUsageCost(data.usage.input_tokens, data.usage.output_tokens);
    await addMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });

  } catch (err) {
    showError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    history.pop();
  } finally {
    setLoading(false);
    chatInput.disabled = false;
    chatInput.focus();
  }
}

// ── Agregar mensaje al DOM ────────────────────────
function addMessage(role, content) {
  const row = document.createElement('div');
  row.className = `tpl-row ${role}`;

  if (role === 'assistant') {
    const avatar = document.createElement('div');
    avatar.className = 'tpl-avatar';
    avatar.textContent = '⚖️';
    row.appendChild(avatar);
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

// ── Efecto typewriter para respuestas de la IA ────
function typeMessage(bubble, content) {
  const CHARS_PER_TICK = 4;
  const TICK_MS = 18;
  let pos = 0;

  return new Promise(resolve => {
    const timer = setInterval(() => {
      pos = Math.min(pos + CHARS_PER_TICK, content.length);
      const partial = content.slice(0, pos);
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(partial));

      if (pos % 80 === 0 || pos === content.length) {
        scrollToBottom();
      }

      if (pos >= content.length) {
        clearInterval(timer);
        resolve();
      }
    }, TICK_MS);
  });
}

// ── Loading ───────────────────────────────────────
function setLoading(state) {
  isLoading = state;
  chatInput.disabled = state;
  typingIndicator.classList.toggle('hidden', !state);
  if (state) scrollToBottom();
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
  }, 50);
}
