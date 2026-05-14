// ================================================
// Tu Proceso Legal — Lógica del chatbot
// ================================================

// ── Supabase ──────────────────────────────────────
const SUPABASE_URL = 'https://ufnkedficjjvbgsfazka.supabase.co';
// Clave pública (anon/publishable) — segura para exponer en el navegador.
// RLS en Supabase protege los datos en el servidor.
const SUPABASE_KEY = 'sb_publishable_0hGkSJYwZlcV-2O-SGUvlA_Wvv3XBoE';

let _supabase = null;
function getSupabase() {
  if (!_supabase && window.supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

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
  if (!currentUser) restoreHistory();
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
const messagesEl        = document.getElementById('messages');
const welcomeScreen     = document.getElementById('welcomeScreen');
const typingIndicator   = document.getElementById('typingIndicator');
const errorBanner       = document.getElementById('errorBanner');
const chatInput         = document.getElementById('chatInput');
const sendBtn           = document.getElementById('sendBtn');
const clearBtn          = document.getElementById('clearBtn');
const charCounterEl     = document.getElementById('charCounter');
const budgetIndicatorEl = document.getElementById('budgetIndicator');
const suggestions       = document.querySelectorAll('.tpl-sug-btn');

// Auth DOM refs
const authBtn         = document.getElementById('authBtn');
const authOverlay     = document.getElementById('authOverlay');
const authClose       = document.getElementById('authClose');
const tabLogin        = document.getElementById('tabLogin');
const tabRegister     = document.getElementById('tabRegister');
const panelLogin      = document.getElementById('panelLogin');
const panelRegister   = document.getElementById('panelRegister');
const loginEmail      = document.getElementById('loginEmail');
const loginPassword   = document.getElementById('loginPassword');
const loginMessage    = document.getElementById('loginMessage');
const loginSubmit     = document.getElementById('loginSubmit');
const forgotBtn       = document.getElementById('forgotBtn');
const regName         = document.getElementById('regName');
const regEmail        = document.getElementById('regEmail');
const regPassword     = document.getElementById('regPassword');
const regConfirm      = document.getElementById('regConfirm');
const registerMessage = document.getElementById('registerMessage');
const registerSubmit  = document.getElementById('registerSubmit');
const userMenu        = document.getElementById('userMenu');
const userBtn         = document.getElementById('userBtn');
const userDropdown    = document.getElementById('userDropdown');
const userNameEl      = document.getElementById('userName');
const userAvatarEl    = document.getElementById('userAvatar');
const myChatsBtn      = document.getElementById('myChatsBtn');
const signOutBtn      = document.getElementById('signOutBtn');

// History drawer DOM refs
const historyOverlay  = document.getElementById('historyOverlay');
const historyClose    = document.getElementById('historyClose');
const historyBackdrop = document.getElementById('historyBackdrop');
const historyList     = document.getElementById('historyList');
const historyNewChat  = document.getElementById('historyNewChat');

// ── Estado ────────────────────────────────────────
let history = [];
let isLoading = false;
let activeTypewriterTimer = null;
let currentUser = null;
let currentConversationId = null;

// ── Constantes ────────────────────────────────────
const MAX_INPUT_CHARS     = 1000;
const MAX_TEXTAREA_HEIGHT = 120;
const SCROLL_DELAY_MS     = 50;
const MAX_HISTORY_PAIRS   = 10;
const MONTHLY_BUDGET_USD  = 5.00;
const COST_PER_INPUT_TOKEN  = 3.00  / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15.00 / 1_000_000;

// ══ AUTENTICACIÓN ════════════════════════════════

async function initAuth() {
  const sb = getSupabase();
  if (!sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    updateAuthUI();
  }

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
  });
}

function updateAuthUI() {
  if (currentUser) {
    authBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    const rawName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuario';
    userNameEl.textContent = rawName.split(' ')[0];
    userAvatarEl.textContent = rawName.charAt(0).toUpperCase();
  } else {
    authBtn.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

// ── Modal helpers ─────────────────────────────────
function openAuthModal(tab = 'login') {
  authOverlay.classList.remove('hidden');
  clearAuthMessages();
  if (tab === 'register') switchToRegister();
  else switchToLogin();
  setTimeout(() => {
    (tab === 'register' ? regName : loginEmail).focus();
  }, 60);
}

function closeAuthModal() {
  authOverlay.classList.add('hidden');
  clearAuthMessages();
}

function switchToLogin() {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  tabLogin.setAttribute('aria-selected', 'true');
  tabRegister.setAttribute('aria-selected', 'false');
  panelLogin.classList.remove('hidden');
  panelRegister.classList.add('hidden');
}

function switchToRegister() {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  tabRegister.setAttribute('aria-selected', 'true');
  tabLogin.setAttribute('aria-selected', 'false');
  panelRegister.classList.remove('hidden');
  panelLogin.classList.add('hidden');
}

function clearAuthMessages() {
  [loginMessage, registerMessage].forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
    delete el.dataset.type;
  });
}

