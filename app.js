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
  // Restaurar historial:
  //  - Usuario anónimo → desde localStorage
  //  - Usuario logueado sin conversación activa → auto-cargar la última de Supabase
  if (!currentUser && history.length === 0) {
    restoreHistory();
  } else if (currentUser && history.length === 0 && !currentConversationId) {
    loadLastConversation();
  }
  updateRateLimitUI();
  chatInput.focus();
}

async function loadLastConversation() {
  const sb = getSupabase();
  if (!sb || !currentUser) return;
  try {
    const { data } = await sb
      .from('conversations')
      .select('id')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      await openConversation(data[0].id);
    }
  } catch (err) {
    console.warn('[loadLastConversation]', err.message);
  }
}

function goToLanding() {
  // Solo ocultar el chat — NO borrar la conversación ni el historial
  // El usuario puede volver y continuar donde lo dejó
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
const RATE_LIMIT_ANON     = 3;   // mensajes por ventana para usuarios sin cuenta
const RATE_LIMIT_AUTH     = 5;   // mensajes por ventana para usuarios registrados

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

  const { data: { subscription: authSubscription } } = sb.auth.onAuthStateChange((_event, session) => {
    if (_event === 'PASSWORD_RECOVERY') {
      // Usuario llegó desde el link de recuperación → mostrar form de nueva contraseña
      openResetPasswordPanel(session?.user?.email || '');
      return;
    }
    currentUser = session?.user || null;
    updateAuthUI();
    // Al cambiar sesión, resetear estado de rate limit (el servidor dará el nuevo estado)
    resetRateLimitState();
  });
  // authSubscription.unsubscribe() si en algún momento se necesita limpiar el listener
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
  // Restaurar UI por si veníamos del panel de reset (PASSWORD_RECOVERY)
  const tabsEl = document.querySelector('.auth-tabs');
  if (tabsEl) tabsEl.classList.remove('hidden');
  if (panelReset) panelReset.classList.add('hidden');
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

  const wasSkippable = !authSkipRow.classList.contains('hidden');
  closeAuthModal();
  loginEmail.value = '';
  loginPassword.value = '';

  // Si había una conversación anónima en localStorage, migrarla a Supabase.
  // Esperamos un tick para que onAuthStateChange asigne currentUser.
  setTimeout(async () => {
    const migratedId = await migrateAnonymousHistory();
    if (migratedId) currentConversationId = migratedId;
  }, 200);

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
  }).catch(err => console.warn('[welcome-email]', err.message));

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

  // Migrar historial anónimo si lo había
  setTimeout(async () => {
    const migratedId = await migrateAnonymousHistory();
    if (migratedId) currentConversationId = migratedId;
  }, 200);

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
    const item = document.createElement('div');
    item.className = 'history-item' + (conv.id === currentConversationId ? ' active' : '');
    item.setAttribute('role', 'listitem');
    item.dataset.convId = conv.id;
    item.innerHTML = `
      <button class="history-item-body" aria-label="Abrir conversación">
        <span class="history-item-title">${escapeHtml(conv.title)}</span>
        <span class="history-item-date">${formatRelativeDate(conv.updated_at)}</span>
      </button>
      <button class="history-item-delete" aria-label="Eliminar conversación" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    `;
    item.querySelector('.history-item-body').addEventListener('click', () => openConversation(conv.id));
    item.querySelector('.history-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(conv.id, item);
    });
    historyList.appendChild(item);
  });
}

async function deleteConversation(convId, itemEl) {
  const sb = getSupabase();
  if (!sb || !currentUser) return;

  // Feedback visual inmediato
  itemEl.classList.add('history-item-deleting');

  // Borrar mensajes y conversación en Supabase
  await sb.from('messages').delete().eq('conversation_id', convId);
  await sb.from('conversations').delete().eq('id', convId).eq('user_id', currentUser.id);

  // Animar salida y remover del DOM
  itemEl.addEventListener('animationend', () => itemEl.remove(), { once: true });

  // Si era la conversación activa, limpiar el chat
  if (convId === currentConversationId) {
    resetChat();
  }

  // Si no quedan más items, mostrar mensaje vacío
  setTimeout(() => {
    if (historyList.querySelectorAll('.history-item').length === 0) {
      historyList.innerHTML = '<p class="history-empty">No tienes consultas guardadas aún.<br>¡Envía tu primera pregunta!</p>';
    }
  }, 300);
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

// Migra el historial anónimo de localStorage a Supabase tras login/registro.
// Devuelve el id de la conversación creada (o null si no había nada que migrar).
async function migrateAnonymousHistory() {
  if (!currentUser) return null;
  const sb = getSupabase();
  if (!sb) return null;

  const raw = localStorage.getItem('tpl_history');
  if (!raw) return null;

  try {
    const msgs = JSON.parse(raw);
    if (!Array.isArray(msgs) || msgs.length === 0) return null;

    const firstUser = msgs.find(m => m && m.role === 'user' && m.content);
    if (!firstUser) {
      localStorage.removeItem('tpl_history');
      return null;
    }

    const title = firstUser.content.length > 60
      ? firstUser.content.slice(0, 60) + '…'
      : firstUser.content;

    const { data: conv, error } = await sb
      .from('conversations')
      .insert({ user_id: currentUser.id, title })
      .select('id')
      .single();
    if (error || !conv) return null;

    const rows = msgs
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({
        conversation_id: conv.id,
        role:    m.role,
        content: m.content,
        input_tokens:  0,
        output_tokens: 0,
      }));

    if (rows.length > 0) {
      await sb.from('messages').insert(rows);
    }

    localStorage.removeItem('tpl_history');
    return conv.id;
  } catch (err) {
    console.warn('[migrate]', err.message);
    return null;
  }
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
  await sb.from('conversations')
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
  }).then(() => {}).catch(err => console.warn('[analytics]', err.message));
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

