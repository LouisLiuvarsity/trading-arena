import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerSpectatorRoutes } from './spectator-routes';

function createApp() {
  const app = express();
  app.use(express.json());
  registerSpectatorRoutes(app);
  return app;
}

describe('Spectator Routes', () => {
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    app = createApp();
  });

  describe('POST /api/public/spectator/heartbeat', () => {
    it('returns viewerCount after heartbeat', async () => {
      const res = await request(app)
        .post('/api/public/spectator/heartbeat')
        .send({ competitionId: 1, viewerId: 'viewer-1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('viewerCount');
      expect(res.body.viewerCount).toBeGreaterThanOrEqual(1);
    });

    it('counts multiple unique viewers', async () => {
      // Use a unique competitionId to avoid state leakage from other tests
      await request(app)
        .post('/api/public/spectator/heartbeat')
        .send({ competitionId: 1001, viewerId: 'viewer-a' });

      await request(app)
        .post('/api/public/spectator/heartbeat')
        .send({ competitionId: 1001, viewerId: 'viewer-b' });

      const res = await request(app)
        .post('/api/public/spectator/heartbeat')
        .send({ competitionId: 1001, viewerId: 'viewer-c' });

      expect(res.body.viewerCount).toBe(3);
    });

    it('returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/public/spectator/heartbeat')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/public/spectator/viewers', () => {
    it('returns viewer count for a competition', async () => {
      // First send a heartbeat
      await request(app)
        .post('/api/public/spectator/heartbeat')
        .send({ competitionId: 99, viewerId: 'viewer-x' });

      const res = await request(app)
        .get('/api/public/spectator/viewers?competitionId=99');

      expect(res.status).toBe(200);
      expect(res.body.viewerCount).toBe(1);
    });

    it('returns 0 for unknown competition', async () => {
      const res = await request(app)
        .get('/api/public/spectator/viewers?competitionId=9999');

      expect(res.status).toBe(200);
      expect(res.body.viewerCount).toBe(0);
    });

    it('returns 400 when competitionId is missing', async () => {
      const res = await request(app)
        .get('/api/public/spectator/viewers');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/public/spectator/react', () => {
    it('accepts a valid emoji reaction', async () => {
      const res = await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 1, viewerId: 'viewer-1', emoji: '🔥' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('rejects invalid emoji', async () => {
      const res = await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 1, viewerId: 'viewer-1', emoji: '😀' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid emoji');
    });

    it('rate limits rapid reactions from same viewer', async () => {
      await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 1, viewerId: 'rate-test', emoji: '🔥' });

      const res = await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 1, viewerId: 'rate-test', emoji: '🚀' });

      expect(res.status).toBe(429);
    });

    it('returns 400 when missing fields', async () => {
      const res = await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 1 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/public/spectator/reactions', () => {
    it('returns recent reactions', async () => {
      // Send a reaction first
      await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 2, viewerId: 'viewer-r1', emoji: '🚀' });

      const res = await request(app)
        .get('/api/public/spectator/reactions?competitionId=2');

      expect(res.status).toBe(200);
      expect(res.body.reactions).toBeInstanceOf(Array);
      expect(res.body.reactions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.reactions[0]).toHaveProperty('emoji', '🚀');
      expect(res.body.reactions[0]).toHaveProperty('timestamp');
    });

    it('returns empty array for competition with no reactions', async () => {
      const res = await request(app)
        .get('/api/public/spectator/reactions?competitionId=8888');

      expect(res.status).toBe(200);
      expect(res.body.reactions).toEqual([]);
    });

    it('filters reactions by since parameter', async () => {
      const now = Date.now();

      await request(app)
        .post('/api/public/spectator/react')
        .send({ competitionId: 3, viewerId: 'viewer-s1', emoji: '💰' });

      const res = await request(app)
        .get(`/api/public/spectator/reactions?competitionId=3&since=${now - 1000}`);

      expect(res.status).toBe(200);
      expect(res.body.reactions.length).toBeGreaterThanOrEqual(1);
    });

    it('returns 400 when competitionId is missing', async () => {
      const res = await request(app)
        .get('/api/public/spectator/reactions');

      expect(res.status).toBe(400);
    });
  });
});
