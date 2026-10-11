"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Bug, Company, CompanyMember, Page } from "@bugrelay/contracts";
import { api, send } from "@/lib/api";
import { RequireAuth, useSession } from "./session";
import {
  BugCard,
  Feedback,
  Field,
  Loading,
  PageTitle,
  Pager,
  formValues,
  useAction,
  useResource,
} from "./common";
import { useLinkToken } from "./auth-screens";
export function CompaniesScreen() {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [create, setCreate] = useState(false),
    action = useAction(),
    router = useRouter();
  const { user } = useSession(),
    resource = useResource<Page<Company>>(
      `/companies?page=${page}&q=${encodeURIComponent(search)}`,
    );
  return (
    <>
      <PageTitle eyebrow="Teams and products" title="Companies">
        <p>
          Find a company, follow its reports, or verify your team’s work email.
        </p>
      </PageTitle>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setPage(1);
        }}
      >
        <input
          aria-label="Search companies"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company name or domain"
        />
        <button>Search</button>
        {user?.isEmailVerified && (
          <button type="button" onClick={() => setCreate(!create)}>
            Add company
          </button>
        )}
      </form>
      {create && (
        <form
          className="card wide-form"
          style={{ marginBottom: 24 }}
          onSubmit={(e) => {
            const v = formValues(e);
            void action.run(async () => {
              const company = await send<Company>("/companies", {
                name: String(v.get("name")),
                domain: String(v.get("domain")),
                description: String(v.get("description")),
              });
              router.push(`/companies/${company.id}`);
            });
          }}
        >
          <h2>Add a company</h2>
          <p className="muted">
            Creating a listing does not grant company ownership or access to
            private reports.
          </p>
          <Field label="Company name">
            <input name="name" required minLength={2} maxLength={120} />
          </Field>
          <Field
            label="Company domain"
            hint="Use a domain such as example.com, without https:// or paths."
          >
            <input
              name="domain"
              required
              maxLength={253}
              placeholder="example.com"
            />
          </Field>
          <Field label="Description">
            <textarea name="description" maxLength={5000} />
          </Field>
          <Feedback {...action} />
          <button className="primary" disabled={action.busy}>
            Add company
          </button>
        </form>
      )}
      <Loading {...resource} />
      {resource.data && (
        <>
          <div className="grid">
            {resource.data.items.map((c) => (
              <article className="card" key={c.id}>
                <div className="tags">
                  <span>{c.domain}</span>
                  {c.isVerified && <span className="badge">Verified</span>}
                </div>
                <h2 style={{ marginTop: 16 }}>
                  <Link href={`/companies/${c.id}`}>{c.name}</Link>
                </h2>
                <p className="excerpt">
                  {c.description || "A community company listing."}
                </p>
                <small className="muted">{c.bugCount} accessible reports</small>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="empty">
              No companies found. Sign in with a verified email to add a
              listing.
            </p>
          )}
          <div className="toolbar">
            <Pager data={resource.data} onPage={setPage} />
          </div>
        </>
      )}
    </>
  );
}
export function CompanyScreen({
  tab = "reports",
}: {
  tab?: "reports" | "team" | "settings" | "claim";
}) {
  const { id } = useParams<{ id: string }>(),
    { user, refresh } = useSession();
  const company = useResource<Company>(`/companies/${id}`),
    [page, setPage] = useState(1);
  const bugs = useResource<Page<Bug>>(
    tab === "reports" ? `/companies/${id}/bugs?page=${page}` : null,
  );
  const member = user?.companyMemberships.find((m) => m.companyId === id),
    admin = !!user?.isAdmin || member?.role === "admin";
  const members = useResource<{ members: CompanyMember[] }>(
      tab === "team" && (!!member || user?.isAdmin)
        ? `/companies/${id}/members`
        : null,
    ),
    analytics = useResource<{
      totalBugs: number;
      byStatus: { status: string; count: number }[];
    }>(
      tab === "reports" && (!!member || user?.isAdmin)
        ? `/companies/${id}/analytics`
        : null,
    );
  const token = useLinkToken(),
    action = useAction(),
    c = company.data;
  return (
    <>
      <Loading {...company} />
      {c && (
        <>
          <PageTitle
            eyebrow={`${c.domain}${c.isVerified ? " · Verified company" : ""}`}
            title={c.name}
          >
            <p>{c.description}</p>
          </PageTitle>
          <nav className="toolbar">
            <Link href={`/companies/${id}`}>Reports</Link>
            {(member || user?.isAdmin) && (
              <Link href={`/companies/${id}/team`}>Team</Link>
            )}
            {admin && <Link href={`/companies/${id}/settings`}>Settings</Link>}
            {!c.isVerified && (
              <Link className="button small" href={`/companies/${id}/claim`}>
                Verify company
              </Link>
            )}
          </nav>
          <Feedback {...action} />
          {tab === "reports" && (
            <>
              {analytics.data && (
                <div className="row toolbar">
                  {analytics.data.byStatus.map((s) => (
                    <span className="badge" key={s.status}>
                      {s.status.replace("_", " ")}: {s.count}
                    </span>
                  ))}
                </div>
              )}
              <Loading {...bugs} />
              <div className="stack">
                {bugs.data?.items.map((b) => (
                  <BugCard key={b.id} bug={b} />
                ))}
                {bugs.data && !bugs.data.items.length && (
                  <div className="empty">
                    No accessible reports yet.{" "}
                    <Link href="/submit">Submit a report.</Link>
                  </div>
                )}
                {bugs.data && <Pager data={bugs.data} onPage={setPage} />}
              </div>
            </>
          )}
          {tab === "claim" && (
            <RequireAuth>
              <div className="card wide-form">
                <h2>Verify your company</h2>
                <p>
                  Use a verified work email at <strong>{c.domain}</strong>. A
                  one-time email link establishes the first company
                  administrator. Existing administrators can add team members
                  after verification.
                </p>
                {c.isVerified ? (
                  <p className="success">
                    This company is verified. Ask an administrator to add you to
                    the team.
                  </p>
                ) : token ? (
                  <button
                    className="primary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await send(`/companies/${id}/verify`, { token });
                        await refresh();
                        company.reload();
                        action.setMessage("Company verified.");
                      })
                    }
                  >
                    Confirm company verification
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={action.busy || !user?.isEmailVerified}
                    onClick={() =>
                      void action.run(async () => {
                        const result = await send<{ message: string }>(
                          `/companies/${id}/claim`,
                        );
                        action.setMessage(result.message);
                      })
                    }
                  >
                    Send work-email verification
                  </button>
                )}
              </div>
            </RequireAuth>
          )}
          {tab === "team" && (
            <RequireAuth>
              {!member && !user?.isAdmin ? (
                <p className="notice">Company membership is required.</p>
              ) : (
                <>
                  <Loading {...members} />
                  <div className="card table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Email</th>
                          <th>Role</th>
                          {admin && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {members.data?.members.map((m) => (
                          <tr key={m.id}>
                            <td>{m.user.displayName}</td>
                            <td>{m.user.email}</td>
                            <td>{m.role}</td>
                            {admin && (
                              <td>
                                <div className="actions">
                                  <button
                                    className="small"
                                    disabled={action.busy}
                                    onClick={() =>
                                      void action.run(async () => {
                                        await send(
                                          `/companies/${id}/members/${m.id}`,
                                          {
                                            role:
                                              m.role === "admin"
                                                ? "member"
                                                : "admin",
                                          },
                                          "PATCH",
                                        );
                                        await refresh();
                                        members.reload();
                                      })
                                    }
                                  >
                                    Make{" "}
                                    {m.role === "admin" ? "member" : "admin"}
                                  </button>
                                  <button
                                    className="small danger"
                                    disabled={action.busy}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Remove ${m.user.displayName}? Their private report access ends immediately.`,
                                        )
                                      )
                                        void action.run(async () => {
                                          await api(
                                            `/companies/${id}/members/${m.id}`,
                                            { method: "DELETE" },
                                          );
                                          await refresh();
                                          members.reload();
                                        });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {admin && (
                    <form
                      className="card wide-form toolbar"
                      onSubmit={(e) => {
                        const form = e.currentTarget,
                          v = formValues(e);
                        void action.run(async () => {
                          await send(`/companies/${id}/members`, {
                            email: String(v.get("email")),
                            role: String(v.get("role")),
                          });
                          form.reset();
                          members.reload();
                          action.setMessage("Team member added.");
                        });
                      }}
                    >
                      <h2>Add a team member</h2>
                      <p className="muted">
                        They must have a BugRelay account with a verified email.
                        Members can read private company reports and respond to
                        them.
                      </p>
                      <Field label="Member email">
                        <input name="email" type="email" required />
                      </Field>
                      <Field label="Role">
                        <select name="role">
                          <option value="member">Member</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </Field>
                      <button disabled={action.busy}>Add member</button>
                    </form>
                  )}
                </>
              )}
            </RequireAuth>
          )}
          {tab === "settings" && (
            <RequireAuth>
              {!admin ? (
                <p className="notice">Company administrator access required.</p>
              ) : (
                <form
                  className="card wide-form"
                  onSubmit={(e) => {
                    const v = formValues(e);
                    void action.run(async () => {
                      await send(
                        `/companies/${id}/settings`,
                        {
                          name: String(v.get("name")),
                          description: String(v.get("description")),
                        },
                        "PATCH",
                      );
                      company.reload();
                      await refresh();
                      action.setMessage("Company settings updated.");
                    });
                  }}
                >
                  <Field label="Company name">
                    <input
                      name="name"
                      defaultValue={c.name}
                      required
                      minLength={2}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      name="description"
                      defaultValue={c.description}
                      maxLength={5000}
                    />
                  </Field>
                  <p className="muted">
                    Verified domain: {c.domain}. Changing a domain requires a
                    new verified listing.
                  </p>
                  <button className="primary" disabled={action.busy}>
                    Save settings
                  </button>
                </form>
              )}
            </RequireAuth>
          )}
        </>
      )}
    </>
  );
}
