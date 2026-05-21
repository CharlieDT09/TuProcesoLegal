// ================================================
// Tu Proceso Legal — Lógica del chatbot
// ================================================

// ── Supabase ──────────────────────────────────────
const SUPABASE_URL = 'https://ufnkedficjjvbgsfazka.supabase.co';
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

  document.getElementById('startChatHero').addEventListener('click', onStartChatClick);
  document.getElementById('startChatInfo').addEventListener('click', onStartChatClick);

  // Botón 👤 en el nav de la landing
  document.getElementById('lpAuthBtn').addEventListener('click', () => openAuthModal('login'));

  // Logo del nav de la landing → scroll al tope
  const lpNavBrand = document.getElementById('lpNavBrand');
  lpNavBrand.addEventListener('click', () => landing.scrollTo({ top: 0, behavior: 'smooth' }));
  lpNavBrand.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') lpNavBrand.click(); });
})();

// Cuando el usuario pulsa "Iniciar consulta": si no está logueado mostrar el modal
// con la opción "Continuar sin cuenta". Si ya está logueado, ir directo al chat.
function onStartChatClick() {
  if (currentUser) {
    doLaunchChat();
  } else {
    openAuthModal('login', { showSkip: true });
  }
}

function doLaunchChat() {
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

// Logo del chat header → volver a landing
(function initBrandClick() {
  const tplBrand = document.getElementById('tplBrand');
  tplBrand.addEventListener('click', goToLanding);
  tplBrand.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') goToLanding(); });
})();

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
const googleAuthBtn   = document.getElementById('googleAuthBtn');
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
const authSkipRow     = document.getElementById('authSkipRow');
const authSkipBtn     = document.getElementById('authSkipBtn');
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

  // Si el usuario regresa de un redirect de OAuth, lanzar el chat automáticamente
  const { data: { session } } = await sb.auth.getSession();
  const afterLogin = sessionStorage.getItem('tpl_after_login');

  if (session?.user) {
    currentUser = session.user;
    updateAuthUI();
    if (afterLogin === 'launch_chat') {
      sessionStorage.removeItem('tpl_after_login');
      doLaunchChat();
    }
  }

  sb.auth.onAuthStateChange((_event, session) => {
    if (_event === 'PASSWORD_RECOVERY') {
      // Usuario llegó desde el link de recuperación → mostrar form de nueva contraseña
      openResetPasswordPanel(session?.user?.email || '');
      return;
    }
    currentUser = session?.user || null;
    updateAuthUI();
  });
}

