import { beforeEach, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import { bindings, request, setup, tokenFromMail, user } from "./helpers";
import { stmt } from "../src/core";
import type { Env } from "../src/types";

beforeEach(setup);
const oldPassword = "Original testing passphrase";
const newPassword = "Replacement testing passphrase";
function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test.each(["reset", "change", "revoke-all", "suspend", "suspend-restore"])(
  "a login already checking the old credentials cannot issue a session after %s",
  async (action) => {
    const u = await user("racing@example.com", false, oldPassword);
    const admin = await user("admin@example.com", true);
    await request("/auth/forgot-password", "POST", {
      email: "racing@example.com",
    });
    const resetToken = tokenFromMail();
    const verified = barrier(),
      resume = barrier();
    const compare = bcrypt.compare;
    vi.spyOn(bcrypt, "compare").mockImplementationOnce(
      async (password, hash) => {
        const matches = await compare(password, hash);
        verified.release();
        await resume.promise;
        return matches;
      },
    );
    const pending = request("/auth/login", "POST", {
      email: "racing@example.com",
      password: oldPassword,
    });
    await verified.promise;
    try {
      let response: Response;
      if (action === "reset")
        response = await request("/auth/reset-password", "POST", {
          token: resetToken,
          password: newPassword,
        });
      else if (action === "change")
        response = await request(
          "/auth/change-password",
          "POST",
          { currentPassword: oldPassword, password: newPassword },
          u.cookie,
        );
      else if (action === "revoke-all")
        response = await request(
          "/auth/sessions/revoke-all",
          "POST",
          {},
          u.cookie,
        );
      else {
        response = await request(
          `/admin/users/${u.id}/suspend`,
          "POST",
          {},
          admin.cookie,
        );
        expect(response.status).toBe(200);
        if (action === "suspend-restore")
          response = await request(
            `/admin/users/${u.id}/unsuspend`,
            "POST",
            {},
            admin.cookie,
          );
      }
      expect(response.status).toBe(200);
      expect(
        await stmt(
          bindings,
          "SELECT count(*) n FROM sessions WHERE user_id=?",
          u.id,
        ).first("n"),
      ).toBe(0);
    } finally {
      resume.release();
    }
    const stale = await pending;
    expect(stale.status).toBe(401);
    expect(stale.headers.get("set-cookie")).toBeNull();
    expect(
      await stmt(
        bindings,
        "SELECT count(*) n FROM sessions WHERE user_id=?",
        u.id,
      ).first("n"),
    ).toBe(0);
    expect(
      (await request("/auth/profile", "GET", undefined, u.cookie)).status,
    ).toBe(401);
    if (action !== "suspend") {
      const fresh = await request("/auth/login", "POST", {
        email: "racing@example.com",
        password: ["reset", "change"].includes(action)
          ? newPassword
          : oldPassword,
      });
      expect(fresh.status).toBe(200);
      const cookie = fresh.headers.get("set-cookie")!.split(";")[0];
      expect(
        (await request("/auth/profile", "GET", undefined, cookie)).status,
      ).toBe(200);
    }
  },
);

// Hold the actual D1 session write after all reads/proofs have completed.
// Both run (the vulnerable implementation) and first (conditional insertion)
// are intercepted so this test exercises the invariant rather than its syntax.
function pauseSessionWrite(
  entered: ReturnType<typeof barrier>,
  resume: ReturnType<typeof barrier>,
): D1Database {
  function wrap(statement: D1PreparedStatement): D1PreparedStatement {
    return new Proxy(statement, {
      get(target, key) {
        if (key === "bind")
          return (...values: unknown[]) => wrap(target.bind(...values));
        const value = Reflect.get(target, key, target);
        if (key === "run" || key === "first")
          return async (...args: unknown[]) => {
            entered.release();
            await resume.promise;
            return Reflect.apply(value, target, args);
          };
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  return new Proxy(bindings.DB, {
    get(target, key) {
      if (key === "prepare")
        return (sql: string) => {
          const statement = target.prepare(sql);
          return sql.startsWith("INSERT INTO sessions")
            ? wrap(statement)
            : statement;
        };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

test.each(["register", "oauth-new", "oauth-existing"])(
  "%s cannot issue a session when suspension and restoration win the final database race",
  async (flow) => {
    const admin = await user("admin@example.com", true);
    if (flow === "oauth-existing") {
      const existing = await user("race@example.com");
      await stmt(
        bindings,
        "INSERT INTO oauth_accounts(provider,subject,user_id) VALUES('google','race-subject',?)",
        existing.id,
      ).run();
    }
    const entered = barrier(),
      resume = barrier();
    const env: Partial<Env> = {
      DB: pauseSessionWrite(entered, resume),
      GOOGLE_CLIENT_ID: "test-client",
      GOOGLE_CLIENT_SECRET: "test-secret",
    };
    let pending: Promise<Response>;
    if (flow === "register")
      pending = request(
        "/auth/register",
        "POST",
        {
          email: "race@example.com",
          displayName: "Race user",
          password: oldPassword,
        },
        undefined,
        env,
      );
    else {
      const start = await request(
        "/auth/oauth/google",
        "GET",
        undefined,
        undefined,
        env,
      );
      const state = new URL(start.headers.get("location")!).searchParams.get(
        "state",
      );
      const cookie = start.headers.get("set-cookie")!.split(";")[0];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        if (String(input) === "https://oauth2.googleapis.com/token")
          return Response.json({ access_token: "test-provider-token" });
        if (
          String(input) === "https://openidconnect.googleapis.com/v1/userinfo"
        )
          return Response.json({
            sub: "race-subject",
            email: "race@example.com",
            email_verified: true,
            name: "Race user",
          });
        throw new Error("Unexpected provider URL");
      });
      pending = request(
        `/auth/oauth/google/callback?state=${state}&code=code`,
        "GET",
        undefined,
        cookie,
        env,
      );
    }
    await entered.promise;
    const uid = await stmt(
      bindings,
      "SELECT id FROM users WHERE email='race@example.com'",
    ).first<string>("id");
    try {
      expect(
        (await request(`/admin/users/${uid}/suspend`, "POST", {}, admin.cookie))
          .status,
      ).toBe(200);
      expect(
        (
          await request(
            `/admin/users/${uid}/unsuspend`,
            "POST",
            {},
            admin.cookie,
          )
        ).status,
      ).toBe(200);
    } finally {
      resume.release();
    }
    const response = await pending;
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie") ?? "").not.toContain(
      "bugrelay_session=",
    );
    expect(
      await stmt(
        bindings,
        "SELECT count(*) n FROM sessions WHERE user_id=?",
        uid,
      ).first("n"),
    ).toBe(0);
  },
);

test("revocation during password reauthentication cannot authorize a password change", async () => {
  const u = await user("racing@example.com", false, oldPassword);
  const verified = barrier(),
    resume = barrier();
  const compare = bcrypt.compare;
  vi.spyOn(bcrypt, "compare").mockImplementationOnce(async (password, hash) => {
    const matches = await compare(password, hash);
    verified.release();
    await resume.promise;
    return matches;
  });
  const pending = request(
    "/auth/change-password",
    "POST",
    { currentPassword: oldPassword, password: newPassword },
    u.cookie,
  );
  await verified.promise;
  try {
    expect(
      (
        await request(
          `/auth/sessions/${u.sessionId}`,
          "DELETE",
          undefined,
          u.cookie,
        )
      ).status,
    ).toBe(200);
  } finally {
    resume.release();
  }
  expect((await pending).status).toBe(409);
  expect(
    await bcrypt.compare(
      oldPassword,
      (await stmt(
        bindings,
        "SELECT password_hash FROM users WHERE id=?",
        u.id,
      ).first<string>("password_hash"))!,
    ),
  ).toBe(true);
});