// ══ RATE LIMITING (cliente) ════════════════════════
// El límite real se aplica en el servidor.
// El cliente refleja el estado devuelto por /api/chat
// y muestra un countdown cuando la ventana se agota.

const rateLimitState = {
  remaining: null,   // null = aún no sabemos, número = mensajes restantes
  resetAt:   null,   // ISO string de cuándo se reinicia la ventana
  _timer:    null,   // ID de setInterval del countdown
};

function getRateLimitCap() {
  return currentUser ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;
}

function hasReachedLimit() {
  return rateLimitState.remaining === 0;
}

function updateRateLimitUI() {
  if (!budgetIndicatorEl) return;
  const { remaining, resetAt } = rateLimitState;

  if (remaining === null) {
    budgetIndicatorEl.textContent = '';
    budgetIndicatorEl.className = 'budget-indicator';
    return;
  }

  if (remaining === 0 && resetAt) {
    if (!rateLimitState._timer) startCountdown();
    return;
  }

  clearCountdown();
  const cap = getRateLimitCap();
  if (remaining < cap) {
    const s = remaining === 1 ? '' : 's';
    budgetIndicatorEl.textContent = `· ${remaining} consulta${s} disponible${s}`;
    budgetIndicatorEl.className = 'budget-indicator' + (remaining <= 1 ? ' rl-low' : '');
  } else {
    budgetIndicatorEl.textContent = '';
    budgetIndicatorEl.className = 'budget-indicator';
  }
}

function startCountdown() {
  if (!budgetIndicatorEl || !rateLimitState.resetAt) return;
  clearCountdown();

  function tick() {
    const diff = new Date(rateLimitState.resetAt).getTime() - Date.now();

    if (diff <= 0) {
      clearCountdown();
      rateLimitState.remaining = null;
      rateLimitState.resetAt   = null;
      budgetIndicatorEl.textContent = '';
      budgetIndicatorEl.className = 'budget-indicator';
      // Ocultar error de límite si aún está visible
      if (errorBanner.textContent.includes('límite')) hideError();
      return;
    }

    const h  = Math.floor(diff / 3_600_000);
    const m  = Math.floor((diff % 3_600_000) / 60_000);
    const s  = Math.floor((diff % 60_000) / 1_000);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    budgetIndicatorEl.textContent = `· Límite alcanzado · Se reinicia en ${hh}:${mm}:${ss}`;
    budgetIndicatorEl.className = 'budget-indicator rl-limit';
  }

  tick();
  rateLimitState._timer = setInterval(tick, 1_000);
}

function clearCountdown() {
  if (rateLimitState._timer) {
    clearInterval(rateLimitState._timer);
    rateLimitState._timer = null;
  }
}

