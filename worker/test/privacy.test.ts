import { beforeEach, expect, test } from "vitest";
import {
  bindings,
  bug,
  company,
  request,
  setup,
  upload,
  user,
} from "./helpers";
import { id, now, stmt } from "../src/core";
beforeEach(setup);
test("company counts, lists, filters, duplicate suggestions and analytics enforce cross-company ACL", async () => {
  const reporter = await user(),
    a = await user("a@alpha.example"),
    b = await user("b@beta.example");
  const alpha = await company(a, "alpha.example"),
    beta = await company(b, "beta.example");
  const secret = await bug(reporter.cookie, {
    category: "security",
    companyId: alpha,
    title: "Sensitive unusual failure",
    tags: ["hidden"],
  });
  await bug(reporter.cookie, {
    companyId: alpha,
    title: "Ordinary public failure",
  });
  await bug(reporter.cookie, {
    category: "security",
    companyId: beta,
    title: "Beta private failure",
  });
  for (const cookie of [undefined, b.cookie]) {
    const details = (await (
      await request(`/companies/${alpha}`, "GET", undefined, cookie)
    ).json()) as { bugCount: number };
    expect(details.bugCount).toBe(1);
    const list = (await (
      await request("/companies", "GET", undefined, cookie)
    ).json()) as { items: { id: string; bugCount: number }[] };
    expect(list.items.find((c) => c.id === alpha)?.bugCount).toBe(1);
    for (const path of [
      `/bugs?companyId=${alpha}`,
      `/companies/${alpha}/bugs`,
    ]) {
      const results = (await (
        await request(path, "GET", undefined, cookie)
      ).json()) as { total: number; items: { id: string }[] };
      expect(results.total).toBe(1);
      expect(results.items.some((i) => i.id === secret.id)).toBe(false);
    }
    expect(
      await (
        await request("/bugs?q=Sensitive&tag=hidden", "GET", undefined, cookie)
      ).json(),
    ).toMatchObject({ total: 0, items: [] });
    expect(
      await (
        await request(
          "/bugs/search-duplicates",
          "POST",
          { query: "Sensitive unusual", companyId: alpha },
          cookie,
        )
      ).json(),
    ).toEqual({ duplicates: [] });
    expect(
      (await request(`/companies/${alpha}/analytics`, "GET", undefined, cookie))
        .status,
    ).toBe(cookie ? 403 : 401);
  }
  expect(
    await (
      await request(`/companies/${alpha}/analytics`, "GET", undefined, a.cookie)
    ).json(),
  ).toMatchObject({ totalBugs: 2 });
  expect(
    await (
      await request(`/companies/${alpha}`, "GET", undefined, a.cookie)
    ).json(),
  ).toMatchObject({ bugCount: 2 });
  await stmt(
    bindings,
    "UPDATE companies SET is_verified=0 WHERE id=?",
    alpha,
  ).run();
  expect(
    (await request(`/bugs/${secret.id}`, "GET", undefined, a.cookie)).status,
  ).toBe(404);
  expect(
    (await request(`/companies/${alpha}/claim`, "POST", {}, a.cookie)).status,
  ).toBe(409);
});
test("cross-company mutations and child-ID substitution cannot change protected data", async () => {
  const owner = await user(),
    a = await user("a@alpha.example"),
    b = await user("b@beta.example");
  const alpha = await company(a, "alpha.example");
  await company(b, "beta.example");
  const secret = await bug(owner.cookie, {
    visibility: "private",
    companyId: alpha,
  });
  const publicBug = await bug(owner.cookie);
  const cm = (await (
    await request(
      `/bugs/${secret.id}/comments`,
      "POST",
      { content: "A restricted comment" },
      a.cookie,
    )
  ).json()) as { id: string };
  const file = (await (
    await request(
      `/bugs/${secret.id}/attachments`,
      "POST",
      upload(),
      owner.cookie,
    )
  ).json()) as { id: string };
  for (const [path, method, data] of [
    [`/bugs/${secret.id}/status`, "PATCH", { status: "resolved" }],
    [`/bugs/${secret.id}`, "PATCH", { title: "Unauthorized change" }],
    [`/bugs/${secret.id}`, "DELETE", undefined],
    [`/bugs/${secret.id}/comments/${cm.id}`, "DELETE", undefined],
    [`/bugs/${secret.id}/attachments/${file.id}`, "DELETE", undefined],
    [
      `/companies/${alpha}/settings`,
      "PATCH",
      { name: "Taken over", description: "" },
    ],
    [`/companies/${alpha}/members`, "POST", { email: "b@beta.example" }],
  ] as const) {
    expect([403, 404]).toContain(
      (await request(path, method, data, b.cookie)).status,
    );
  }
  expect(
    (
      await request(
        `/bugs/${publicBug.id}/comments/${cm.id}`,
        "PATCH",
        { content: "Leak" },
        owner.cookie,
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await request(
        `/bugs/${publicBug.id}/attachments/${file.id}`,
        "GET",
        undefined,
        owner.cookie,
      )
    ).status,
  ).toBe(404);
  expect(
    await stmt(bindings, "SELECT status FROM bugs WHERE id=?", secret.id).first(
      "status",
    ),
  ).toBe("open");
  expect(
    await stmt(
      bindings,
      "SELECT content FROM comments WHERE id=?",
      cm.id,
    ).first("content"),
  ).toBe("A restricted comment");
});
test("removed memberships revoke existing cookie access to comments and R2 objects", async () => {
  const owner = await user(),
    admin = await user("owner@alpha.example"),
    member = await user("member@alpha.example");
  const cid = await company(admin, "alpha.example");
  const mid = id();
  await stmt(
    bindings,
    "INSERT INTO company_members(id,company_id,user_id,role,created_at) VALUES(?,?,?,'member',?)",
    mid,
    cid,
    member.id,
    now(),
  ).run();
  const b = await bug(owner.cookie, { category: "security", companyId: cid });
  const file = (await (
    await request(`/bugs/${b.id}/attachments`, "POST", upload(), owner.cookie)
  ).json()) as { id: string };
  expect(
    (
      await request(
        `/bugs/${b.id}/attachments/${file.id}`,
        "GET",
        undefined,
        member.cookie,
      )
    ).status,
  ).toBe(200);
  await request(
    `/companies/${cid}/members/${mid}`,
    "DELETE",
    undefined,
    admin.cookie,
  );
  for (const path of [
    `/bugs/${b.id}/comments`,
    `/bugs/${b.id}/attachments/${file.id}`,
    `/companies/${cid}/members`,
  ])
    expect([403, 404]).toContain(
      (await request(path, "GET", undefined, member.cookie)).status,
    );
  expect(
    (
      await request(
        `/bugs/${b.id}/attachments/${file.id}`,
        "GET",
        undefined,
        owner.cookie,
      )
    ).status,
  ).toBe(200);
});
test("suspended administrators cannot satisfy last active company admin invariants", async () => {
  const owner = await user("owner@acme.example"),
    other = await user("other@acme.example"),
    platform = await user("platform@example.com", true);
  const cid = await company(owner, "acme.example");
  await request(
    `/companies/${cid}/members`,
    "POST",
    { email: "other@acme.example", role: "admin" },
    owner.cookie,
  );
  expect(
    (
      await request(
        `/admin/users/${other.id}/suspend`,
        "POST",
        {},
        platform.cookie,
      )
    ).status,
  ).toBe(200);
  const mid = await stmt(
    bindings,
    "SELECT id FROM company_members WHERE company_id=? AND user_id=?",
    cid,
    owner.id,
  ).first<string>("id");
  expect(
    (
      await request(
        `/companies/${cid}/members/${mid}`,
        "PATCH",
        { role: "member" },
        owner.cookie,
      )
    ).status,
  ).toBe(409);
  expect(
    (
      await request(
        `/companies/${cid}/members/${mid}`,
        "DELETE",
        undefined,
        owner.cookie,
      )
    ).status,
  ).toBe(409);
});
