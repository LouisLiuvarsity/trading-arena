import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import {
  getHoldWeight,
  getPointsForRank,
  getPrizeForRank,
  getRankTier,
} from "./constants";

// ─── Constants Tests ─────────────────────────────────────────────────────────

describe("constants", () => {
  describe("getHoldWeight (log-sigmoid)", () => {
    it("returns minimum weight for 0 seconds", () => {
      expect(getHoldWeight(0)).toBe(0.5);
    });

    it("returns low weight for very short trades", () => {
      const w30 = getHoldWeight(30);
      expect(w30).toBeGreaterThanOrEqual(0.5);
      expect(w30).toBeLessThan(0.55);
    });

    it("returns midpoint weight around 5 minutes", () => {
      const w300 = getHoldWeight(300);
      expect(w300).toBe(0.8); // midpoint of 0.5 and 1.1
    });

    it("returns near-baseline weight around 10 minutes", () => {
      const w600 = getHoldWeight(600);
      expect(w600).toBeGreaterThanOrEqual(0.90);
      expect(w600).toBeLessThanOrEqual(1.0);
    });

    it("approaches maximum weight for long holds", () => {
      const w7200 = getHoldWeight(7200);
      expect(w7200).toBeGreaterThanOrEqual(1.08);
      expect(w7200).toBeLessThanOrEqual(1.1);
    });

    it("is monotonically increasing", () => {
      const times = [0, 10, 30, 60, 180, 300, 600, 1800, 3600, 7200, 86400];
      for (let i = 1; i < times.length; i++) {
        expect(getHoldWeight(times[i])).toBeGreaterThanOrEqual(getHoldWeight(times[i - 1]));
      }
    });

    it("never exceeds max weight", () => {
      expect(getHoldWeight(86400)).toBeLessThanOrEqual(1.1);
    });
  });

  describe("getPointsForRank", () => {
    it("returns 100 for rank 1", () => {
      expect(getPointsForRank(1)).toBe(100);
    });

    it("returns 70 for rank 2-3", () => {
      expect(getPointsForRank(2)).toBe(70);
      expect(getPointsForRank(3)).toBe(70);
    });

    it("returns 50 for rank 4-10", () => {
      expect(getPointsForRank(4)).toBe(50);
      expect(getPointsForRank(10)).toBe(50);
    });

    it("returns 30 for rank 11-50", () => {
      expect(getPointsForRank(11)).toBe(30);
      expect(getPointsForRank(50)).toBe(30);
    });

    it("returns 0 for rank 301+", () => {
      expect(getPointsForRank(301)).toBe(0);
      expect(getPointsForRank(1000)).toBe(0);
    });
  });

  describe("getPrizeForRank", () => {
    it("returns 55 for rank 1", () => {
      expect(getPrizeForRank(1)).toBe(55);
    });

    it("returns 0 for rank 101+", () => {
      expect(getPrizeForRank(101)).toBe(0);
      expect(getPrizeForRank(500)).toBe(0);
    });
  });

  describe("getRankTier", () => {
    it("returns iron for 0 points", () => {
      expect(getRankTier(0).tier).toBe("iron");
      expect(getRankTier(0).leverage).toBe(1);
    });

    it("returns bronze for 100 points", () => {
      expect(getRankTier(100).tier).toBe("bronze");
      expect(getRankTier(100).leverage).toBe(1.2);
    });

    it("returns diamond for 1500+ points", () => {
      expect(getRankTier(1500).tier).toBe("diamond");
      expect(getRankTier(1500).leverage).toBe(3);
    });
  });
});

// ─── Auth Logout Test (from template) ────────────────────────────────────────

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.me", () => {
  it("returns null when no user is authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("sample-user");
    expect(result?.name).toBe("Sample User");
  });
});
