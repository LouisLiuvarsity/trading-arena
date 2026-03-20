import { describe, it, expect } from 'vitest';

/**
 * Tests for the Duel Dashboard API endpoint (/api/public/duel-dashboard).
 * Since the endpoint depends on the full database + competition engine,
 * we test the response shape and inactive state via HTTP.
 */

const API_BASE = 'http://localhost:3000';

describe('Duel Dashboard API', () => {
  describe('GET /api/public/duel-dashboard', () => {
    it('returns valid response shape when no active duel', async () => {
      const res = await fetch(`${API_BASE}/api/public/duel-dashboard`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('active');
      expect(data).toHaveProperty('humanComp');
      expect(data).toHaveProperty('aiComp');
      expect(data).toHaveProperty('humanAvgCurve');
      expect(data).toHaveProperty('aiAvgCurve');
      expect(data).toHaveProperty('curveLabels');
      expect(data).toHaveProperty('humanTop10');
      expect(data).toHaveProperty('aiTop10');
      expect(data).toHaveProperty('chatMessages');
    });

    it('returns inactive state with null comps when no duel pair exists', async () => {
      const res = await fetch(`${API_BASE}/api/public/duel-dashboard`);
      const data = await res.json();

      // When no duel pair is set up, active should be false
      if (!data.active) {
        expect(data.humanComp).toBeNull();
        expect(data.aiComp).toBeNull();
        expect(data.stats).toBeNull();
        expect(data.humanAvgCurve).toEqual([]);
        expect(data.aiAvgCurve).toEqual([]);
        expect(data.humanTop10).toEqual([]);
        expect(data.aiTop10).toEqual([]);
      }
    });

    it('returns arrays for curve data', async () => {
      const res = await fetch(`${API_BASE}/api/public/duel-dashboard`);
      const data = await res.json();

      expect(Array.isArray(data.humanAvgCurve)).toBe(true);
      expect(Array.isArray(data.aiAvgCurve)).toBe(true);
      expect(Array.isArray(data.curveLabels)).toBe(true);
      expect(Array.isArray(data.humanTop10)).toBe(true);
      expect(Array.isArray(data.aiTop10)).toBe(true);
      expect(Array.isArray(data.chatMessages)).toBe(true);
    });
  });

  describe('POST /api/public/duel-chat', () => {
    it('rejects unauthenticated chat messages', async () => {
      const res = await fetch(`${API_BASE}/api/public/duel-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello from test' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects empty message body', async () => {
      const res = await fetch(`${API_BASE}/api/public/duel-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Should be 401 (no auth) or 400 (bad request)
      expect([400, 401]).toContain(res.status);
    });
  });
});
