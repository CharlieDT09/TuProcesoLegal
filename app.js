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
  sendBtn.classList.toggle('active', chatInput.value.trim().length > 0);
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
      if (data.error === 'limite_alcanzado') {
        showError('Has alcanzado el límite de 10 consultas gratuitas este mes. Actualiza a Plan Pro para continuar.');
      } else {
        showError(data.error || 'Error al procesar tu consulta. Intenta de nuevo.');
      }
      history.pop();
      return;
    }

    const reply = data.reply;
    setLoading(false);
    await addMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });

  } catch (err) {
    console.error(err);
    showError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    history.pop();
    setLoading(false);
  } finally {
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
