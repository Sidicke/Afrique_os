/* Smoke test réel de la messagerie WebSocket (port 3000, serveur réel) */
const { io } = require('socket.io-client');

const BASE = 'http://localhost:3000/api/v1';
const WS = 'http://localhost:3000/messaging';

async function post(path, body, token) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
async function get(path, token) {
  const res = await fetch(BASE + path, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: res.status, body: await res.json() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  try {
    // 1. Login vendeur (seed)
    const login = await post('/auth/login', {
      email: 'vendeur@aziztech.com',
      password: 'vendeur1234',
    });
    if (login.status !== 201 && login.status !== 200) {
      throw new Error('Login vendeur échoué : ' + JSON.stringify(login.body));
    }
    const sellerToken = login.body.accessToken;

    // 2. Récupère la boutique aziz-tech
    const shop = await get('/boutiques/public/aziz-tech');
    const boutiqueId = shop.body.id;

    // 3. Login client (seed ou créé)
    let clientLogin = await post('/auth/login', {
      email: 'client-ws-smoke@test.com',
      password: 'password123',
    });
    if (clientLogin.status !== 201 && clientLogin.status !== 200) {
      await post('/auth/register', {
        name: 'Client WS Smoke',
        role: 'CLIENT',
        email: 'client-ws-smoke@test.com',
        password: 'password123',
      });
      clientLogin = await post('/auth/login', {
        email: 'client-ws-smoke@test.com',
        password: 'password123',
      });
    }
    const clientToken = clientLogin.body.accessToken;

    // 4. Le client ouvre une conversation
    const conv = await post(`/conversations/start/${boutiqueId}`, {
      clientName: 'Client WS Smoke',
      clientPhone: '+2250700112233',
      firstMessage: 'Smoke test : bonjour !',
    }, clientToken);
    const conversationId = conv.body.id;

    // 5. WebSocket : le vendeur se connecte et rejoint la conversation
    const sellerSocket = io(WS, {
      auth: { token: sellerToken },
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise((res, rej) => {
      sellerSocket.on('connect', res);
      sellerSocket.on('connect_error', rej);
      setTimeout(() => rej(new Error('Timeout connexion vendeur')), 5000);
    });
    console.log('✅ Vendeur connecté au WebSocket /messaging (auth handshake)');

    sellerSocket.emit('joinConversation', { conversationId });
    await sleep(300);

    // 6. Le client envoie un message temps réel via WebSocket
    const clientSocket = io(WS, {
      auth: { token: clientToken },
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise((res, rej) => {
      clientSocket.on('connect', res);
      clientSocket.on('connect_error', rej);
      setTimeout(() => rej(new Error('Timeout connexion client')), 5000);
    });
    clientSocket.emit('joinConversation', { conversationId });
    await sleep(300);

    const received = new Promise((res, rej) => {
      sellerSocket.on('newMessage', (payload) => res(payload));
      setTimeout(() => rej(new Error('Timeout : message non reçu en temps réel')), 5000);
    });

    clientSocket.emit('sendMessage', {
      conversationId,
      content: 'Message temps réel envoyé via WebSocket (smoke test)',
    });

    const delivered = await received;
    console.log('✅ Message reçu en temps réel par le vendeur :', JSON.stringify(delivered.message));

    // 7. Persistance : le message est en base (REST)
    const history = await get(`/conversations/${conversationId}/messages`, sellerToken);
    const found = history.body.some((m) => m.content === delivered.message.content);
    console.log(found
      ? '✅ Message persisté en base (historique REST OK)'
      : '❌ Message NON retrouvé en base');

    // 8. Contrôle d'accès WS : un socket sans token est REFUSÉ au handshake
    const bad = io(WS, { transports: ['websocket'], reconnection: false });
    let rejected = false;
    bad.on('connect', () => { rejected = false; bad.disconnect(true); });
    bad.on('connect_error', (e) => { rejected = true; console.log('   (détail rejet :', e.message, ')'); });
    await sleep(800);
    console.log(rejected
      ? '✅ Socket sans token rejeté au handshake (connect_error)'
      : '⚠️  Socket sans token non rejeté (BUG)');

    sellerSocket.close();
    clientSocket.close();
    bad.close();
    console.log('\n=== SMOKE TEST MESSAGERIE : OK ===');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ÉCHEC DU SMOKE TEST :', err.message);
    process.exit(1);
  }
})();
