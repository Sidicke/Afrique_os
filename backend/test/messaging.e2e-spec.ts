import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import request from 'supertest';

/**
 * Messagerie (e2e) — vérifie :
 * 1. La persistance des messages (REST GET /conversations/:id/messages)
 * 2. La diffusion temps réel via WebSocket (Socket.IO)
 * 3. Le contrôle d'accès par conversation
 */
describe('Messagerie (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const unique = Date.now();
  let boutiqueId: string;
  let clientToken: string;
  let sellerToken: string;
  let conversationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.listen(0); // port éphémère pour tester le WebSocket
    server = app.getHttpServer();

    boutiqueId = (
      await request(server).get('/api/v1/boutiques/public/aziz-tech').expect(200)
    ).body.id;

    // Vendeur (boutique aziz-tech)
    sellerToken = (
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'vendeur@aziztech.com', password: 'vendeur1234' })
    ).body.accessToken as string;

    // Client connecté (rôle CLIENT, pas de boutique)
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Client Messagerie',
        role: 'CLIENT',
        email: `client-msg-${unique}@test.com`,
        password: 'password123',
      })
      .expect(201);
    clientToken = (
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: `client-msg-${unique}@test.com`, password: 'password123' })
    ).body.accessToken as string;

    // Le client ouvre une conversation avec la boutique
    const conv = await request(server)
      .post(`/api/v1/conversations/start/${boutiqueId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        clientName: 'Client Messagerie',
        clientPhone: '+2250700000099',
        firstMessage: 'Bonjour, le Smartphone Pro est-il disponible ?',
      })
      .expect(201);
    conversationId = conv.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('persiste le premier message (accessible en REST)', async () => {
    const res = await request(server)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].content).toContain('Bonjour');
    expect(res.body[0].senderRole).toBe('CLIENT');
  });

  it('le vendeur voit la conversation dans sa liste', async () => {
    const res = await request(server)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(conversationId);
  });

  it('envoie un message en REST (persistance garantie)', async () => {
    const res = await request(server)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ content: 'Oui, disponible à 350 000 FCFA.' })
      .expect(201);
    expect(res.body.message.senderRole).toBe('VENDEUR');

    const history = await request(server)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(history.body.length).toBe(2);
  });

  it('contrôle d’accès : un autre client ne peut pas lire la conversation → 403', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Intrus Msg',
        role: 'CLIENT',
        email: `intrus-msg-${unique}@test.com`,
        password: 'password123',
      })
      .expect(201);
    const intruderToken = (
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: `intrus-msg-${unique}@test.com`, password: 'password123' })
    ).body.accessToken as string;

    await request(server)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);
  });

  it('WebSocket : diffusion temps réel et persistance (sans Redis)', async () => {
    const address = app.getHttpServer().address() as { port: number };
    const port = address.port;

    // Deux sockets : le vendeur (récepteur) et le client (émetteur)
    const sellerSocket: Socket = io(`http://localhost:${port}/messaging`, {
      auth: { token: sellerToken },
      transports: ['websocket'],
      reconnection: false,
    });
    const clientSocket: Socket = io(`http://localhost:${port}/messaging`, {
      auth: { token: clientToken },
      transports: ['websocket'],
      reconnection: false,
    });

    const received = new Promise<{ conversationId: string; content: string }>(
      (resolve) => {
        sellerSocket.on('newMessage', (payload: { conversationId: string; message: { content: string } }) => {
          resolve({
            conversationId: payload.conversationId,
            content: payload.message.content,
          });
        });
      },
    );

    await new Promise<void>((resolve) => sellerSocket.on('connect', () => resolve()));
    await new Promise<void>((resolve) => clientSocket.on('connect', () => resolve()));

    // Les deux rejoignent la conversation
    sellerSocket.emit('joinConversation', { conversationId });
    clientSocket.emit('joinConversation', { conversationId });
    await new Promise((r) => setTimeout(r, 300));

    // Le client envoie un message temps réel
    clientSocket.emit('sendMessage', {
      conversationId,
      content: 'Message en temps réel via WebSocket',
    });

    const delivered = await Promise.race([
      received,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout : message non reçu via WebSocket')), 5000),
      ),
    ]);
    expect(delivered.conversationId).toBe(conversationId);
    expect(delivered.content).toBe('Message en temps réel via WebSocket');

    // Le message est persisté en base (accessible en REST)
    const history = await request(server)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(history.body.some((m: { content: string }) => m.content === delivered.content)).toBe(true);

    sellerSocket.close();
    clientSocket.close();
  });

  it('WebSocket : un socket sans token est refusé au handshake', async () => {
    const address = app.getHttpServer().address() as { port: number };
    const port = address.port;

    const anonSocket: Socket = io(`http://localhost:${port}/messaging`, {
      transports: ['websocket'],
      reconnection: false,
    });

    const rejected = new Promise<void>((resolve, reject) => {
      anonSocket.on('connect', () =>
        reject(new Error('Socket non authentifié connecté (bug sécurité)')),
      );
      anonSocket.on('connect_error', () => resolve());
      setTimeout(() => reject(new Error('Timeout : pas de rejet au handshake')), 5000);
    });

    await rejected;
    anonSocket.close();
  });
});