function updateAuthUI() {
  if (currentUser) {
    authBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    const rawName = currentUser.user_metadata?.full_name
      || currentUser.user_metadata?.name
      || currentUser.email?.split('@')[0]
      || 'Usuario';
    userNameEl.textContent = rawName.split(' ')[0];
    userAvatarEl.textContent = rawName.charAt(0).toUpperCase();
  } else {
    authBtn.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

// ── Modal helpers ─────────────────────────────────
function openAuthModal(tab = 'login', { showSkip = false } = {}) {
  authOverlay.classList.remove('hidden');
  clearAuthMessages();
  authSkipRow.classList.toggle('hidden', !showSkip);
  if (tab === 'register') switchToRegister();
  else switchToLogin();
  setTimeout(() => (tab === 'register' ? regName : loginEmail).focus(), 60);
}

function closeAuthModal() {
  authOverlay.classList.add('hidden');
  clearAuthMessages();
  authSkipRow.classList.add('hidden');
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

// ── Google OAuth ──────────────────────────────────
async function handleGoogleLogin() {
  const sb = getSupabase();
  if (!sb) return;

  googleAuthBtn.disabled = true;
  googleAuthBtn.textContent = 'Conectando con Google…';

  // Guardamos la intención para redirigir al chat después del OAuth
  sessionStorage.setItem('tpl_after_login', 'launch_chat');

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/',
    },
  });

  if (error) {
    googleAuthBtn.disabled = false;
    googleAuthBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg> Continuar con Google`;
    sessionStorage.removeItem('tpl_after_login');
    showAuthMessage(loginMessage, 'Error al conectar con Google. Intenta de nuevo.');
  }
  // Si no hay error, el navegador redirige → no necesitamos hacer nada más aquí
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

  const wasSkippable = !authSkipRow.classList.contains('hidden');
  closeAuthModal();
  loginEmail.value = '';
  loginPassword.value = '';

  if (wasSkippable) doLaunchChat();
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
  fetch('/api/welcome-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  }).catch(() => {});

  if (!data.session) {
    showAuthMessage(
      registerMessage,
      `¡Cuenta creada! Revisa tu bandeja en ${email} para confirmar tu cuenta.`,
      'success'
    );
    registerSubmit.textContent = '✓ Revisa tu correo';
    regName.value = '';
    regEmail.value = '';
    regPassword.value = '';
    regConfirm.value = '';
    return;
  }

  const wasSkippable = !authSkipRow.classList.contains('hidden');
  closeAuthModal();
  if (wasSkippable) doLaunchChat();
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

// ── Panel de nueva contraseña (recovery) ─────────
const panelReset     = document.getElementById('panelReset');
const resetPassword  = document.getElementById('resetPassword');
const resetConfirm   = document.getElementById('resetConfirm');
const resetMessage   = document.getElementById('resetMessage');
const resetSubmit    = document.getElementById('resetSubmit');
const resetEmailLbl  = document.getElementById('resetEmailLabel');

function openResetPasswordPanel(email) {
  // Ocultar tabs y otros paneles, mostrar solo el panel de reset
  authOverlay.classList.remove('hidden');
  document.getElementById('tabLogin').closest('.auth-tabs').classList.add('hidden');
  document.getElementById('googleAuthBtn').classList.add('hidden');
  panelLogin.classList.add('hidden');
  panelRegister.classList.add('hidden');
  panelReset.classList.remove('hidden');
  document.getElementById('authSkipRow').classList.add('hidden');
  if (resetEmailLbl) resetEmailLbl.textContent = email;
}

async function handleSetNewPassword() {
  const pwd     = resetPassword.value;
  const confirm = resetConfirm.value;

  if (!pwd || pwd.length < 8) {
    showAuthMessage(resetMessage, 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (pwd !== confirm) {
    showAuthMessage(resetMessage, 'Las contraseñas no coinciden.');
    return;
  }

  resetSubmit.disabled = true;
  resetSubmit.textContent = 'Guardando…';

  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ password: pwd });

  if (error) {
    showAuthMessage(resetMessage, 'Error al actualizar la contraseña. Intenta de nuevo.');
    resetSubmit.disabled = false;
    resetSubmit.textContent = 'Guardar nueva contraseña';
  } else {
    showAuthMessage(resetMessage, '✓ Contraseña actualizada correctamente.', 'success');
    resetSubmit.textContent = '✓ Listo';
    // Restaurar UI del modal y cerrar tras 2 segundos
    setTimeout(() => {
      document.getElementById('tabLogin').closest('.auth-tabs').classList.remove('hidden');
      document.getElementById('googleAuthBtn').classList.remove('hidden');
      panelReset.classList.add('hidden');
      closeAuthModal();
    }, 2000);
  }
}

resetSubmit.addEventListener('click', handleSetNewPassword);
resetPassword.addEventListener('keydown', e => { if (e.key === 'Enter') resetConfirm.focus(); });
resetConfirm.addEventListener('keydown',  e => { if (e.key === 'Enter') handleSetNewPassword(); });

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
  userDropdown.classList.contains('hidden') ? openUserDropdown() : closeUserDropdown();
}

function openUserDropdown() {
  userDropdown.classList.remove('hidden');
  userBtn.setAttribute('aria-expanded', 'true');
}

function closeUserDropdown() {
  userDropdown.classList.add('hidden');
  userBtn.setAttribute('aria-expanded', 'false');
}

// ── Listeners de auth ─────────────────────────────
authBtn.addEventListener('click', () => openAuthModal('login'));
authClose.addEventListener('click', closeAuthModal);
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) closeAuthModal(); });

tabLogin.addEventListener('click', switchToLogin);
tabRegister.addEventListener('click', switchToRegister);

googleAuthBtn.addEventListener('click', handleGoogleLogin);

loginSubmit.addEventListener('click', handleLogin);
loginEmail.addEventListener('keydown',   e => { if (e.key === 'Enter') loginPassword.focus(); });
loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
forgotBtn.addEventListener('click', handleForgotPassword);

registerSubmit.addEventListener('click', handleRegister);
regName.addEventListener('keydown',     e => { if (e.key === 'Enter') regEmail.focus(); });
regEmail.addEventListener('keydown',    e => { if (e.key === 'Enter') regPassword.focus(); });
regPassword.addEventListener('keydown', e => { if (e.key === 'Enter') regConfirm.focus(); });
regConfirm.addEventListener('keydown',  e => { if (e.key === 'Enter') handleRegister(); });

// "Continuar sin cuenta"
authSkipBtn.addEventListener('click', () => {
  closeAuthModal();
  doLaunchChat();
});

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

// ── Init al cargar ────────────────────────────────
initAuth();

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

async function saveMessagePair(userText, assistantText, usage = {}) {
  const sb = getSupabase();
  if (!sb || !currentUser || !currentConversationId) return;
  await sb.from('messages').insert([
    {
      conversation_id: currentConversationId,
      role:            'user',
      content:         userText,
      input_tokens:    usage.input_tokens  || 0,
      output_tokens:   0,
    },
    {
      conversation_id: currentConversationId,
      role:            'assistant',
      content:         assistantText,
      input_tokens:    0,
      output_tokens:   usage.output_tokens || 0,
    },
  ]);
  sb.from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', currentConversationId);
}

// Save an anonymous session ID for quiz analytics.
function getSessionId() {
  let id = sessionStorage.getItem('tpl_session');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    sessionStorage.setItem('tpl_session', id);
  }
  return id;
}

// Save quiz result to Supabase (called from quiz.js via window.saveQuizResult).
async function saveQuizResult(branch1, branch2, branch3, scores) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('quiz_results').insert({
    user_id:    currentUser?.id  || null,
    session_id: currentUser      ? null : getSessionId(),
    branch_1:   branch1,
    branch_2:   branch2 || null,
    branch_3:   branch3 || null,
    scores:     scores,
  });
}

// Log a query to analytics (best-effort, non-blocking).
function logAnalytics(queryText, usage = {}) {
  const sb = getSupabase();
  if (!sb) return;
  sb.from('query_analytics').insert({
    user_id:       currentUser?.id || null,
    session_id:    currentUser     ? null : getSessionId(),
    query_summary: queryText.slice(0, 200),
    input_tokens:  usage.input_tokens  || 0,
    output_tokens: usage.output_tokens || 0,
  }).then(() => {}).catch(() => {});
}

// Expose helpers to quiz.js (loaded after app.js, same page context).
window.saveQuizResult = saveQuizResult;
window.getSupabase    = getSupabase;

// ── Helpers de formato ────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  return date.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });
}

// ══ PRESUPUESTO ═══════════════════════════════════
function getBudgetData() {
  const now = new Date();
  const key = `tpl_cost_${now.getFullYear()}_${now.getMonth()}`;
  return { spent: parseFloat(localStorage.getItem(key) || '0'), key };
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
  if (currentUser) return;
  localStorage.setItem('tpl_history', JSON.stringify(history));
}

function clearSavedHistory() {
  localStorage.removeItem('tpl_history');
}

function restoreHistory() {
  if (currentUser) return;
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
  bubble[role === 'assistant' ? 'innerHTML' : 'textContent'] =
    role === 'assistant' ? DOMPurify.sanitize(marked.parse(content)) : content;
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

// ── Listeners del chat ────────────────────────────
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
    const response = await fetch('/api/chat', {
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

    logAnalytics(text, data.usage || {});

    if (currentUser) {
      if (!currentConversationId) {
        currentConversationId = await createConversation(text);
      }
      await saveMessagePair(text, reply, data.usage || {});
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

// ══ JuriTools Sidebar ════════════════════════════
(function initJuriTools() {
  const trigger   = document.getElementById('jtTrigger');
  const btn       = document.getElementById('jtBtn');
  const newBadge  = document.getElementById('jtNewBadge');
  const overlay   = document.getElementById('jtOverlay');
  const closeBtn  = document.getElementById('jtClose');
  const backdrop  = document.getElementById('jtBackdrop');
  const quizCard  = document.getElementById('jtQuizCard');

  if (!trigger || !overlay) return;

  // Mostrar/ocultar el botón según si el chat está activo
  const observer = new MutationObserver(() => {
    const chatActive = appRoot.classList.contains('active');
    trigger.style.display = chatActive ? 'flex' : 'none';
    if (!chatActive) closeJT();
  });
  observer.observe(appRoot, { attributes: true, attributeFilter: ['class'] });

  // Ocultar badge si ya fue visto antes
  if (localStorage.getItem('jt_badge_seen')) {
    newBadge.style.display = 'none';
  }

  function openJT() {
    overlay.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    // Ocultar badge para siempre tras primer click
    if (newBadge.style.display !== 'none') {
      newBadge.style.display = 'none';
      localStorage.setItem('jt_badge_seen', '1');
    }
  }

  function closeJT() {
    overlay.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', openJT);
  newBadge.addEventListener('click', openJT);
  closeBtn.addEventListener('click', closeJT);
  backdrop.addEventListener('click', closeJT);

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeJT();
  });

  // "Descubre tu Rama" → abrir el quiz modal
  quizCard.addEventListener('click', () => {
    closeJT();
    const quizBtn = document.getElementById('quizStartBtn');
    if (quizBtn) quizBtn.click();
  });
  quizCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      quizCard.click();
    }
  });
}());


// ════════════════════════════════════════════════════════════════
// BIBLIOTECA JURÍDICA — JuriTool
// ════════════════════════════════════════════════════════════════
(function BibliotecaJuridica() {
  const overlay     = document.getElementById('bibOverlay');
  const closeBtn    = document.getElementById('bibClose');
  const searchInput = document.getElementById('bibSearchInput');
  const searchClear = document.getElementById('bibSearchClear');
  const filtersEl   = document.getElementById('bibFilters');
  const emptyEl     = document.getElementById('bibEmpty');
  const loadingEl   = document.getElementById('bibLoading');
  const noResultsEl = document.getElementById('bibNoResults');
  const resultsEl   = document.getElementById('bibResults');
  const bibCard     = document.getElementById('jtBibliotecaCard');

  if (!overlay || !bibCard) return;

  let activeCode    = 'Todos';
  let searchTimer   = null;
  let lastQuery     = '';
  let browseOffset  = 0;
  let browseHasMore = false;
  let browseCodigo  = '';

  // ── Abrir / Cerrar ────────────────────────────
  function openBib() {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput.focus(), 100);
  }

  function closeBib() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  bibCard.addEventListener('click', () => {
    // Cerrar el sidebar de JuriTools primero
    const jtOverlay = document.getElementById('jtOverlay');
    if (jtOverlay) jtOverlay.classList.add('hidden');
    openBib();
  });
  bibCard.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bibCard.click(); }
  });

  closeBtn.addEventListener('click', closeBib);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBib(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeBib();
  });

  // ── Filtros ───────────────────────────────────
  filtersEl.addEventListener('click', e => {
    const chip = e.target.closest('.bib-chip');
    if (!chip) return;
    filtersEl.querySelectorAll('.bib-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCode = chip.dataset.code;

    if (lastQuery.trim().length >= 2) {
      // Hay búsqueda activa → re-buscar con filtro
      triggerSearch(lastQuery);
    } else if (activeCode !== 'Todos') {
      // Sin búsqueda → modo browse: mostrar artículos del código
      triggerBrowse(activeCode);
    } else {
      // "Todos" sin búsqueda → volver a estado vacío
      showState('empty');
    }
  });

  // ── Input de búsqueda ─────────────────────────
  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    searchClear.classList.toggle('hidden', q.length === 0);
    clearTimeout(searchTimer);
    if (q.trim().length < 2) {
      // Si hay un código activo, mostrar browse
      if (activeCode !== 'Todos') {
        triggerBrowse(activeCode);
      } else {
        showState('empty');
      }
      return;
    }
    showState('loading');
    searchTimer = setTimeout(() => triggerSearch(q), 420);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    lastQuery = '';
    searchClear.classList.add('hidden');
    if (activeCode !== 'Todos') {
      triggerBrowse(activeCode);
    } else {
      showState('empty');
    }
    searchInput.focus();
  });

  // ── Browse por código (sin query) ─────────────
  async function triggerBrowse(codigo, appendMode = false) {
    if (!appendMode) {
      browseOffset  = 0;
      browseHasMore = false;
      browseCodigo  = codigo;
      showState('loading');
    } else {
      // Deshabilitar botón "Cargar más" mientras carga
      const loadMoreBtn = document.getElementById('bibLoadMore');
      if (loadMoreBtn) loadMoreBtn.disabled = true;
    }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:          'browse',
          match_count:   20,
          codigo_filter: codigo,
          offset:        browseOffset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');

      const articles   = data.articles || [];
      browseHasMore    = data.hasMore || false;
      browseOffset     = data.nextOffset || (browseOffset + articles.length);

      if (articles.length === 0 && !appendMode) {
        showState('no-results');
      } else {
        if (!appendMode) {
          renderResults(articles, data.totalCount);
        } else {
          appendResults(articles);
        }
        updateLoadMoreBtn();
        showState('results');
      }
    } catch (err) {
      console.error('[Biblioteca browse]', err);
      if (!appendMode) showState('no-results');
    }
  }

  // ── Búsqueda semántica ────────────────────────
  async function triggerSearch(query) {
    lastQuery = query;
    showState('loading');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:         'search',
          query:        query.trim(),
          match_count:  12,
          codigo_filter: activeCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de búsqueda');

      const articles = data.articles || [];
      if (articles.length === 0) {
        showState('no-results');
      } else {
        renderResults(articles);
        showState('results');
      }
    } catch (err) {
      console.error('[Biblioteca]', err);
      showState('no-results');
    }
  }

  // ── Render de artículos ───────────────────────
  const PREVIEW_CHARS = 280;

  function renderResults(articles, totalCount) {
    resultsEl.innerHTML = '';
    // Mostrar contador si hay totalCount
    if (totalCount > 0) {
      const counter = document.createElement('p');
      counter.className = 'bib-results-count';
      counter.textContent = `${totalCount} artículos en este código`;
      resultsEl.appendChild(counter);
    }
    articles.forEach(art => resultsEl.appendChild(buildCard(art)));
  }

  function buildCard(art) {
    const full    = (art.content || '').trim();
    const preview = full.length > PREVIEW_CHARS ? full.slice(0, PREVIEW_CHARS) + '…' : full;
    const hasMore = full.length > PREVIEW_CHARS;
    const card    = document.createElement('div');
    card.className = 'bib-card';
    const similarity  = art.similarity != null ? `<span class="bib-similarity">${(art.similarity * 100).toFixed(0)}% relevancia</span>` : '';
    const section     = art.section    ? `<span class="bib-section">${escapeHtml(art.section)}</span>` : '';
    const articleNum  = art.article_num ? `<span class="bib-article-num">${escapeHtml(art.article_num)}</span>` : '';
    card.innerHTML = `
      <div class="bib-card-meta">
        <span class="bib-badge">${escapeHtml(art.codigo_name || '')}</span>
        ${articleNum}${section}${similarity}
      </div>
      <p class="bib-card-content" data-full="${escapeAttr(full)}" data-preview="${escapeAttr(preview)}">${escapeHtml(preview)}</p>
      ${hasMore ? '<button class="bib-toggle-btn" aria-label="Ver artículo completo">Ver artículo completo ↓</button>' : ''}
    `;
    if (hasMore) {
      const btn = card.querySelector('.bib-toggle-btn');
      const content = card.querySelector('.bib-card-content');
      let expanded = false;
      btn.addEventListener('click', () => {
        expanded = !expanded;
        content.textContent = expanded ? content.dataset.full : content.dataset.preview + '…';
        content.classList.toggle('expanded', expanded);
        btn.textContent = expanded ? 'Mostrar menos ↑' : 'Ver artículo completo ↓';
      });
    }
    return card;
  }

  function appendResults(articles) {
    // Eliminar botón anterior si existe
    const oldBtn = document.getElementById('bibLoadMore');
    if (oldBtn) oldBtn.remove();
    articles.forEach(art => resultsEl.appendChild(buildCard(art)));
  }

  function updateLoadMoreBtn() {
    const existing = document.getElementById('bibLoadMore');
    if (existing) existing.remove();
    if (!browseHasMore) return;
    const btn = document.createElement('button');
    btn.id        = 'bibLoadMore';
    btn.className = 'bib-load-more';
    btn.textContent = 'Cargar más artículos ↓';
    btn.addEventListener('click', () => triggerBrowse(browseCodigo, true));
    resultsEl.appendChild(btn);
  }

  // ── Estados de UI ─────────────────────────────
  function showState(state) {
    emptyEl.classList.add('hidden');
    loadingEl.classList.add('hidden');
    noResultsEl.classList.add('hidden');
    resultsEl.classList.add('hidden');
    if (state === 'empty')      emptyEl.classList.remove('hidden');
    if (state === 'loading')    loadingEl.classList.remove('hidden');
    if (state === 'no-results') noResultsEl.classList.remove('hidden');
    if (state === 'results')    resultsEl.classList.remove('hidden');
  }

  // ── Helpers ───────────────────────────────────
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
  }
  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }
}());
