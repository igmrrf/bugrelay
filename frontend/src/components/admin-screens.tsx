"use client";
import { useState } from "react";
import Link from "next/link";
import type { Bug, CompanyClaimReview, Page } from "@bugrelay/contracts";
import { send } from "@/lib/api";
import { RequireAuth, useSession } from "./session";
import {
  Feedback,
  Field,
  Loading,
  PageTitle,
  Pager,
  formValues,
  useAction,
  useResource,
} from "./common";
interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
}
interface Moderation {
  id: string;
  bugId: string;
  commentId: string | null;
  commentContent: string | null;
  reason: string;
  title: string;
  status: string;
  createdAt: string;
}
interface Audit {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}
export function AdminScreen({
  tab = "overview",
}: {
  tab?: "overview" | "moderation" | "audit" | "duplicates" | "claims";
}) {
  const { user, refresh } = useSession(),
    allowed = !!user?.isAdmin,
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    action = useAction();
  const claims = useResource<Page<CompanyClaimReview>>(
    allowed && tab === "claims" ? `/admin/company-claims?page=${page}` : null,
  );
  const stats = useResource<Record<string, number>>(
      allowed && tab === "overview" ? "/admin/stats" : null,
    ),
    users = useResource<Page<AdminUser>>(
      allowed && tab === "overview"
        ? `/admin/users?page=${page}&q=${encodeURIComponent(search)}`
        : null,
    ),
    moderation = useResource<Page<Moderation>>(
      allowed && tab === "moderation" ? `/admin/moderation?page=${page}` : null,
    ),
    deleted = useResource<
      Page<{ id: string; title: string; visibility: string; deletedAt: string }>
    >(
      allowed && tab === "moderation"
        ? `/admin/bugs/deleted?page=${page}`
        : null,
    ),
    audit = useResource<Page<Audit>>(
      allowed && tab === "audit" ? `/admin/audit-logs?page=${page}` : null,
    ),
    bugs = useResource<Page<Bug>>(
      allowed && tab === "duplicates"
        ? `/bugs?q=${encodeURIComponent(search)}&page=${page}`
        : null,
    );
  return (
    <RequireAuth admin>
      <PageTitle
        eyebrow="Platform administration"
        title={
          tab === "overview"
            ? "Admin dashboard"
            : tab === "audit"
              ? "Audit log"
              : tab === "duplicates"
                ? "Merge duplicate reports"
                : tab === "claims"
                  ? "Company claims"
                  : "Moderation queue"
        }
      />
      <nav className="toolbar">
        <Link href="/admin">Overview & users</Link>
        <Link href="/admin/moderation">Moderation</Link>
        <Link href="/admin/duplicates">Duplicates</Link>
        <Link href="/admin/audit">Audit log</Link>
        <Link href="/admin/company-claims">Company claims</Link>
      </nav>
      <Feedback {...action} />
      {tab === "claims" && (
        <>
          <p className="notice">
            A matching email address proves mailbox access only. Before
            approval, independently verify domain control and the applicant’s
            authority using a domain administrator’s DNS or website challenge.
            Record the evidence without secrets. Do not approve solely from
            email or a public-email-provider classification. You cannot review
            your own claim.
          </p>
          <Loading {...claims} />
          <div className="stack">
            {claims.data?.items.map((claim) => (
              <form
                className="card wide-form"
                key={claim.id}
                onSubmit={(event) => {
                  const values = formValues(event);
                  void action.run(async () => {
                    const result = await send<{ message: string }>(
                      `/admin/company-claims/${claim.id}/review`,
                      {
                        decision: String(values.get("decision")),
                        evidence: String(values.get("evidence")),
                        domainControlVerified:
                          values.get("domainControlVerified") === "on",
                      },
                    );
                    claims.reload();
                    action.setMessage(result.message);
                  });
                }}
              >
                <h2>{claim.companyName}</h2>
                <p>
                  {claim.companyDomain} · {claim.email}
                </p>
                <Field label="Review decision">
                  <select name="decision" defaultValue="rejected">
                    <option value="rejected">Reject</option>
                    <option value="approved">Approve</option>
                  </select>
                </Field>
                <Field
                  label="Review evidence"
                  hint="Record the independent check, when it was performed, and who authorized the representative. Do not include secrets."
                >
                  <textarea
                    name="evidence"
                    required
                    minLength={20}
                    maxLength={2000}
                  />
                </Field>
                <label>
                  <input name="domainControlVerified" type="checkbox" /> I
                  independently verified domain control and this applicant’s
                  authority.
                </label>
                <button
                  className="primary"
                  disabled={action.busy || claim.userId === user?.id}
                >
                  Record review
                </button>
              </form>
            ))}
          </div>
          {claims.data?.items.length === 0 && (
            <p className="empty">No pending company claims.</p>
          )}
          {claims.data && <Pager data={claims.data} onPage={setPage} />}
        </>
      )}
      {tab === "overview" && (
        <>
          <Loading {...stats} />
          {stats.data && (
            <div className="grid">
              {Object.entries(stats.data).map(([key, n]) => (
                <div className="card" key={key}>
                  <small className="muted">
                    {key.replace(/([A-Z])/g, " $1")}
                  </small>
                  <span className="stat">{n}</span>
                </div>
              ))}
            </div>
          )}
          <h2 className="toolbar">User management</h2>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
              setPage(1);
            }}
          >
            <input
              aria-label="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Email or display name"
            />
            <button>Search</button>
          </form>
          <Loading {...users} />
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.displayName}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.isSuspended
                        ? "Suspended"
                        : u.isAdmin
                          ? "Administrator"
                          : u.isEmailVerified
                            ? "Verified"
                            : "Unverified"}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="small"
                          disabled={action.busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Change administrator access for ${u.email}?`,
                              )
                            )
                              void action.run(async () => {
                                await send(
                                  `/admin/users/${u.id}/role`,
                                  { isAdmin: !u.isAdmin },
                                  "PATCH",
                                );
                                await refresh();
                                users.reload();
                              });
                          }}
                        >
                          {u.isAdmin ? "Remove admin" : "Make admin"}
                        </button>
                        <button
                          className="small danger"
                          disabled={action.busy || u.id === user?.id}
                          onClick={() => {
                            if (
                              window.confirm(
                                `${u.isSuspended ? "Restore" : "Suspend"} ${u.email}?`,
                              )
                            )
                              void action.run(async () => {
                                await send(
                                  `/admin/users/${u.id}/${u.isSuspended ? "unsuspend" : "suspend"}`,
                                );
                                users.reload();
                              });
                          }}
                        >
                          {u.isSuspended ? "Restore" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.data && <Pager data={users.data} onPage={setPage} />}
        </>
      )}
      {tab === "moderation" && (
        <>
          <Loading {...moderation} />
          <div className="stack">
            {moderation.data?.items.map((m) => (
              <article className="card" key={m.id}>
                <h2>
                  <Link href={`/bugs/${m.bugId}`}>{m.title}</Link>
                </h2>
                {m.commentId && (
                  <>
                    <strong>Flagged comment</strong>
                    <blockquote className="prose">
                      {m.commentContent || "[Deleted comment]"}
                    </blockquote>
                  </>
                )}
                <p className="prose">{m.reason}</p>
                <div className="row">
                  {(["approve", "reject", "delete"] as const).map((choice) => (
                    <button
                      key={choice}
                      disabled={action.busy}
                      className={choice === "delete" ? "danger" : ""}
                      onClick={() => {
                        if (
                          choice === "delete" &&
                          !window.confirm(
                            m.commentId
                              ? "Delete this comment? The report and replies remain."
                              : "Delete this report from public and private access?",
                          )
                        )
                          return;
                        void action.run(async () => {
                          await send(`/admin/moderation/${m.id}`, {
                            action: choice,
                          });
                          moderation.reload();
                          deleted.reload();
                        });
                      }}
                    >
                      {choice === "approve"
                        ? "Mark reviewed"
                        : choice === "reject"
                          ? "Dismiss flag"
                          : m.commentId
                            ? "Delete comment"
                            : "Delete report"}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {moderation.data && !moderation.data.items.length && (
              <p className="empty">No pending reports.</p>
            )}
            {moderation.data && (
              <Pager data={moderation.data} onPage={setPage} />
            )}
            <h2>Recently deleted reports</h2>
            <p className="muted">
              Restore within 30 days. Original visibility and ownership are
              preserved. Merged reports cannot be restored.
            </p>
            <Loading {...deleted} />
            {deleted.data?.items.map((b) => (
              <article className="card" key={b.id}>
                <h3>{b.title}</h3>
                <p>
                  {b.visibility} · deleted{" "}
                  {new Date(b.deletedAt).toLocaleDateString()}
                </p>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await send(`/admin/bugs/${b.id}/restore`, {});
                      deleted.reload();
                      action.setMessage("Report restored.");
                    })
                  }
                >
                  Restore report
                </button>
              </article>
            ))}
            {deleted.data && <Pager data={deleted.data} onPage={setPage} />}
          </div>
        </>
      )}
      {tab === "audit" && (
        <>
          <div className="row toolbar">
            <a
              className="button"
              href="/api/v1/admin/export/audit-logs?format=csv"
            >
              Download CSV (latest 10,000)
            </a>
            <a
              className="button"
              href="/api/v1/admin/export/audit-logs?format=json"
            >
              Download JSON
            </a>
          </div>
          <Loading {...audit} />
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                </tr>
              </thead>
              <tbody>
                {audit.data?.items.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>{a.action}</td>
                    <td>{a.actorId}</td>
                    <td>
                      {a.entityType}: {a.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {audit.data && <Pager data={audit.data} onPage={setPage} />}
        </>
      )}
      {tab === "duplicates" && (
        <>
          <p className="notice">
            Merge only reports with the same visibility and company. Private
            reports must also have the same reporter. Votes, comments and
            attachments move to the primary report; duplicate reports become
            inaccessible.
          </p>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
              setPage(1);
            }}
          >
            <input
              aria-label="Search duplicate reports"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find related reports"
            />
            <button>Search</button>
          </form>
          <Loading {...bugs} />
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Visibility</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {bugs.data?.items.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/bugs/${b.id}`}>{b.title}</Link>
                    </td>
                    <td>{b.visibility}</td>
                    <td>
                      <code>{b.id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bugs.data && <Pager data={bugs.data} onPage={setPage} />}
          <form
            className="card wide-form toolbar"
            onSubmit={(e) => {
              const v = formValues(e);
              if (
                !window.confirm(
                  "Merge these reports? This action cannot be reversed from the dashboard.",
                )
              )
                return;
              void action.run(async () => {
                const result = await send<Bug>("/admin/bugs/merge", {
                  primaryBugId: String(v.get("primary")),
                  duplicateBugIds: String(v.get("duplicates"))
                    .split(/[\s,]+/)
                    .filter(Boolean),
                });
                bugs.reload();
                action.setMessage(`Reports merged into “${result.title}”.`);
              });
            }}
          >
            <Field label="Primary report ID">
              <input name="primary" required />
            </Field>
            <Field
              label="Duplicate report IDs"
              hint="Separate IDs with commas or new lines."
            >
              <textarea name="duplicates" required />
            </Field>
            <button className="primary" disabled={action.busy}>
              Merge reports
            </button>
          </form>
        </>
      )}
    </RequireAuth>
  );
}