function resetRateLimitState() {
  clearCountdown();
  rateLimitState.remaining = null;
  rateLimitState.resetAt   = null;
  updateRateLimitUI();
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
    const cap = getRateLimitCap();
    showError(`Has alcanzado el límite de ${cap} consultas por cada 6 horas.`);
    updateRateLimitUI();
    return;
  }

  // Si el chat no está activo (usuario en landing), lanzarlo primero
  if (!appRoot.classList.contains('active')) {
    doLaunchChat();
    // Esperar a que la animación de entrada termine antes de continuar
    await new Promise(r => setTimeout(r, 280));
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

  // Anthropic exige que el primer mensaje sea 'user'. Después del push, el
  // historial siempre acaba en 'user' (impar). Mantenemos hasta 21 mensajes
  // (10 pares + el último user) y, si tras el corte el primero es 'assistant',
  // descartamos uno más hasta dejar 'user' al frente.
  const MAX_MSGS = MAX_HISTORY_PAIRS * 2 + 1;
  if (history.length > MAX_MSGS) {
    history = history.slice(history.length - MAX_MSGS);
  }
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }

  setLoading(true);

  try {
    // Incluir token de auth si el usuario está logueado
    const sb = getSupabase();
    const sessionData = sb ? await sb.auth.getSession() : null;
    const authToken   = sessionData?.data?.session?.access_token || null;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        ...(authToken && { authToken }),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!data) {
      showError('Respuesta inesperada del servidor. Intenta de nuevo.');
      history.pop();
      userRow.remove();
      return;
    }

    // Rate limit alcanzado en el servidor
    if (response.status === 429) {
      if (data.resetAt) {
        rateLimitState.remaining = 0;
        rateLimitState.resetAt   = data.resetAt;
        updateRateLimitUI();
      }
      showError(data.error || 'Límite de consultas alcanzado. Intenta más tarde.');
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

    // Actualizar contador de mensajes restantes desde la respuesta del servidor
    if (data.remaining !== undefined && data.remaining !== null) {
      rateLimitState.remaining = data.remaining;
      rateLimitState.resetAt   = data.resetAt || null;
      updateRateLimitUI();
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
  const jtObserver = new MutationObserver(() => {
    const chatActive = appRoot.classList.contains('active');
    trigger.style.display = chatActive ? 'flex' : 'none';
    if (!chatActive) closeJT();
  });
  jtObserver.observe(appRoot, { attributes: true, attributeFilter: ['class'] });
  // jtObserver.disconnect() si en algún momento se desmonta el componente

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
// TUESCRITOIA — JuriTool
// ════════════════════════════════════════════════════════════════
(function TuEscritoIA() {

  // ── Categorías y campos ────────────────────────
  const CATEGORIAS = {
    laboral: {
      emoji: '👔', label: 'Laboral',
      desc: 'Contratos, despidos, renuncias, acuerdos laborales',
      tipos: ['Carta de Despido', 'Carta de Renuncia', 'Acuerdo de Terminación Mutua', 'Contrato de Trabajo', 'Memorando Laboral', 'Otro tipo de escrito laboral'],
      campos: [
        { id: 'tipo_escrito',       label: 'Tipo de escrito',                              type: 'select', req: true },
        { id: 'nombre_trabajador',  label: 'Nombre completo del trabajador',               type: 'text',   req: true },
        { id: 'nombre_empleador',   label: 'Nombre de la empresa / empleador',             type: 'text',   req: true },
        { id: 'cargo',              label: 'Cargo del trabajador',                         type: 'text',   req: true },
        { id: 'fecha_inicio',       label: 'Fecha de inicio de la relación laboral',       type: 'text',   ph: 'Ej: 1 de enero de 2022' },
        { id: 'motivo',             label: 'Motivo o circunstancias',                      type: 'textarea', ph: 'Describe el motivo, causa o situación…' },
        { id: 'ciudad',             label: 'Ciudad',                                       type: 'text',   req: true, ph: 'Ej: Ciudad de Panamá' },
        { id: 'fecha_doc',          label: 'Fecha del documento',                          type: 'text',   req: true, ph: 'Ej: 24 de mayo de 2026' },
        { id: 'detalle',            label: 'Información adicional (opcional)',              type: 'textarea' },
      ],
    },
    civil: {
      emoji: '⚖️', label: 'Civil',
      desc: 'Demandas civiles, cobros, reclamos, apelaciones',
      tipos: ['Demanda Civil', 'Demanda de Cobro', 'Carta de Reclamo', 'Recurso de Apelación', 'Contestación de Demanda', 'Memorial Civil', 'Otro tipo de escrito civil'],
      campos: [
        { id: 'tipo_escrito',       label: 'Tipo de escrito',                              type: 'select', req: true },
        { id: 'nombre_demandante',  label: 'Nombre del demandante / solicitante',          type: 'text',   req: true },
        { id: 'nombre_demandado',   label: 'Nombre del demandado / destinatario',          type: 'text',   req: true },
        { id: 'tribunal',           label: 'Tribunal o entidad destinataria',              type: 'text',   ph: 'Ej: Juzgado Civil del Circuito de Panamá' },
        { id: 'hechos',             label: 'Descripción de los hechos',                   type: 'textarea', req: true, ph: 'Describe los hechos con el mayor detalle posible…' },
        { id: 'monto',              label: 'Monto reclamado (si aplica)',                  type: 'text',   ph: 'Ej: B/. 5,000.00' },
        { id: 'ciudad',             label: 'Ciudad',                                       type: 'text',   req: true, ph: 'Ej: Ciudad de Panamá' },
        { id: 'fecha_doc',          label: 'Fecha del documento',                          type: 'text',   req: true, ph: 'Ej: 24 de mayo de 2026' },
        { id: 'detalle',            label: 'Información adicional (opcional)',              type: 'textarea' },
      ],
    },
    familia: {
      emoji: '👨‍👩‍👧', label: 'Familia',
      desc: 'Divorcios, alimentos, custodia, herencias',
      tipos: ['Demanda de Divorcio', 'Solicitud de Custodia', 'Demanda de Alimentos', 'Acuerdo de Separación', 'Reconocimiento de Paternidad', 'Solicitud de Herencia', 'Otro tipo de escrito familiar'],
      campos: [
        { id: 'tipo_escrito',       label: 'Tipo de escrito',                              type: 'select', req: true },
        { id: 'nombre_solicitante', label: 'Nombre del solicitante',                       type: 'text',   req: true },
        { id: 'nombre_contraparte', label: 'Nombre del cónyuge / contraparte',             type: 'text',   req: true },
        { id: 'hijos',              label: 'Hijos (nombres y edades, si aplica)',          type: 'textarea', ph: 'Ej: Juan Pérez, 8 años; María Pérez, 5 años' },
        { id: 'hechos',             label: 'Descripción de la situación',                  type: 'textarea', req: true, ph: 'Describe la situación con el mayor detalle posible…' },
        { id: 'ciudad',             label: 'Ciudad',                                       type: 'text',   req: true, ph: 'Ej: Ciudad de Panamá' },
        { id: 'fecha_doc',          label: 'Fecha del documento',                          type: 'text',   req: true, ph: 'Ej: 24 de mayo de 2026' },
        { id: 'detalle',            label: 'Información adicional (opcional)',              type: 'textarea' },
      ],
    },
    comercial: {
      emoji: '🏢', label: 'Comercial',
      desc: 'Contratos de arrendamiento, servicios, compraventa',
      tipos: ['Contrato de Arrendamiento', 'Contrato de Servicios', 'Contrato de Compraventa', 'Acuerdo de Confidencialidad', 'Poder Notarial', 'Carta de Intención', 'Otro tipo de contrato comercial'],
      campos: [
        { id: 'tipo_escrito',       label: 'Tipo de escrito',                              type: 'select', req: true },
        { id: 'nombre_parte_a',     label: 'Nombre de la Parte A (arrendador / vendedor / prestador)', type: 'text', req: true },
        { id: 'nombre_parte_b',     label: 'Nombre de la Parte B (arrendatario / comprador / cliente)', type: 'text', req: true },
        { id: 'objeto',             label: 'Objeto del contrato',                          type: 'textarea', req: true, ph: 'Describe el bien, servicio o acuerdo…' },
        { id: 'valor',              label: 'Valor o precio pactado',                       type: 'text',   ph: 'Ej: B/. 1,200.00 mensuales' },
        { id: 'duracion',           label: 'Duración o vigencia',                          type: 'text',   ph: 'Ej: 12 meses, del 1 de junio al 31 de mayo de 2027' },
        { id: 'ciudad',             label: 'Ciudad',                                       type: 'text',   req: true, ph: 'Ej: Ciudad de Panamá' },
        { id: 'fecha_doc',          label: 'Fecha del documento',                          type: 'text',   req: true, ph: 'Ej: 24 de mayo de 2026' },
        { id: 'detalle',            label: 'Condiciones especiales (opcional)',             type: 'textarea' },
      ],
    },
    penal: {
      emoji: '🚨', label: 'Penal',
      desc: 'Denuncias, querellas, memoriales a fiscalía',
      tipos: ['Denuncia Penal', 'Querella', 'Memorial a Fiscalía', 'Solicitud de Medidas Cautelares', 'Recurso de Habeas Corpus', 'Otro tipo de escrito penal'],
      campos: [
        { id: 'tipo_escrito',        label: 'Tipo de escrito',                             type: 'select', req: true },
        { id: 'nombre_denunciante',  label: 'Nombre completo del denunciante',             type: 'text',   req: true },
        { id: 'cedula_denunciante',  label: 'Número de cédula del denunciante',            type: 'text',   ph: 'Ej: 8-123-456' },
        { id: 'nombre_denunciado',   label: 'Nombre del denunciado (si se conoce)',        type: 'text' },
        { id: 'hechos',              label: 'Descripción detallada del hecho',             type: 'textarea', req: true, ph: 'Describe los hechos con fecha, hora, lugar y detalles…' },
        { id: 'fecha_hecho',         label: 'Fecha y hora del hecho',                      type: 'text',   ph: 'Ej: 20 de mayo de 2026, 10:30 a.m.' },
        { id: 'lugar_hecho',         label: 'Lugar donde ocurrió el hecho',                type: 'text' },
        { id: 'testigos',            label: 'Testigos o evidencias (si aplica)',            type: 'textarea' },
        { id: 'ciudad',              label: 'Ciudad',                                       type: 'text',   req: true, ph: 'Ej: Ciudad de Panamá' },
        { id: 'fecha_doc',           label: 'Fecha del documento',                          type: 'text',   req: true, ph: 'Ej: 24 de mayo de 2026' },
      ],
    },
    administrativo: {
      emoji: '📋', label: 'Administrativo',
      desc: 'Solicitudes, recursos e impugnaciones ante entidades',
      tipos: ['Solicitud a Entidad Pública', 'Recurso de Reconsideración', 'Recurso de Apelación Administrativa', 'Impugnación', 'Carta Formal Institucional', 'Memorial Administrativo', 'Otro tipo de escrito administrativo'],
      campos: [
        { id: 'tipo_escrito',       label: 'Tipo de escrito',                              type: 'select', req: true },
        { id: 'nombre_solicitante', label: 'Nombre completo del solicitante',              type: 'text',   req: true },
        { id: 'cedula',             label: 'Número de cédula',                             type: 'text',   ph: 'Ej: 8-123-456' },
        { id: 'entidad',            label: 'Entidad destinataria',                         type: 'text',   req: true, ph: 'Ej: Ministerio de Trabajo, CSS, MIVIOT' },
        { id: 'objeto',             label: 'Objeto de la solicitud',                       type: 'textarea', req: true, ph: 'Describe qué estás solicitando y por qué…' },
        { id: 'fundamento',         label: 'Fundamento legal (si conoce)',                 type: 'textarea', ph: 'Ej: Artículo 17 del Código de Trabajo…' },
        { id: 'ciudad',             label: 'Ciudad',                                       type: 'text',   req: true, ph: 'Ej: Ciudad de Panamá' },
        { id: 'fecha_doc',          label: 'Fecha del documento',                          type: 'text',   req: true, ph: 'Ej: 24 de mayo de 2026' },
        { id: 'detalle',            label: 'Información adicional (opcional)',              type: 'textarea' },
      ],
    },
  };

  // ── Referencias DOM ────────────────────────────
  const overlay      = document.getElementById('escritoOverlay');
  const closeBtn     = document.getElementById('escritoClose');
  const headerSub    = document.getElementById('escritoHeaderSub');
  const step1        = document.getElementById('escritoStep1');
  const step2        = document.getElementById('escritoStep2');
  const step3        = document.getElementById('escritoStep3');
  const step4        = document.getElementById('escritoStep4');
  const catsEl       = document.getElementById('escritoCats');
  const backBtn      = document.getElementById('escritoBackBtn');
  const formContainer= document.getElementById('escritoFormContainer');
  const formError    = document.getElementById('escritoFormError');
  const generateBtn  = document.getElementById('escritoGenerateBtn');
  const copyBtn      = document.getElementById('escritoCopyBtn');
  const downloadBtn  = document.getElementById('escritoDownloadBtn');
  const printBtn     = document.getElementById('escritoPrintBtn');
  const docEl        = document.getElementById('escritoDoc');
  const newBtn       = document.getElementById('escritoNewBtn');
  const escritoCard  = document.getElementById('jtEscritoCard');

  if (!overlay || !escritoCard) return;

  let selectedCategory = null;
  let generatedText    = '';
  let generatedType    = '';

  // ── Abrir / Cerrar ────────────────────────────
  function openEscrito() {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    goToStep1();
  }

  function closeEscrito() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ── Navegación entre pasos ────────────────────
  function showStep(stepEl) {
    [step1, step2, step3, step4].forEach(s => s.classList.add('hidden'));
    stepEl.classList.remove('hidden');
  }

  function goToStep1() {
    selectedCategory = null;
    headerSub.textContent = 'Generador de escritos jurídicos';
    buildCategoryGrid();
    showStep(step1);
  }

  function goToStep2(catKey) {
    selectedCategory = catKey;
    const cat = CATEGORIAS[catKey];
    headerSub.textContent = cat.emoji + ' ' + cat.label;
    buildForm(cat);
    formError.classList.add('hidden');
    showStep(step2);
  }

  function goToStep3() {
    showStep(step3);
  }

  function goToStep4(text, docType) {
    generatedText = text;
    generatedType = docType;
    docEl.textContent = text;
    headerSub.textContent = 'Escrito generado';
    showStep(step4);
  }

  // ── Construir grid de categorías ──────────────
  function buildCategoryGrid() {
    catsEl.innerHTML = '';
    Object.entries(CATEGORIAS).forEach(([key, cat]) => {
      const card = document.createElement('div');
      card.className = 'escrito-cat-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Categoría: ${cat.label}`);
      card.innerHTML = `
        <span class="escrito-cat-emoji" aria-hidden="true">${cat.emoji}</span>
        <span class="escrito-cat-label">${cat.label}</span>
        <span class="escrito-cat-desc">${cat.desc}</span>
      `;
      const select = () => {
        if (!currentUser) {
          closeEscrito();
          openAuthModal('login', { showSkip: false });
          return;
        }
        goToStep2(key);
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
      catsEl.appendChild(card);
    });
  }

  // ── Construir formulario dinámico ─────────────
  function buildForm(cat) {
    formContainer.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'escrito-form-title';
    title.textContent = 'Completa los datos del escrito';
    formContainer.appendChild(title);

    cat.campos.forEach(campo => {
      const wrapper = document.createElement('div');
      wrapper.className = 'escrito-field';

      const label = document.createElement('label');
      label.className = 'escrito-label';
      label.setAttribute('for', 'ec_' + campo.id);
      label.textContent = campo.label + (campo.req ? ' *' : '');
      wrapper.appendChild(label);

      if (campo.type === 'select') {
        const sel = document.createElement('select');
        sel.className = 'escrito-select';
        sel.id = 'ec_' + campo.id;
        sel.name = campo.id;
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '— Selecciona una opción —';
        sel.appendChild(blank);
        cat.tipos.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          sel.appendChild(opt);
        });
        wrapper.appendChild(sel);

      } else if (campo.type === 'textarea') {
        const ta = document.createElement('textarea');
        ta.className = 'escrito-textarea';
        ta.id = 'ec_' + campo.id;
        ta.name = campo.id;
        ta.rows = 3;
        ta.placeholder = campo.ph || '';
        wrapper.appendChild(ta);

      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'escrito-input';
        inp.id = 'ec_' + campo.id;
        inp.name = campo.id;
        inp.placeholder = campo.ph || '';
        inp.autocomplete = 'off';
        wrapper.appendChild(inp);
      }

      formContainer.appendChild(wrapper);
    });
  }

  // ── Recopilar valores del formulario ──────────
  function collectFields(cat) {
    const fields = {};
    cat.campos.forEach(campo => {
      const el = document.getElementById('ec_' + campo.id);
      if (el) fields[campo.label] = el.value.trim();
    });
    return fields;
  }

  function validateFields(cat) {
    for (const campo of cat.campos) {
      if (!campo.req) continue;
      const el = document.getElementById('ec_' + campo.id);
      if (el && !el.value.trim()) return campo.label;
    }
    return null;
  }

  // ── Generar escrito ───────────────────────────
  async function handleGenerate() {
    if (!selectedCategory) return;
    const cat = CATEGORIAS[selectedCategory];

    const missing = validateFields(cat);
    if (missing) {
      formError.textContent = `El campo "${missing}" es obligatorio.`;
      formError.classList.remove('hidden');
      return;
    }
    formError.classList.add('hidden');

    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      closeEscrito();
      openAuthModal('login', { showSkip: false });
      return;
    }

    const fields      = collectFields(cat);
    const tipoEl      = document.getElementById('ec_tipo_escrito');
    const documentType = tipoEl?.value || cat.label;

    goToStep3();

    try {
      const res = await fetch('/api/escrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category:     cat.label,
          documentType,
          fields,
          authToken:    session.access_token,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error || 'Error al generar el escrito.');
      }

      goToStep4(data.escrito, documentType);

    } catch (err) {
      showStep(step2);
      formError.textContent = err.message || 'Error de conexión. Intenta de nuevo.';
      formError.classList.remove('hidden');
    }
  }

  // ── Copiar al portapapeles ─────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedText);
      const orig = copyBtn.innerHTML;
      copyBtn.textContent = '✓ Copiado';
      copyBtn.style.color = 'var(--gold)';
      setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.style.color = ''; }, 2000);
    } catch {
      copyBtn.textContent = 'Error';
      setTimeout(() => { copyBtn.textContent = '📋 Copiar'; }, 2000);
    }
  }

  // ── Limpiar restos de markdown si Claude los devolvió ──
  // (el system prompt pide texto plano, pero por defensa adicional)
  function stripMarkdown(text) {
    return text
      .replace(/^#{1,6}\s+/gm, '')              // títulos #, ##, ###
      .replace(/\*\*(.+?)\*\*/g, '$1')          // **negrita**
      .replace(/__(.+?)__/g, '$1')              // __negrita__
      .replace(/\*(.+?)\*/g, '$1')              // *cursiva*
      .replace(/_(.+?)_/g, '$1')                // _cursiva_
      .replace(/`(.+?)`/g, '$1')                // `código inline`
      .replace(/^[\-\*]\s+/gm, '• ')            // - lista / * lista → •
      .replace(/```[\s\S]*?```/g, '');          // bloques de código
  }

  // ── Descargar como .doc ────────────────────────
  function handleDownload() {
    const cleaned = stripMarkdown(generatedText);
    const safe = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${generatedType}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>@page{margin:2.5cm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6}pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:12pt}</style>
</head><body><pre>${safe}</pre></body></html>`;

    const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-word;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `TuEscritoIA_${generatedType.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  // ── Imprimir / PDF ────────────────────────────
  function handlePrint() {
    const cleaned = stripMarkdown(generatedText);
    const safe = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${generatedType} — Tu Proceso Legal</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 2.5cm; line-height: 1.6; color: #000; }
    pre  { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body><pre>${safe}</pre>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    win.document.close();
  }

  // ── Listeners ─────────────────────────────────
  escritoCard.addEventListener('click', () => {
    const jtOverlay = document.getElementById('jtOverlay');
    if (jtOverlay) jtOverlay.classList.add('hidden');
    openEscrito();
  });
  escritoCard.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escritoCard.click(); }
  });

  closeBtn.addEventListener('click', closeEscrito);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEscrito(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeEscrito();
  });

  backBtn.addEventListener('click', goToStep1);
  generateBtn.addEventListener('click', handleGenerate);
  copyBtn.addEventListener('click', handleCopy);
  downloadBtn.addEventListener('click', handleDownload);
  printBtn.addEventListener('click', handlePrint);
  newBtn.addEventListener('click', goToStep1);

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
      if (!appendMode) {
        showState('no-results');
      } else {
        // Restaurar botón "Cargar más" si la red falló durante el append
        const loadMoreBtn = document.getElementById('bibLoadMore');
        if (loadMoreBtn) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = '↻ Reintentar carga';
        }
      }
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


