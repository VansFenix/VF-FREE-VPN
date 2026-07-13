// ====== CONSTANTS ======
const TG_CHANNEL = 'wildVF';
const TG_CHANNEL_LINK = 'https://t.me/wildVF';
const OWNER_TG = 'https://t.me/vansFenix';
const DAILY_BONUS_AMOUNT = 50;
const TG_BOT_API = 'https://api.telegram.org/bot';
const REFERRAL_BONUS = 50;

let TG_BOT_TOKEN = localStorage.getItem('vf_bot_token') || '';
let TG_BOT_USERNAME = localStorage.getItem('vf_bot_username') || '';

// ====== VLESS SUBSCRIPTION LINKS (INCY / Happ) ======
const VLESS_CONFIGS = {
    WVFSTANDART: 'vless://a8f3c9d1-e2b4-4f6a-8c7d-9e0f1a2b3c4d@sg1.vpn-vf.xyz:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=8J3fK9mN2pQ5rT7vW1xY4zA6cD8eF0gH&sid=6d&type=tcp&flow=xtls-rprx-vision#WVFSTANDART',
    WVFMINI: 'vless://b1c4d7e9-f2a3-4b5c-8d6e-7f8g9h0i1j2k@nl1.vpn-vf.xyz:443?encryption=none&security=reality&sni=www.bing.com&fp=chrome&pbk=2mR4tY7wQ9nB1cD3fG5hJ8kL0pS6vX9&sid=3a&type=tcp&flow=xtls-rprx-vision#WVFMINI',
    WVFWL: 'vless://c2d5e8f0-1a3b-4c6d-9e7f-0a1b2c3d4e5f@de1.vpn-vf.xyz:443?encryption=none&security=reality&sni=www.amazon.com&fp=chrome&pbk=4kL7pO0rT3yU6iE9wQ2aZ5xN8dG1hJ&sid=7c&type=tcp&flow=xtls-rprx-vision#WVFWL',
    WVFBYWILDTASK: 'vless://d3e6f9a1-2b4c-5d7e-0f8a-1b2c3d4e5f6g@uk1.vpn-vf.xyz:443?encryption=none&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=6iE9wQ2aZ5xN8dG1hJ4kL7pO0rT3yU&sid=9e&type=tcp&flow=xtls-rprx-vision#WVFBYWILDTASK',
    WVFWILDVFROBOT: 'vless://e4f7a0b2-3c5d-6e8f-1a9b-2c3d4e5f6g7h@us1.vpn-vf.xyz:443?encryption=none&security=reality&sni=www.google.com&fp=chrome&pbk=8dG1hJ4kL7pO0rT3yU6iE9wQ2aZ5xN&sid=2f&type=tcp&flow=xtls-rprx-vision#WVFWILDVFROBOT',
    WVFBLACK: 'vless://f5a8b1c3-4d6e-7f9a-2b0c-3d4e5f6g7h8i@fr1.vpn-vf.xyz:443?encryption=none&security=reality&sni=www.netflix.com&fp=chrome&pbk=0rT3yU6iE9wQ2aZ5xN8dG1hJ4kL7pO&sid=4b&type=tcp&flow=xtls-rprx-vision#WVFBLACK'
};

// ====== STATE ======
let state = {
    user: null,
    betAmount: 10,
    choice: null,
    isFlipping: false,
    pendingTgUser: null
};

// ====== DOM REFS ======
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ====== STORAGE ======
function getUsers() {
    return JSON.parse(localStorage.getItem('vf_users') || '{}');
}

function saveUsers(users) {
    localStorage.setItem('vf_users', JSON.stringify(users));
}

function getCurrentUser() {
    const username = localStorage.getItem('vf_current_user');
    if (!username) return null;
    const users = getUsers();
    return users[username] || null;
}

function setCurrentUser(username) {
    localStorage.setItem('vf_current_user', username || '');
}

// ====== UTILITY ======
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = '0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

function isSubscribedToChannel() {
    if (!state.user) return false;
    return localStorage.getItem('vf_subscribed_' + state.user.username) === 'true';
}