function showAuthMessage(el, text, type = 'error') {
  el.textContent = text;
  el.dataset.type = type;
  el.classList.remove('hidden');
}

// ── Login ─────────────────────────────────────────
async function handleLogin() {
  clearAuthMessages();
  const email    = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showAuthMessage(loginMessage, 'Por favor completa todos los campos.');
    return;
  }

  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Entrando…';

  const sb = getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  loginSubmit.disabled = false;
  loginSubmit.textContent = 'Entrar';

  if (error) {
    const msg = error.message.includes('Invalid login credentials')
      ? 'Correo o contraseña incorrectos.'
      : error.message;
    showAuthMessage(loginMessage, msg);
    return;
  }

  closeAuthModal();
  loginEmail.value = '';
  loginPassword.value = '';
}

// ── Registro ──────────────────────────────────────
async function handleRegister() {
  clearAuthMessages();
  const name     = regName.value.trim();
  const email    = regEmail.value.trim();
  const password = regPassword.value;
  const confirm  = regConfirm.value;

  if (!name || !email || !password || !confirm) {
    showAuthMessage(registerMessage, 'Por favor completa todos los campos.');
    return;
  }
  if (password.length < 8) {
    showAuthMessage(registerMessage, 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (password !== confirm) {
    showAuthMessage(registerMessage, 'Las contraseñas no coinciden.');
    return;
  }

  registerSubmit.disabled = true;
  registerSubmit.textContent = 'Creando cuenta…';

  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  registerSubmit.disabled = false;
  registerSubmit.textContent = 'Crear cuenta';

  if (error) {
    showAuthMessage(registerMessage, error.message);
    return;
  }

  // Enviar email de bienvenida (no bloqueante)
  fetch('/.netlify/functions/welcome-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  }).catch(() => {});

  // Si Supabase requiere confirmación por email
  if (!data.session) {
    showAuthMessage(
      registerMessage,
      `¡Cuenta creada! Revisa tu bandeja de entrada en ${email} para confirmar tu cuenta.`,
      'success'
    );
    registerSubmit.textContent = '✓ Revisa tu correo';
    regName.value = '';
    regEmail.value = '';
    regPassword.value = '';
    regConfirm.value = '';
    return;
  }

  closeAuthModal();
}

// ── Recuperar contraseña ──────────────────────────
async function handleForgotPassword() {
  clearAuthMessages();
  const email = loginEmail.value.trim();
  if (!email) {
    showAuthMessage(loginMessage, 'Ingresa tu correo electrónico primero.');
    return;
  }

  const sb = getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/',
  });

  if (error) {
    showAuthMessage(loginMessage, 'Error al enviar el correo. Intenta de nuevo.');
  } else {
    showAuthMessage(loginMessage, 'Te enviamos un correo para restablecer tu contraseña.', 'info');
  }
}

// ── Cerrar sesión ─────────────────────────────────
async function handleSignOut() {
  closeUserDropdown();
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  resetChat();
  clearSavedHistory();
}

// ── Dropdown de usuario ───────────────────────────
function toggleUserDropdown() {
  const isOpen = !userDropdown.classList.contains('hidden');
  if (isOpen) closeUserDropdown();
  else openUserDropdown();
}

function openUserDropdown() {
  userDropdown.classList.remove('hidden');
  userBtn.setAttribute('aria-expanded', 'true');
}

function closeUserDropdown() {
  userDropdown.classList.add('hidden');
  userBtn.setAttribute('aria-expanded', 'false');
}

// ══ HISTORIAL DE CONVERSACIONES ═══════════════════

async function openHistoryDrawer() {
  closeUserDropdown();
  historyOverlay.classList.remove('hidden');
  historyList.innerHTML = '<p class="history-loading">Cargando consultas…</p>';

  const conversations = await loadConversations();

  if (!conversations.length) {
    historyList.innerHTML = '<p class="history-empty">No tienes consultas guardadas aún.<br>¡Envía tu primera pregunta!</p>';
    return;
  }

  historyList.innerHTML = '';
  conversations.forEach(conv => {
    const item = document.createElement('button');
    item.className = 'history-item' + (conv.id === currentConversationId ? ' active' : '');
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <span class="history-item-title">${escapeHtml(conv.title)}</span>
      <span class="history-item-date">${formatRelativeDate(conv.updated_at)}</span>
    `;
    item.addEventListener('click', () => openConversation(conv.id));
    historyList.appendChild(item);
  });
}

function closeHistoryDrawer() {
  historyOverlay.classList.add('hidden');
}

async function openConversation(conversationId) {
  closeHistoryDrawer();

  if (activeTypewriterTimer) { clearInterval(activeTypewriterTimer); activeTypewriterTimer = null; }
  messagesEl.innerHTML = '';
  history = [];
  currentConversationId = conversationId;
  welcomeScreen.classList.add('hidden');
  clearBtn.classList.remove('hidden');
  hideError();

  const msgs = await loadConversationMessages(conversationId);
  if (!msgs.length) {
    welcomeScreen.classList.remove('hidden');
    clearBtn.classList.add('hidden');
    currentConversationId = null;
    return;
  }

  history = msgs;
  msgs.forEach(msg => renderSavedMessage(msg.role, msg.content));
  scrollToBottom();
}

// ── Supabase queries ──────────────────────────────
async function loadConversations() {
  const sb = getSupabase();
  if (!sb || !currentUser) return [];

  const { data } = await sb
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  return data || [];
}

async function loadConversationMessages(conversationId) {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return data || [];
}

async function createConversation(firstUserMessage) {
  const sb = getSupabase();
  if (!sb || !currentUser) return null;

  const title = firstUserMessage.length > 60
    ? firstUserMessage.slice(0, 60) + '…'
    : firstUserMessage;

  const { data, error } = await sb
    .from('conversations')
    .insert({ user_id: currentUser.id, title })
    .select('id')
    .single();

  return error ? null : data.id;
}

async function saveMessagePair(userText, assistantText) {
  const sb = getSupabase();
  if (!sb || !currentUser || !currentConversationId) return;

  await sb.from('messages').insert([
    { conversation_id: currentConversationId, role: 'user',      content: userText },
    { conversation_id: currentConversationId, role: 'assistant', content: assistantText },
  ]);

  // Actualizar timestamp de la conversación
  sb.from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', currentConversationId);
}

// ── Helpers de formato ────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  return date.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });
}

// ── Listeners de auth ─────────────────────────────
authBtn.addEventListener('click', () => openAuthModal('login'));
authClose.addEventListener('click', closeAuthModal);
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) closeAuthModal(); });

tabLogin.addEventListener('click', switchToLogin);
tabRegister.addEventListener('click', switchToRegister);

loginSubmit.addEventListener('click', handleLogin);
loginEmail.addEventListener('keydown', e => { if (e.key === 'Enter') loginPassword.focus(); });
loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
forgotBtn.addEventListener('click', handleForgotPassword);

registerSubmit.addEventListener('click', handleRegister);
regName.addEventListener('keydown',     e => { if (e.key === 'Enter') regEmail.focus(); });
regEmail.addEventListener('keydown',    e => { if (e.key === 'Enter') regPassword.focus(); });
regPassword.addEventListener('keydown', e => { if (e.key === 'Enter') regConfirm.focus(); });
regConfirm.addEventListener('keydown',  e => { if (e.key === 'Enter') handleRegister(); });

userBtn.addEventListener('click', toggleUserDropdown);
document.addEventListener('click', e => {
  if (userMenu && !userMenu.contains(e.target)) closeUserDropdown();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAuthModal();
    closeHistoryDrawer();
    closeUserDropdown();
  }
});

myChatsBtn.addEventListener('click', openHistoryDrawer);
signOutBtn.addEventListener('click', handleSignOut);
historyClose.addEventListener('click', closeHistoryDrawer);
historyBackdrop.addEventListener('click', closeHistoryDrawer);
historyNewChat.addEventListener('click', () => {
  closeHistoryDrawer();
  resetChat();
});

// ── Init Supabase al cargar ───────────────────────
initAuth();

// ══ PRESUPUESTO ═══════════════════════════════════
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

// ══ PERSISTENCIA LOCAL (modo anónimo) ═════════════
function saveHistory() {
  if (currentUser) return; // Usuarios autenticados usan Supabase
  localStorage.setItem('tpl_history', JSON.stringify(history));
}

function clearSavedHistory() {
  localStorage.removeItem('tpl_history');
}

function restoreHistory() {
  if (currentUser) return; // Historial viene de Supabase
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
  if (role === 'assistant') row.appendChild(createAvatar());
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
  currentConversationId = null;
  if (!currentUser) clearSavedHistory();
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

    if (currentUser) {
      // Crear conversación en Supabase si es el primer mensaje
      if (!currentConversationId) {
        currentConversationId = await createConversation(text);
      }
      await saveMessagePair(text, reply);
    } else {
      saveHistory();
    }

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

  if (role === 'assistant') row.appendChild(createAvatar());

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