// ════════════════════════════════════════════════════════════════
// RUTA PROCESAL — JuriTool
// ════════════════════════════════════════════════════════════════
(function RutaProcesal() {

  // ── Catálogo de áreas y procesos ───────────────
  const AREAS = {
    laboral: {
      emoji: '👔', label: 'Laboral',
      desc: 'Despidos, reclamos, denuncias laborales',
      procesos: [
        'Demanda por despido injustificado',
        'Reclamo de prestaciones laborales (décimos, vacaciones)',
        'Denuncia ante el MITRADEL',
        'Reclamación por accidente de trabajo',
        'Reclamo de salarios retenidos',
        'Otro proceso laboral',
      ],
    },
    civil: {
      emoji: '⚖️', label: 'Civil',
      desc: 'Cobros, desahucio, herencias, daños',
      procesos: [
        'Demanda de cobro (proceso sumario)',
        'Proceso de desahucio / inquilinato',
        'Proceso sucesorio / herencia',
        'Demanda por daños y perjuicios',
        'Prescripción adquisitiva de dominio',
        'Otro proceso civil',
      ],
    },
    familia: {
      emoji: '👨‍👩‍👧', label: 'Familia',
      desc: 'Divorcio, pensión, custodia, adopción',
      procesos: [
        'Divorcio por mutuo acuerdo',
        'Divorcio contencioso',
        'Reclamación de pensión alimenticia',
        'Proceso de guarda y crianza (custodia)',
        'Adopción',
        'Reconocimiento de paternidad',
      ],
    },
    penal: {
      emoji: '🔏', label: 'Penal',
      desc: 'Denuncias, habeas corpus, apelaciones',
      procesos: [
        'Denuncia penal ante el Ministerio Público',
        'Querella por delito privado',
        'Solicitud de habeas corpus',
        'Recurso de apelación penal',
        'Otro proceso penal',
      ],
    },
    administrativo: {
      emoji: '🏛️', label: 'Administrativo',
      desc: 'Recursos, amparos, quejas al Estado',
      procesos: [
        'Recurso de reconsideración administrativa',
        'Recurso de apelación ante tribunal administrativo',
        'Amparo de garantías constitucionales',
        'Queja ante la Defensoría del Pueblo',
        'Reclamación ante la Autoridad de Protección al Consumidor (ACODECO)',
        'Otro proceso administrativo',
      ],
    },
  };

  // ── Referencias DOM ────────────────────────────
  const overlay       = document.getElementById('rutaOverlay');
  const rutaCard      = document.getElementById('jtRutaCard');
  const closeBtn      = document.getElementById('rutaClose');
  const subtitle      = document.getElementById('rutaSubtitle');
  const step1         = document.getElementById('rutaStep1');
  const step2         = document.getElementById('rutaStep2');
  const step3         = document.getElementById('rutaStep3');
  const step4         = document.getElementById('rutaStep4');
  const areasEl       = document.getElementById('rutaAreas');
  const formContainer = document.getElementById('rutaFormContainer');
  const formError     = document.getElementById('rutaFormError');
  const backBtn       = document.getElementById('rutaBackBtn');
  const generateBtn   = document.getElementById('rutaGenerateBtn');
  const resultado     = document.getElementById('rutaResultado');
  const copyBtn       = document.getElementById('rutaCopyBtn');
  const newBtn        = document.getElementById('rutaNewBtn');

  if (!overlay || !rutaCard) return;

  let selectedArea    = null;
  let lastRutaText    = '';

  // ── Abrir / Cerrar ─────────────────────────────
  function openRuta() {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    goToStep1();
  }

  function closeRuta() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ── Navegación entre pasos ─────────────────────
  function showStep(n) {
    [step1, step2, step3, step4].forEach((s, i) => s.classList.toggle('hidden', i !== n - 1));
    overlay.scrollTop = 0;
  }

  function goToStep1() {
    selectedArea = null;
    subtitle.textContent = 'Selecciona el área del derecho';
    renderAreas();
    showStep(1);
  }

  function goToStep2(areaKey) {
    selectedArea = areaKey;
    const area = AREAS[areaKey];
    subtitle.textContent = `${area.emoji} ${area.label}`;
    renderForm(area);
    showStep(2);
  }

  // ── Render áreas (paso 1) ──────────────────────
  function renderAreas() {
    areasEl.innerHTML = Object.entries(AREAS).map(([key, a]) => `
      <button class="ruta-area-card" data-area="${key}" type="button" aria-label="${a.label}">
        <span class="ruta-area-emoji">${a.emoji}</span>
        <span class="ruta-area-label">${a.label}</span>
        <span class="ruta-area-desc">${a.desc}</span>
      </button>
    `).join('');

    areasEl.querySelectorAll('.ruta-area-card').forEach(card => {
      card.addEventListener('click', () => goToStep2(card.dataset.area));
    });
  }

  // ── Render formulario (paso 2) ─────────────────
  function renderForm(area) {
    const options = area.procesos.map(p => `<option value="${p}">${p}</option>`).join('');
    formContainer.innerHTML = `
      <p class="ruta-form-title">${area.emoji} <span>${area.label}</span></p>

      <div class="ruta-field">
        <label for="rutaProceso">Tipo de proceso *</label>
        <select id="rutaProceso">
          <option value="">— Selecciona un proceso —</option>
          ${options}
        </select>
      </div>

      <div class="ruta-field">
        <label for="rutaSituacion">Describe tu situación *</label>
        <textarea id="rutaSituacion" placeholder="Explica brevemente qué ocurrió, fechas relevantes, qué buscas lograr…" rows="4"></textarea>
      </div>

      <div class="ruta-field">
        <label for="rutaCiudad">Ciudad donde tramitarás el proceso</label>
        <input id="rutaCiudad" type="text" placeholder="Ej: Ciudad de Panamá, Colón, David…" />
      </div>

      <label class="ruta-checkbox-row">
        <input type="checkbox" id="rutaTieneAbogado" />
        Ya tengo abogado contratado
      </label>

      <div class="ruta-field" style="margin-top:12px">
        <label for="rutaNotas">Información adicional (opcional)</label>
        <textarea id="rutaNotas" placeholder="Cualquier dato adicional que consideres relevante…" rows="2"></textarea>
      </div>
    `;
  }

  // ── Generación de ruta ─────────────────────────
  async function generarRuta() {
    const proceso      = document.getElementById('rutaProceso')?.value.trim();
    const situacion    = document.getElementById('rutaSituacion')?.value.trim();
    const ciudad       = document.getElementById('rutaCiudad')?.value.trim();
    const tieneAbogado = document.getElementById('rutaTieneAbogado')?.checked;
    const notas        = document.getElementById('rutaNotas')?.value.trim();

    // Validación
    formError.classList.add('hidden');
    if (!proceso) { showError('Selecciona el tipo de proceso.'); return; }
    if (!situacion || situacion.length < 20) { showError('Describe tu situación con al menos 20 caracteres.'); return; }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generando…';
    showStep(3);

    try {
      const sb = getSupabase();
      const sessionData = sb ? await sb.auth.getSession() : null;
      const authToken   = sessionData?.data?.session?.access_token || null;

      const resp = await fetch('/api/ruta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area:    AREAS[selectedArea].label,
          proceso,
          situacion,
          ciudad:  ciudad || 'Ciudad de Panamá',
          tieneAbogado,
          notas,
          ...(authToken && { authToken }),
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        showStep(2);
        showError(data.error || 'Error al generar la ruta. Intenta de nuevo.');
        return;
      }

      renderResultado(data);
      lastRutaText = buildTextoPlano(data);
      showStep(4);

    } catch {
      showStep(2);
      showError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg> Generar mi Ruta Procesal`;
    }
  }

  // ── Render resultado (paso 4) ──────────────────
  function renderResultado(data) {
    const { titulo, intro, duracion, pasos = [], consejos = [] } = data;

    const pasosHTML = pasos.map(p => `
      <div class="ruta-paso-card">
        <div class="ruta-paso-num">${p.n}</div>
        <div class="ruta-paso-body">
          <p class="ruta-paso-titulo">${esc(p.titulo)}</p>
          <p class="ruta-paso-desc">${esc(p.que_hacer)}</p>
          <div class="ruta-paso-meta">
            ${p.donde ? `<span class="ruta-meta-chip">🏢 ${esc(p.donde)}</span>` : ''}
            ${p.plazo ? `<span class="ruta-meta-chip">⏱ ${esc(p.plazo)}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    const consejosHTML = consejos.length ? `
      <div class="ruta-consejos">
        <p class="ruta-consejos-titulo">💡 Consejos prácticos</p>
        <ul>${consejos.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>
    ` : '';

    resultado.innerHTML = `
      <div class="ruta-intro-card">
        <p class="ruta-intro-titulo">${esc(titulo || '')}</p>
        <p class="ruta-intro-texto">${esc(intro || '')}</p>
        ${duracion ? `<span class="ruta-duracion-badge">⏳ Duración estimada: ${esc(duracion)}</span>` : ''}
      </div>
      <div class="ruta-pasos-lista">${pasosHTML}</div>
      ${consejosHTML}
    `;
  }

  // ── Texto plano para copiar ────────────────────
  function buildTextoPlano(data) {
    const { titulo, intro, duracion, pasos = [], consejos = [] } = data;
    let txt = `${titulo}\n${'─'.repeat(titulo?.length || 20)}\n\n`;
    if (intro) txt += `${intro}\n`;
    if (duracion) txt += `Duración estimada: ${duracion}\n`;
    txt += '\n';
    pasos.forEach(p => {
      txt += `PASO ${p.n}: ${p.titulo}\n${p.que_hacer}\n`;
      if (p.donde) txt += `Dónde: ${p.donde}\n`;
      if (p.plazo)  txt += `Plazo: ${p.plazo}\n`;
      txt += '\n';
    });
    if (consejos.length) {
      txt += 'CONSEJOS PRÁCTICOS:\n';
      consejos.forEach(c => { txt += `• ${c}\n`; });
    }
    txt += '\n⚠️ Guía orientativa generada con IA. Consulta con un abogado colegiado para asesoría personalizada.';
    return txt;
  }

  // ── Helpers ────────────────────────────────────
  function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
    showStep(2);
  }

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
  }

  // ── Listeners ──────────────────────────────────
  rutaCard.addEventListener('click', () => {
    const jtOverlay = document.getElementById('jtOverlay');
    if (jtOverlay) jtOverlay.classList.add('hidden');
    openRuta();
  });
  rutaCard.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rutaCard.click(); }
  });

  closeBtn.addEventListener('click', closeRuta);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeRuta(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeRuta();
  });

  backBtn.addEventListener('click', goToStep1);
  generateBtn.addEventListener('click', generarRuta);
  newBtn.addEventListener('click', goToStep1);

  copyBtn.addEventListener('click', async () => {
    if (!lastRutaText) return;
    try {
      await navigator.clipboard.writeText(lastRutaText);
      copyBtn.textContent = '✓ Copiado';
      setTimeout(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar`;
      }, 2000);
    } catch { /* clipboard sin permiso */ }
  });

}());