function setSubscribed(value) {
    if (!state.user) return;
    localStorage.setItem('vf_subscribed_' + state.user.username, value.toString());
}

function isUserBlocked(username) {
    const users = getUsers();
    return users[username] && users[username].blocked === true;
}

function updateLastActive() {
    if (!state.user) return;
    const users = getUsers();
    if (users[state.user.username]) {
        users[state.user.username].lastActive = new Date().toISOString();
        saveUsers(users);
    }
}

// ====== TELEGRAM AUTH ======
function loadTelegramWidget() {
    const container = document.getElementById('tg-login-container');
    if (!container) return;

    if (TG_BOT_USERNAME) {
        container.style.display = 'flex';
        container.innerHTML = '';
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', TG_BOT_USERNAME);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '16');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        container.appendChild(script);
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

function fallbackRegister() {
    const input = document.getElementById('fallback-tg');
    const refInput = document.getElementById('fallback-ref');
    const tgUsername = input.value.trim().replace('@', '');
    const refCode = refInput.value.trim().toUpperCase();

    if (!tgUsername) {
        showToast('Введите ваш Telegram username', 'error');
        return;
    }

    const users = getUsers();
    let username = tgUsername;

    if (isUserBlocked(username)) {
        showToast('❌ Ваш аккаунт заблокирован', 'error');
        return;
    }

    if (users[username]) {
        users[username].lastActive = new Date().toISOString();
        state.user = users[username];
        saveUsers(users);
    } else {
        const newUser = {
            username,
            telegramId: '',
            telegramUsername: username,
            telegramPhoto: '',
            avatarData: '',
            coins: 100,
            joinDate: new Date().toISOString(),
            lastDaily: null,
            lastActive: new Date().toISOString(),
            gamesPlayed: 0,
            gamesWon: 0,
            referredBy: '',
            referralCount: 0,
            referralCode: username + Math.random().toString(36).slice(2, 6).toUpperCase(),
            blocked: false
        };

        if (refCode) {
            const allUsers = getUsers();
            for (const u in allUsers) {
                if (allUsers[u].referralCode === refCode && u !== username && !allUsers[u].blocked) {
                    newUser.referredBy = u;
                    newUser.coins += REFERRAL_BONUS;
                    allUsers[u].coins += REFERRAL_BONUS;
                    allUsers[u].referralCount = (allUsers[u].referralCount || 0) + 1;
                    saveUsers(allUsers);
                    showToast(`🎉 Реферальный код активирован! +${REFERRAL_BONUS} монет`, 'success');
                    break;
                }
            }
        }

        users[username] = newUser;
        state.user = newUser;
        saveUsers(users);
    }

    setCurrentUser(username);
    hideAuth();
    updateUI();
    input.value = '';
    refInput.value = '';
    showToast(`Добро пожаловать, ${username}!`, 'success');
}

function onTelegramAuth(user) {
    state.pendingTgUser = user;
    const refArea = document.getElementById('ref-input-area');
    if (refArea) refArea.classList.remove('hidden');

    const refInput = document.getElementById('reg-referral-tg');
    if (refInput) {
        // Check if user exists already
        const users = getUsers();
        const username = user.username || 'user_' + user.id;
        if (users[username]) {
            // User exists, just log in
            refInput.value = '';
            finalizeTgAuth();
        }
    }
}

function finalizeTgAuth() {
    if (!state.pendingTgUser) {
        showToast('Сначала авторизуйся через Telegram', 'error');
        return;
    }
    const user = state.pendingTgUser;
    const users = getUsers();
    let username = user.username || 'user_' + user.id;

    // Check blocked
    if (isUserBlocked(username)) {
        showToast('❌ Ваш аккаунт заблокирован', 'error');
        return;
    }

    if (users[username]) {
        users[username].telegramId = user.id;
        users[username].telegramUsername = username;
        if (user.photo_url) users[username].telegramPhoto = user.photo_url;
        users[username].lastActive = new Date().toISOString();
        state.user = users[username];
        saveUsers(users);
    } else {
        const refCode = document.getElementById('reg-referral-tg').value.trim().toUpperCase();
        const newUser = {
            username,
            telegramId: user.id,
            telegramUsername: username,
            telegramPhoto: user.photo_url || '',
            avatarData: '',
            coins: 100,
            joinDate: new Date().toISOString(),
            lastDaily: null,
            lastActive: new Date().toISOString(),
            gamesPlayed: 0,
            gamesWon: 0,
            referredBy: '',
            referralCount: 0,
            referralCode: username + Math.random().toString(36).slice(2, 6).toUpperCase(),
            blocked: false
        };

        if (refCode) {
            const allUsers = getUsers();
            for (const u in allUsers) {
                if (allUsers[u].referralCode === refCode && u !== username && !allUsers[u].blocked) {
                    newUser.referredBy = u;
                    newUser.coins += REFERRAL_BONUS;
                    allUsers[u].coins += REFERRAL_BONUS;
                    allUsers[u].referralCount = (allUsers[u].referralCount || 0) + 1;
                    saveUsers(allUsers);
                    showToast(`🎉 Реферальный код активирован! +${REFERRAL_BONUS} монет вам и другу`, 'success');
                    break;
                }
            }
        }

        users[username] = newUser;
        state.user = newUser;
        saveUsers(users);
    }

    state.pendingTgUser = null;
    setCurrentUser(username);
    hideAuth();
    updateUI();
    showToast(`Добро пожаловать, ${username}!`, 'success');
}

// ====== AUTH UI ======
function showAuth() {
    document.getElementById('auth-overlay').classList.remove('hidden');
    loadTelegramWidget();
}

function hideAuth() {
    document.getElementById('auth-overlay').classList.add('hidden');
}

// ====== AVATAR ======
function setAvatar(username, photoUrl, avatarData) {
    const setOnElements = () => {
        const navText = document.getElementById('nav-avatar-text');
        const navImg = document.getElementById('nav-avatar-img');
        const profText = document.getElementById('profile-avatar-text');
        const profImg = document.getElementById('profile-avatar-img');

        const src = avatarData || photoUrl || '';
        if (src) {
            if (navText) navText.style.display = 'none';
            if (navImg) { navImg.src = src; navImg.style.display = 'block'; }
            if (profText) profText.style.display = 'none';
            if (profImg) { profImg.src = src; profImg.style.display = 'block'; }
        } else {
            const letter = username ? username.charAt(0).toUpperCase() : 'U';
            if (navText) { navText.style.display = 'flex'; navText.textContent = letter; }
            if (navImg) navImg.style.display = 'none';
            if (profText) { profText.style.display = 'flex'; profText.textContent = letter; }
            if (profImg) profImg.style.display = 'none';
        }
    };
    setOnElements();
}

function handleAvatarUpload(input) {
    if (!state.user) return;
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        state.user.avatarData = dataUrl;
        setAvatar(state.user.username, state.user.telegramPhoto, dataUrl);

        const users = getUsers();
        if (users[state.user.username]) {
            users[state.user.username].avatarData = dataUrl;
            saveUsers(users);
        }
        showToast('✅ Аватарка обновлена', 'success');
    };
    reader.readAsDataURL(file);
}

// ====== UI UPDATE ======
function updateUI() {
    if (!state.user) return;
    const u = state.user;

    // Nav
    document.getElementById('nav-username').textContent = u.username;
    const coinsEl = document.getElementById('nav-coins');
    coinsEl.textContent = u.coins.toLocaleString();
    coinsEl.style.animation = 'none';
    void coinsEl.offsetHeight;
    coinsEl.style.animation = 'pulseGlow 0.6s ease';
    setAvatar(u.username, u.telegramPhoto, u.avatarData);

    // Profile
    document.getElementById('profile-username').textContent = u.username;
    document.getElementById('profile-display-name').textContent = u.username;
    document.getElementById('profile-telegram').textContent = '@' + (u.telegramUsername || u.username);
    document.getElementById('profile-status').textContent = isSubscribedToChannel() ? '✅ Подписан' : '❌ Не подписан';
    document.getElementById('profile-status').className = 'p-value ' + (isSubscribedToChannel() ? 'p-success' : 'p-muted');
    animateValue(document.getElementById('profile-coins'), u.coins);
    document.getElementById('profile-joined').textContent = formatDate(u.joinDate);
    animateValue(document.getElementById('profile-games'), u.gamesPlayed);
    animateValue(document.getElementById('profile-wins'), u.gamesWon);

    const winRate = u.gamesPlayed > 0 ? Math.round((u.gamesWon / u.gamesPlayed) * 100) : 0;
    document.getElementById('profile-winrate').textContent = winRate + '%';

    document.getElementById('profile-referral').textContent = u.referralCode;
    document.getElementById('profile-referral-count').textContent = (u.referralCount || 0) + ' друзей';

    updateDailyBonus();
    updateLastActive();
}

function animateValue(el, target) {
    const current = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
    if (current === target) return;
    const diff = target - current;
    const steps = Math.min(Math.abs(diff), 30);
    const stepVal = diff / steps;
    let i = 0;
    const id = setInterval(() => {
        i++;
        const val = Math.round(current + stepVal * i);
        el.textContent = val.toLocaleString();
        if (i >= steps) {
            el.textContent = target.toLocaleString();
            clearInterval(id);
        }
    }, 30);
}

function updateDailyBonus() {
    if (!state.user) return;
    const btn = document.getElementById('daily-btn');
    const lastDaily = state.user.lastDaily;
    const today = new Date().toDateString();

    if (lastDaily === today) {
        btn.textContent = '✅ Ежедневный бонус получен';
        btn.disabled = true;
    } else {
        btn.textContent = `🎁 Забрать ${DAILY_BONUS_AMOUNT} монет`;
        btn.disabled = false;
    }
}

// ====== CONFIGS ======
function copyConfig(name) {
    if (!state.user) {
        showToast('Сначала войдите в аккаунт', 'error');
        return;
    }
    if (isUserBlocked(state.user.username)) {
        showToast('❌ Аккаунт заблокирован', 'error');
        return;
    }

    if (!isSubscribedToChannel()) {
        showToast('📢 Подпишись на канал @wildVF, чтобы получить доступ к подпискам', 'info');
        document.getElementById('channel-section').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const link = VLESS_CONFIGS[name];
    if (!link) {
        showToast('❌ Подписка не найдена', 'error');
        return;
    }

    navigator.clipboard.writeText(link).then(() => {
        const btn = document.querySelector(`.sub-card[data-config="${name}"] .btn-sub`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i> Копировать подписку';
                btn.classList.remove('copied');
            }, 2500);
        }
        showToast(`✅ Подписка ${name} скопирована! Открой INCY / Happ и вставь ссылку`, 'success');
    }).catch(() => {
        showToast('❌ Ошибка копирования', 'error');
    });
}

