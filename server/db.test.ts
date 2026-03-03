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
  describe("getHoldWeight", () => {
    it("returns 0.2 for trades under 60 seconds", () => {
      expect(getHoldWeight(0)).toBe(0.2);
      expect(getHoldWeight(30)).toBe(0.2);
      expect(getHoldWeight(59)).toBe(0.2);
    });

    it("returns 0.4 for trades between 60 and 180 seconds", () => {
      expect(getHoldWeight(60)).toBe(0.4);
      expect(getHoldWeight(120)).toBe(0.4);
    });

    it("returns 0.7 for trades between 180 and 600 seconds", () => {
      expect(getHoldWeight(180)).toBe(0.7);
      expect(getHoldWeight(300)).toBe(0.7);
    });

    it("returns 1.0 for trades between 600 and 1800 seconds", () => {
      expect(getHoldWeight(600)).toBe(1.0);
      expect(getHoldWeight(1200)).toBe(1.0);
    });

    it("returns 1.15 for trades between 1800 and 7200 seconds", () => {
      expect(getHoldWeight(1800)).toBe(1.15);
      expect(getHoldWeight(3600)).toBe(1.15);
    });

    it("returns 1.3 for trades over 7200 seconds", () => {
      expect(getHoldWeight(7200)).toBe(1.3);
      expect(getHoldWeight(86400)).toBe(1.3);
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
