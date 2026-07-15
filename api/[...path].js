const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'wvfrobot';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const API_KEY = process.env.API_KEY;

async function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

async function kvGet(key) {
    const r = await fetch(`${UPSTASH_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await r.json();
    return data.result;
}

async function kvSet(key, value) {
    await fetch(`${UPSTASH_URL}/set/${key}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
    });
}

async function kvGetJson(key) {
    const val = await kvGet(key);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return null; }
}

function setCors(res, origin) {
    const allowed = origin || '*';
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, data, status = 200) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(data);
}

export default async function handler(req, res) {
    setCors(res, req.headers.origin);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const pathname = '/' + (req.query.path || []).join('/');

    console.log('VF_HANDLER pathname:', pathname, 'query:', JSON.stringify(req.query), 'url:', req.url);

    try {
        if (pathname === '/' || pathname === '/status') {
            console.log('VF_HANDLER: returning root/status response');
            return json(res, { ok: true, message: 'VF API работает' });
        }

        if (pathname === '/admin/login' && req.method === 'POST') {
            const body = await parseBody(req);
            const ok = body.login === ADMIN_LOGIN && body.password === ADMIN_PASSWORD;
            return json(res, { ok });
        }

        if (pathname === '/config' && req.method === 'GET') {
            console.log('VF_HANDLER: returning config response, BOT_USERNAME:', BOT_USERNAME);
            return json(res, { ok: true, botUsername: BOT_USERNAME, pathname, env: !!BOT_USERNAME });
        }

        if (pathname === '/user/get' && req.method === 'POST') {
            const body = await parseBody(req);
            if (body.apiKey !== API_KEY) {
                return json(res, { ok: false, error: 'forbidden' }, 403);
            }
            const raw = await kvGet('user:' + body.username);
            return json(res, { ok: true, user: raw ? JSON.parse(raw) : null });
        }

        if (pathname === '/user/sync' && req.method === 'POST') {
            const body = await parseBody(req);
            if (body.apiKey !== API_KEY) {
                return json(res, { ok: false, error: 'forbidden' }, 403);
            }
            const { username, data } = body;
            if (!username || !data) {
                return json(res, { ok: false, error: 'missing data' }, 400);
            }
            await kvSet('user:' + username, JSON.stringify(data));
            const list = (await kvGetJson('users:list')) || [];
            if (!list.includes(username)) {
                list.push(username);
                await kvSet('users:list', JSON.stringify(list));
            }
            return json(res, { ok: true });
        }

        if (pathname === '/users/list' && req.method === 'POST') {
            const body = await parseBody(req);
            if (body.login !== ADMIN_LOGIN || body.password !== ADMIN_PASSWORD) {
                return json(res, { ok: false, error: 'unauthorized' }, 403);
            }
            const list = (await kvGetJson('users:list')) || [];
            const users = {};
            for (const name of list) {
                const raw = await kvGet('user:' + name);
                if (raw) users[name] = JSON.parse(raw);
            }
            return json(res, { ok: true, users });
        }

        if (pathname === '/user/block' && req.method === 'POST') {
            const body = await parseBody(req);
            if (body.login !== ADMIN_LOGIN || body.password !== ADMIN_PASSWORD) {
                return json(res, { ok: false, error: 'unauthorized' }, 403);
            }
            const { username, blocked } = body;
            if (!username) {
                return json(res, { ok: false, error: 'missing username' }, 400);
            }
            const raw = await kvGet('user:' + username);
            if (!raw) {
                return json(res, { ok: false, error: 'user not found' }, 404);
            }
            const userData = JSON.parse(raw);
            userData.blocked = blocked;
            await kvSet('user:' + username, JSON.stringify(userData));
            return json(res, { ok: true });
        }

        if (pathname === '/check-subscription' && req.method === 'POST') {
            const body = await parseBody(req);
            if (body.apiKey !== API_KEY) {
                return json(res, { ok: false, error: 'forbidden' }, 403);
            }
            const { userId, channel } = body;
            if (!userId || !channel) {
                return json(res, { ok: false, error: 'missing params' }, 400);
            }
            const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`;
            const response = await fetch(tgUrl);
            const data = await response.json();
            return json(res, data, response.status);
        }

        console.log('VF_HANDLER: falling through to default, pathname:', pathname);
        return json(res, { ok: true, message: 'VF API работает', pathname, query: req.query });
    } catch (e) {
        console.log('VF_HANDLER: ERROR:', e.message, e.stack);
        return json(res, { ok: false, error: e.message }, 500);
    }
}