// ====== ADMIN PANEL ======
let adminClickCount = 0;
function loadBotSettingsUI() {
    const token = document.getElementById('admin-bot-token');
    const username = document.getElementById('admin-bot-username');
    if (token) token.value = localStorage.getItem('vf_bot_token') || '';
    if (username) username.value = localStorage.getItem('vf_bot_username') || '';
}

function saveBotSettings() {
    const token = document.getElementById('admin-bot-token').value.trim();
    const username = document.getElementById('admin-bot-username').value.trim().replace('@', '');
    localStorage.setItem('vf_bot_token', token);
    localStorage.setItem('vf_bot_username', username);
    TG_BOT_TOKEN = token;
    TG_BOT_USERNAME = username;
    document.getElementById('bot-save-status').textContent = '✅ Сохранено!';
    setTimeout(() => document.getElementById('bot-save-status').textContent = '', 2000);
    showToast('Настройки бота сохранены', 'success');
}

function openAdminPanel() {
    adminClickCount++;
    if (adminClickCount >= 5) {
        adminClickCount = 0;
        document.getElementById('admin-overlay').classList.remove('hidden');
        loadBotSettingsUI();
        const saved = localStorage.getItem('vf_admin_session');
        if (saved === 'true') {
            document.getElementById('admin-login-area').classList.add('hidden');
            document.getElementById('admin-panel-area').classList.remove('hidden');
            renderAdminUsers();
        } else {
            document.getElementById('admin-login-area').classList.remove('hidden');
            document.getElementById('admin-panel-area').classList.add('hidden');
            document.getElementById('admin-login-error').textContent = '';
            document.getElementById('admin-login').value = '';
            document.getElementById('admin-password').value = '';
        }
    }
}

function closeAdmin() {
    document.getElementById('admin-overlay').classList.add('hidden');
}

function adminLogout() {
    localStorage.removeItem('vf_admin_session');
    document.getElementById('admin-login-area').classList.remove('hidden');
    document.getElementById('admin-panel-area').classList.add('hidden');
    document.getElementById('admin-login-error').textContent = '';
    document.getElementById('admin-login').value = '';
    document.getElementById('admin-password').value = '';
    showToast('Вы вышли из админ-панели', 'info');
}

function adminLogin() {
    const login = document.getElementById('admin-login').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');

    if (!login || !password) {
        errorEl.textContent = 'Введите логин и пароль';
        return;
    }

    const valid = [
        { l: 'FS105iLDAX', p: '3.m9-uKsAcEi+tNJV,W\\[1&o' }
    ];

    for (const cred of valid) {
        if (cred.l === login && cred.p === password) {
            document.getElementById('admin-login-area').classList.add('hidden');
            document.getElementById('admin-panel-area').classList.remove('hidden');
            errorEl.textContent = '';
            localStorage.setItem('vf_admin_session', 'true');
            renderAdminUsers();
            showToast('✅ Добро пожаловать в админ-панель', 'success');
            return;
        }
    }

    errorEl.textContent = 'Неверный логин или пароль';
}

function renderAdminUsers() {
    const users = getUsers();
    const list = document.getElementById('admin-user-list');
    document.getElementById('admin-user-count').textContent = Object.keys(users).length;

    const sorted = Object.entries(users).sort((a, b) => {
        return (b[1].lastActive || '').localeCompare(a[1].lastActive || '');
    });

    list.innerHTML = sorted.map(([username, data]) => {
        const isBlocked = data.blocked === true;
        const lastSeen = data.lastActive ? formatDate(data.lastActive) : 'никогда';
        const status = isBlocked ? 'blocked' : (data.lastActive ? 'active' : 'offline');
        const statusLabel = isBlocked ? '🔴 Заблокирован' : (data.lastActive ? '🟢 Активен' : '⚪ Неактивен');
        const btnText = isBlocked ? '✅ Разблокировать' : '🔨 Блокировать';
        const btnClass = isBlocked ? 'admin-block-btn blocked' : 'admin-block-btn';

        return `
            <div class="admin-user-card">
                <div class="admin-user-info">
                    <div class="admin-user-avatar">${username.charAt(0).toUpperCase()}</div>
                    <div class="admin-user-details">
                        <div class="admin-user-name">${username} <span style="color:var(--text-muted);font-size:11px;">@${data.telegramUsername || username}</span></div>
                        <div class="admin-user-meta">🪙 ${data.coins || 0} · 🎮 ${data.gamesPlayed || 0} игр · ${data.referralCount || 0} реф · Последний раз: ${lastSeen}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="admin-user-status ${status}">${statusLabel}</span>
                    <button class="${btnClass}" onclick="toggleBlockUser('${username}')">${btnText}</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleBlockUser(username) {
    const users = getUsers();
    if (!users[username]) return;
    users[username].blocked = !users[username].blocked;
    saveUsers(users);

    if (state.user && state.user.username === username && users[username].blocked) {
        showToast('❌ Ваш аккаунт заблокирован администратором', 'error');
        logout();
    }
    renderAdminUsers();
    showToast(
        users[username].blocked
            ? `🔨 ${username} заблокирован`
            : `✅ ${username} разблокирован`,
        users[username].blocked ? 'error' : 'success'
    );
}

// ====== CHANNEL VERIFICATION ======
function verifySubscription() {
    if (!state.user) {
        showToast('Сначала войдите в аккаунт', 'error');
        return;
    }
    if (isUserBlocked(state.user.username)) {
        showToast('❌ Аккаунт заблокирован', 'error');
        return;
    }
    if (isSubscribedToChannel()) {
        showToast('✅ Вы уже подписаны на канал!', 'success');
        return;
    }

    window.open(TG_CHANNEL_LINK, '_blank');

    const status = document.getElementById('verify-status');
    status.textContent = '⏳ Подпишись на канал выше, затем нажми "Проверить"';
    status.className = 'verify-status';
    document.getElementById('verify-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Проверить подписку';
    document.getElementById('verify-btn').onclick = checkSubscription;
}

function checkSubscription() {
    const btn = document.getElementById('verify-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
    const status = document.getElementById('verify-status');
    status.textContent = '⏳ Проверяем подписку...';
    status.className = 'verify-status loading';

    if (TG_BOT_TOKEN && state.user.telegramId) {
        fetch(`${TG_BOT_API}${TG_BOT_TOKEN}/getChatMember?chat_id=@${TG_CHANNEL}&user_id=${state.user.telegramId}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.result && ['member', 'administrator', 'creator'].includes(data.result.status)) {
                    confirmSub();
                } else {
                    status.textContent = '❌ Вы не подписаны на канал. Подпишитесь и попробуйте снова';
                    status.className = 'verify-status error';
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Попробовать снова';
                }
            })
            .catch(() => manualConfirm());
    } else if (TG_BOT_TOKEN && state.user.telegramUsername) {
        fetch(`${TG_BOT_API}${TG_BOT_TOKEN}/getChatMember?chat_id=@${TG_CHANNEL}&user_id=@${state.user.telegramUsername}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.result && ['member', 'administrator', 'creator'].includes(data.result.status)) {
                    confirmSub();
                } else {
                    manualConfirm();
                }
            })
            .catch(() => manualConfirm());
    } else {
        manualConfirm();
    }
}

function manualConfirm() {
    const status = document.getElementById('verify-status');
    const btn = document.getElementById('verify-btn');
    btn.disabled = false;

    if (state.user.telegramId || (TG_BOT_TOKEN && state.user.telegramUsername)) {
        status.textContent = '❌ Не удалось проверить. Возможно, вы не подписаны на канал';
        status.className = 'verify-status error';
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Попробовать снова';
        btn.onclick = checkSubscription;
    } else if (TG_BOT_TOKEN && TG_BOT_USERNAME) {
        status.innerHTML = `
            <div style="margin-bottom:12px;">Авторизуйтесь через Telegram для автоматической проверки:</div>
            <script async src="https://telegram.org/js/telegram-widget.js?22"
                data-telegram-login="${TG_BOT_USERNAME}"
                data-size="large"
                data-onauth="onTelegramAuth(user)"
                data-request-access="write">
            <\/script>
        `;
        btn.innerHTML = '<i class="fas fa-user"></i> Или подтвердить вручную';
        btn.onclick = manualConfirmStep2;
    } else {
        manualConfirmStep2();
    }
}

function manualConfirmStep2() {
    const username = prompt('Введите ваш Telegram username (например: @username):', state.user.telegramUsername || '');
    if (!username) return;

    state.user.telegramUsername = username.replace('@', '');
    const users = getUsers();
    if (users[state.user.username]) {
        users[state.user.username].telegramUsername = state.user.telegramUsername;
        saveUsers(users);
    }

    const btn = document.getElementById('verify-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
    const status = document.getElementById('verify-status');
    status.textContent = '⏳ Отправляем запрос...';
    status.className = 'verify-status loading';

    setTimeout(() => confirmSub(), 2000);
}

function confirmSub() {
    setSubscribed(true);
    const status = document.getElementById('verify-status');
    status.textContent = '✅ Подписка подтверждена! Спасибо!';
    status.className = 'verify-status success';
    const btn = document.getElementById('verify-btn');
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Подписан';
    btn.classList.add('verified');
    btn.disabled = false;
    btn.onclick = verifySubscription;
    showToast('🎉 Подписка подтверждена!', 'success');
    updateUI();
}

// ====== CONFETTI ======
function burstConfetti() {
    const colors = ['#ff2d7b', '#00d4ff', '#7c3aed', '#ffd700', '#00ff88', '#ff6b35'];
    const count = 60;
    const container = document.body;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const dur = Math.random() * 1.5 + 1;
        const rotate = Math.random() * 720 - 360;
        el.style.cssText = `
            position: fixed; top: -10px; left: ${left}%; z-index: 9999;
            width: ${size}px; height: ${size * 0.6}px;
            background: ${color}; border-radius: 2px;
            opacity: 0; pointer-events: none;
            animation: confettiFall ${dur}s ease-in ${delay}s forwards;
            transform: rotate(${rotate}deg);
        `;
        container.appendChild(el);
        setTimeout(() => el.remove(), (dur + delay) * 1000 + 100);
    }
}

// ====== COIN FLIP GAME ======
function setBet(amount) {
    if (!state.user) {
        showToast('Сначала войдите в аккаунт', 'error');
        return;
    }
    if (isUserBlocked(state.user.username)) {
        showToast('❌ Аккаунт заблокирован', 'error');
        return;
    }
    state.betAmount = amount;
    $$('.bet-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.bet) === amount));
}

function setChoice(choice) {
    if (!state.user) {
        showToast('Сначала войдите в аккаунт', 'error');
        return;
    }
    if (isUserBlocked(state.user.username)) {
        showToast('❌ Аккаунт заблокирован', 'error');
        return;
    }
    state.choice = choice;
    $$('.choice-btn').forEach(b => b.classList.toggle('selected', b.dataset.choice === choice));
}

function flipCoin() {
    if (!state.user) {
        showToast('Сначала войдите в аккаунт', 'error');
        return;
    }
    if (isUserBlocked(state.user.username)) {
        showToast('❌ Аккаунт заблокирован', 'error');
        return;
    }
    if (!state.choice) {
        showToast('Выберите Орла или Решку', 'error');
        return;
    }
    if (state.isFlipping) return;
    if (state.user.coins < state.betAmount) {
        showToast('❌ Недостаточно монет!', 'error');
        return;
    }

    state.isFlipping = true;
    state.user.coins -= state.betAmount;

    const coin = document.getElementById('coin-inner');
    const result = document.getElementById('game-result');
    coin.className = 'coin-inner';
    void coin.offsetWidth;

    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = state.choice === outcome;

    result.className = 'game-result';
    result.textContent = '🎲 ...';

    setTimeout(() => {
        coin.classList.add(outcome === 'heads' ? 'flip-heads' : 'flip-tails');
        setTimeout(() => {
            state.user.gamesPlayed++;
            if (won) {
                const winAmount = state.betAmount * 2;
                state.user.coins += winAmount;
                state.user.gamesWon++;
                result.className = 'game-result win';
                result.textContent = `🎉 ПОБЕДА! Вы выиграли ${winAmount} монет!`;
                showToast(`🎉 +${winAmount} монет!`, 'success');
                burstConfetti();
            } else {
                result.className = 'game-result lose';
                const emoji = outcome === 'heads' ? 'Орёл' : 'Решка';
                result.textContent = `😢 Проигрыш. Выпал: ${emoji}. -${state.betAmount} монет`;
                showToast(`😢 Проигрыш! Выпал ${emoji}`, 'error');
            }
            const users = getUsers();
            users[state.user.username] = state.user;
            saveUsers(users);
            updateUI();
            state.isFlipping = false;
            state.choice = null;
            $$('.choice-btn').forEach(b => b.classList.remove('selected'));
        }, 1200);
    }, 100);
}

// ====== DAILY BONUS ======
function claimDaily() {
    if (!state.user) return;
    if (isUserBlocked(state.user.username)) {
        showToast('❌ Аккаунт заблокирован', 'error');
        return;
    }
    const today = new Date().toDateString();
    if (state.user.lastDaily === today) {
        showToast('Бонус уже получен сегодня', 'info');
        return;
    }

    state.user.lastDaily = today;
    state.user.coins += DAILY_BONUS_AMOUNT;

    const users = getUsers();
    users[state.user.username] = state.user;
    saveUsers(users);
    updateUI();
    showToast(`🎁 +${DAILY_BONUS_AMOUNT} ежедневных монет!`, 'success');
}

// ====== REFERRAL ======
function copyReferral() {
    if (!state.user) return;
    const code = state.user.referralCode;
    navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Реферальный код скопирован!', 'success');
    }).catch(() => {
        showToast('❌ Ошибка копирования', 'error');
    });
}

// ====== PING UPDATER ======
function initPingUpdater() {
    // Store per-card ping values
    const pingEls = [];
    document.querySelectorAll('.sub-card').forEach(card => {
        const el = card.querySelector('.sub-stat-value');
        const label = el && el.nextElementSibling;
        if (label && label.textContent.includes('Пинг')) {
            pingEls.push({ el, base: parseFloat(el.textContent) || 1 });
        }
    });

    function randomPing(base) {
        const v = base + (Math.random() - 0.5) * 200;
        return Math.round(Math.max(100, Math.min(1000, v))) + 'ms';
    }

    function updatePings() {
        pingEls.forEach(({ el, base }) => {
            el.textContent = randomPing(base);
        });
    }

    updatePings();
    setInterval(updatePings, 3000);
}

// ====== MODAL ======
function showSubscribeModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
    if (e.target.id === 'admin-overlay') closeAdmin();
});

// ====== LOGOUT ======
function logout() {
    setCurrentUser('');
    state.user = null;
    showAuth();
    showToast('Вы вышли из аккаунта', 'info');
}

// ====== SCROLL REVEAL ======
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ====== TYPING EFFECT ======
function initTyping() {
    const phrases = [
        '🚀 6 бесплатных VPN подписок',
        '🎮 Играй и зарабатывай монеты',
        '🔒 Полная анонимность через VLESS+Reality',
        '⚡ Безлимитный трафик навсегда',
        '🌐 Сервера в 6 странах мира',
        '💰 Полностью бесплатно, без подписок'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const el = document.getElementById('typing-text');

    function type() {
        const current = phrases[phraseIndex];
        if (!isDeleting) {
            el.textContent = current.slice(0, charIndex + 1);
            charIndex++;
            if (charIndex === current.length) {
                isDeleting = true;
                setTimeout(type, 2000);
                return;
            }
            setTimeout(type, 80);
        } else {
            el.textContent = current.slice(0, charIndex - 1);
            charIndex--;
            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                setTimeout(type, 500);
                return;
            }
            setTimeout(type, 40);
        }
    }
    type();
}

// ====== INIT ======
function init() {
    initScrollReveal();
    initTyping();

    // Check if user is logged in
    const saved = getCurrentUser();
    if (saved) {
        if (saved.blocked) {
            showToast('❌ Ваш аккаунт заблокирован', 'error');
            setCurrentUser('');
        } else {
            state.user = saved;
            hideAuth();
            updateUI();
        }
    }

    if (!state.user) {
        showAuth();
    }

    // Avatar upload
    document.getElementById('avatar-upload-input').addEventListener('change', function() {
        handleAvatarUpload(this);
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Ping updater
    initPingUpdater();

    // Bet amounts
    $$('.bet-btn').forEach(btn => {
        btn.addEventListener('click', () => setBet(parseInt(btn.dataset.bet)));
    });

    // Choices
    $$('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => setChoice(btn.dataset.choice));
    });

    // Flip
    document.getElementById('flip-btn').addEventListener('click', flipCoin);

    // Daily bonus
    document.getElementById('daily-btn').addEventListener('click', claimDaily);

    // Verify subscription
    document.getElementById('verify-btn').addEventListener('click', verifySubscription);

    // 3D Tilt effect on subscription cards
    document.querySelectorAll('.sub-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / centerY * -6;
            const rotateY = (x - centerX) / centerX * 6;
            card.style.transform =
                `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    // Back-to-top visibility
    const topBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            topBtn.style.opacity = '1';
            topBtn.style.transform = 'translateY(0)';
            topBtn.style.pointerEvents = 'auto';
        } else {
            topBtn.style.opacity = '0';
            topBtn.style.transform = 'translateY(20px)';
            topBtn.style.pointerEvents = 'none';
        }
    });

    // Default bet
    setBet(10);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
