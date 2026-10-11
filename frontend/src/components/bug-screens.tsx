"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type {
  Bug,
  Comment,
  Company,
  Page,
  PublicConfig,
} from "@bugrelay/contracts";
import { api, date, send } from "@/lib/api";
import { useSession, RequireAuth } from "./session";
import {
  BugCard,
  Challenge,
  Feedback,
  Field,
  Loading,
  PageTitle,
  Pager,
  formValues,
  useAction,
  useResource,
} from "./common";

export function BugListScreen({ mine = false }: { mine?: boolean }) {
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("recent"),
    [tag, setTag] = useState(""),
    [tagFilter, setTagFilter] = useState("");
  const { user } = useSession();
  const resource = useResource<Page<Bug>>(
    `/bugs?page=${page}&q=${encodeURIComponent(search)}&status=${status}&sort=${sort}&tag=${encodeURIComponent(tagFilter)}${mine ? "&mine=true" : ""}`,
  );
  const content = (
    <>
      <PageTitle
        eyebrow={mine ? "Your workspace" : "Community reports"}
        title={mine ? "Your reports" : "Find a bug. Follow the fix."}
      >
        <p>
          {mine
            ? "Keep track of the reports you’ve submitted."
            : "Discover known issues and help teams focus on what matters."}
        </p>
      </PageTitle>
      {mine && (
        <div className="row toolbar">
          <Link className="button primary" href="/submit">
            Submit a report
          </Link>
          {user?.companyMemberships.map((m) => (
            <Link
              className="button"
              key={m.id}
              href={`/companies/${m.companyId}`}
            >
              {m.company.name}
            </Link>
          ))}
        </div>
      )}
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setTagFilter(tag);
          setPage(1);
        }}
      >
        <input
          aria-label="Search reports"
          placeholder="Search reports or applications"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          aria-label="Filter by tag"
          placeholder="Tag (optional)"
          maxLength={40}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <button>Search</button>
        <select
          aria-label="Sort reports"
          style={{ width: "auto" }}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="recent">Newest first</option>
          <option value="votes">Most votes</option>
        </select>
        <select
          aria-label="Filter by status"
          style={{ width: "auto" }}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {["open", "acknowledged", "in_progress", "resolved", "closed"].map(
            (s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ),
          )}
        </select>
      </form>
      <Loading {...resource} />
      {resource.data && (
        <div className="stack">
          {resource.data.items.length ? (
            resource.data.items.map((b) => <BugCard key={b.id} bug={b} />)
          ) : (
            <div className="empty">
              No reports found.{" "}
              <Link href="/submit">Create the first report.</Link>
            </div>
          )}
          <Pager data={resource.data} onPage={setPage} />
        </div>
      )}
    </>
  );
  return mine ? <RequireAuth>{content}</RequireAuth> : content;
}
interface Duplicate {
  id: string;
  title: string;
  status: string;
  voteCount: number;
  matchScore: number;
}
export function SubmitScreen() {
  const { user } = useSession(),
    router = useRouter(),
    action = useAction();
  const companies = useResource<Page<Company>>("/companies?limit=100"),
    config = useResource<PublicConfig>("/config");
  const [companyId, setCompanyId] = useState("");
  const [category, setCategory] = useState("bug"),
    [visibility, setVisibility] = useState("public"),
    [token, setToken] = useState(""),
    [attempt, setAttempt] = useState(0),
    [title, setTitle] = useState(""),
    [duplicates, setDuplicates] = useState<Duplicate[] | null>(null),
    [duplicateError, setDuplicateError] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [created, setCreated] = useState<Bug | null>(null);
  return (
    <>
      <PageTitle eyebrow="Share what went wrong" title="Submit a report">
        <p>
          Clear reports help teams reproduce and resolve problems. Never include
          passwords, access tokens, or personal data.
        </p>
      </PageTitle>
      {created ? (
        <div className="card">
          <h2>Your report was created</h2>
          <Feedback {...action} />
          <p>
            Some attachments may need to be added again from the report page.
          </p>
          <Link className="button primary" href={`/bugs/${created.id}`}>
            View report
          </Link>
        </div>
      ) : (
        <form
          className="card wide-form"
          onSubmit={(e) => {
            const values = formValues(e);
            void action.run(async () => {
              try {
                const b = await send<Bug>("/bugs", {
                  title,
                  description: String(values.get("description")),
                  applicationName: String(values.get("applicationName")),
                  companyId: companyId || undefined,
                  category,
                  severity: String(values.get("severity")),
                  visibility:
                    category === "security"
                      ? "private"
                      : String(values.get("visibility")),
                  stepsToReproduce: String(values.get("stepsToReproduce")),
                  expectedBehavior: String(values.get("expectedBehavior")),
                  actualBehavior: String(values.get("actualBehavior")),
                  environment: String(values.get("environment")),
                  tags: String(values.get("tags"))
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  turnstileToken: token || undefined,
                });
                setCreated(b);
                for (const file of files) {
                  const form = new FormData();
                  form.set("file", file);
                  await api(`/bugs/${b.id}/attachments`, {
                    method: "POST",
                    body: form,
                  });
                }
                router.push(`/bugs/${b.id}`);
              } finally {
                setAttempt((v) => v + 1);
              }
            });
          }}
        >
          {!user?.isEmailVerified && (
            <p className="notice">
              Public reports can be submitted without an account.{" "}
              <Link href={user ? "/verify-email" : "/register"}>
                Use a verified account
              </Link>{" "}
              for private reports, screenshots, editing and your personal
              dashboard.
            </p>
          )}
          <div className="form-grid">
            <Field label="Application or product">
              <input
                name="applicationName"
                required
                maxLength={120}
                placeholder="A product you use"
              />
            </Field>
            <Field
              label="Company (optional)"
              hint="Not listed? Leave this unassigned; the report can still be submitted."
            >
              <select
                name="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {companies.data?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isVerified ? " · verified" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Report title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={200}
              placeholder="Briefly describe the problem"
            />
          </Field>
          <button
            type="button"
            className="small"
            disabled={title.trim().length < 3}
            onClick={() => {
              setDuplicateError("");
              void send<{ duplicates: Duplicate[] }>(
                "/bugs/search-duplicates",
                { query: title },
              )
                .then((r) => setDuplicates(r.duplicates))
                .catch((e) => setDuplicateError(e.message));
            }}
          >
            Check for similar reports
          </button>
          <Feedback error={duplicateError} />
          {duplicates && (
            <div className="notice" style={{ marginTop: 14 }}>
              {duplicates.length ? (
                <>
                  <strong>These reports may be related:</strong>
                  <ul>
                    {duplicates.map((b) => (
                      <li key={b.id}>
                        <Link
                          target="_blank"
                          rel="noreferrer"
                          href={`/bugs/${b.id}`}
                        >
                          {b.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p>You can still submit a new report below.</p>
                </>
              ) : (
                <p>No similar reports found. Continue with your report.</p>
              )}
            </div>
          )}
          <div className="form-grid" style={{ marginTop: 22 }}>
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="bug">Bug</option>
                <option value="security">Security vulnerability</option>
                <option value="feature">Feature request</option>
              </select>
            </Field>
            <Field label="Severity">
              <select name="severity" defaultValue="medium">
                {["low", "medium", "high", "critical"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          {category === "security" ? (
            <p className="notice">
              Security reports are private. Only you, BugRelay administrators,
              and members of the verified assigned company can access the report
              and its attachments. An unassigned report is visible only to you
              and BugRelay administrators.
            </p>
          ) : (
            <Field label="Visibility">
              <select
                name="visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="public">Public — anyone can read</option>
                <option value="private">
                  Private — reporter, administrators and verified company
                  members
                </option>
              </select>
            </Field>
          )}
          <Field label="Description">
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={20000}
              rows={6}
            />
          </Field>
          <Field label="Steps to reproduce">
            <textarea
              name="stepsToReproduce"
              maxLength={10000}
              placeholder="1. Open…&#10;2. Click…"
            />
          </Field>
          <div className="form-grid">
            <Field label="Expected behavior">
              <textarea name="expectedBehavior" maxLength={5000} />
            </Field>
            <Field label="Actual behavior">
              <textarea name="actualBehavior" maxLength={5000} />
            </Field>
          </div>
          <Field label="Environment">
            <input
              name="environment"
              maxLength={2000}
              placeholder="Browser, operating system, app version"
            />
          </Field>
          <Field label="Tags" hint="Up to ten tags, separated by commas.">
            <input name="tags" />
          </Field>
          <Field
            label="Screenshots"
            hint="Up to five PNG, JPEG or WebP images; at most 5 MiB each."
          >
            <input
              type="file"
              disabled={!user?.isEmailVerified}
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) =>
                setFiles(Array.from(e.target.files ?? []).slice(0, 5))
              }
            />
          </Field>
          <Challenge onToken={setToken} revision={attempt} />
          <Feedback {...action} />
          <button
            className="primary"
            disabled={
              action.busy ||
              ((category === "security" || visibility === "private") &&
                !user?.isEmailVerified) ||
              (!!config.data?.turnstileSiteKey && !token)
            }
          >
            {action.busy ? "Submitting…" : "Submit report"}
          </button>
        </form>
      )}
    </>
  );
}
export function BugDetailScreen() {
  const { id } = useParams<{ id: string }>(),
    { user } = useSession(),
    router = useRouter(),
    action = useAction();
  const report = useResource<Bug>(`/bugs/${id}`),
    [page, setPage] = useState(1),
    comments = useResource<Page<Comment>>(`/bugs/${id}/comments?page=${page}`),
    [editing, setEditing] = useState(false);
  const b = report.data;
  const reload = () => {
    report.reload();
    comments.reload();
  };
  return (
    <>
      <Loading {...report} />
      {b && (
        <>
          <PageTitle
            eyebrow={`${b.applicationName}${b.companyName ? ` / ${b.companyName}` : ""}`}
            title={b.title}
          >
            <div className="tags">
              <span className="badge">{b.status.replace("_", " ")}</span>
              <span className="badge">{b.severity}</span>
              <span
                className={`badge ${b.visibility === "private" ? "private" : ""}`}
              >
                {b.visibility}
              </span>
              <span>
                Reported {date(b.createdAt)} by{" "}
                {b.author?.displayName ?? "Anonymous"}
              </span>
            </div>
          </PageTitle>
          <Feedback {...action} />
          <div className="two-col">
            <div className="stack">
              <article className="card">
                {editing ? (
                  <form
                    onSubmit={(e) => {
                      const v = formValues(e);
                      void action.run(async () => {
                        await send(
                          `/bugs/${id}`,
                          {
                            title: String(v.get("title")),
                            description: String(v.get("description")),
                          },
                          "PATCH",
                        );
                        setEditing(false);
                        reload();
                      });
                    }}
                  >
                    <Field label="Title">
                      <input
                        name="title"
                        defaultValue={b.title}
                        required
                        minLength={5}
                        maxLength={200}
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        name="description"
                        defaultValue={b.description}
                        required
                        minLength={20}
                        maxLength={20000}
                      />
                    </Field>
                    <div className="row">
                      <button disabled={action.busy}>Save changes</button>
                      <button type="button" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2>Description</h2>
                    <p className="prose">{b.description}</p>
                    {(
                      [
                        ["Steps to reproduce", b.stepsToReproduce],
                        ["Expected behavior", b.expectedBehavior],
                        ["Actual behavior", b.actualBehavior],
                        ["Environment", b.environment],
                      ] as const
                    ).map(
                      ([title, value]) =>
                        value && (
                          <section key={title}>
                            <h3>{title}</h3>
                            <p className="prose">{value}</p>
                          </section>
                        ),
                    )}
                    {b.canEdit && (
                      <div className="row">
                        <button
                          className="small"
                          onClick={() => setEditing(true)}
                        >
                          Edit report
                        </button>
                        <button
                          className="small danger"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this report? It will no longer be accessible.",
                              )
                            )
                              void action.run(async () => {
                                await api(`/bugs/${id}`, { method: "DELETE" });
                                router.push("/dashboard");
                              });
                          }}
                        >
                          Delete report
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
              <section className="card">
                <h2>Attachments</h2>
                {b.attachments.length ? (
                  <ul>
                    {b.attachments.map((a) => (
                      <li key={a.id}>
                        <a href={a.url}>{a.name}</a>{" "}
                        <small>({Math.ceil(a.size / 1024)} KiB)</small>
                        {b.canEdit && (
                          <button
                            className="link danger"
                            style={{ marginLeft: 10 }}
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(async () => {
                                await api(`/bugs/${id}/attachments/${a.id}`, {
                                  method: "DELETE",
                                });
                                reload();
                              })
                            }
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No attachments.</p>
                )}
                {b.canEdit && b.attachments.length < 5 && (
                  <Field label="Add a screenshot">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={action.busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void action.run(async () => {
                            const form = new FormData();
                            form.set("file", file);
                            await api(`/bugs/${id}/attachments`, {
                              method: "POST",
                              body: form,
                            });
                            reload();
                          });
                        e.target.value = "";
                      }}
                    />
                  </Field>
                )}
              </section>
              <section className="card">
                <h2>Discussion</h2>
                <Loading {...comments} />
                {comments.data?.items.map((cm) => (
                  <CommentItem key={cm.id} comment={cm} reload={reload} />
                ))}
                {comments.data && comments.data.total > comments.data.limit && (
                  <Pager data={comments.data} onPage={setPage} />
                )}
                {user?.isEmailVerified ? (
                  <form
                    onSubmit={(e) => {
                      const form = e.currentTarget,
                        v = formValues(e);
                      void action.run(async () => {
                        await send(`/bugs/${id}/comments`, {
                          content: String(v.get("content")),
                        });
                        form.reset();
                        reload();
                      });
                    }}
                  >
                    <Field label="Add a comment">
                      <textarea name="content" required maxLength={10000} />
                    </Field>
                    <button disabled={action.busy}>Post comment</button>
                  </form>
                ) : (
                  <p className="notice">
                    Sign in with a verified email to join the discussion.
                  </p>
                )}
              </section>
            </div>
            <aside className="stack" style={{ alignContent: "start" }}>
              <div className="card">
                <h2>
                  {b.voteCount} {b.voteCount === 1 ? "vote" : "votes"}
                </h2>
                <p className="muted">Does this affect you too?</p>
                <button
                  className="primary"
                  disabled={action.busy || !user?.isEmailVerified}
                  onClick={() =>
                    void action.run(async () => {
                      await send(
                        `/bugs/${id}/vote`,
                        {},
                        b.hasUserVoted ? "DELETE" : "POST",
                      );
                      reload();
                    })
                  }
                >
                  {b.hasUserVoted ? "Remove your vote" : "Vote for this report"}
                </button>
                {!user && (
                  <p>
                    <Link href="/login">Sign in to vote</Link>
                  </p>
                )}
              </div>
              {b.canManage && (
                <form
                  className="card"
                  onSubmit={(e) => {
                    const v = formValues(e);
                    void action.run(async () => {
                      await send(
                        `/bugs/${id}/status`,
                        {
                          status: String(v.get("status")),
                          response: String(v.get("response")),
                        },
                        "PATCH",
                      );
                      reload();
                      action.setMessage("Status updated.");
                    });
                  }}
                >
                  <h2>Company response</h2>
                  <Field label="Status">
                    <select name="status" defaultValue={b.status}>
                      {[
                        "open",
                        "acknowledged",
                        "in_progress",
                        "resolved",
                        "closed",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Response (optional)">
                    <textarea name="response" maxLength={10000} />
                  </Field>
                  <button disabled={action.busy}>Update status</button>
                </form>
              )}
              <div className="card">
                <h3>Report details</h3>
                {b.resolvedAt && (
                  <p>Resolved {new Date(b.resolvedAt).toLocaleString()}</p>
                )}
                <div className="label-value">
                  <small>Visibility</small>
                  <span>
                    {b.visibility === "private"
                      ? "Restricted to authorized readers"
                      : "Public"}
                  </span>
                </div>
                {b.companyId && (
                  <Link href={`/companies/${b.companyId}`}>
                    {b.companyName}
                  </Link>
                )}
                <div className="tags">
                  {b.tags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
                {user?.isEmailVerified && (
                  <button
                    className="link"
                    style={{ marginTop: 18 }}
                    onClick={() => {
                      const reason = window.prompt(
                        "Why should a moderator review this report?",
                      );
                      if (reason)
                        void action.run(async () => {
                          await send(`/bugs/${id}/report`, { reason });
                          action.setMessage("Sent for moderation.");
                        });
                    }}
                  >
                    Flag for moderation
                  </button>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
function CommentItem({
  comment: cm,
  reload,
}: {
  comment: Comment;
  reload: () => void;
}) {
  const action = useAction(),
    { user } = useSession(),
    [editing, setEditing] = useState(false),
    [expanded, setExpanded] = useState(false),
    [replying, setReplying] = useState(false),
    [page, setPage] = useState(1),
    [newReplies, setNewReplies] = useState(0);
  const replies = useResource<Page<Comment>>(
    expanded
      ? `/bugs/${cm.bugId}/comments?parentId=${cm.id}&page=${page}`
      : null,
  );

  return (
    <article className="comment" id={`comment-${cm.id}`}>
      <small>
        <strong>{cm.author.displayName}</strong> · {date(cm.createdAt)}
      </small>
      {editing ? (
        <form
          onSubmit={(e) => {
            const v = formValues(e);
            void action.run(async () => {
              await send(
                `/bugs/${cm.bugId}/comments/${cm.id}`,
                { content: String(v.get("content")) },
                "PATCH",
              );
              setEditing(false);
              reload();
            });
          }}
        >
          <Field label="Edit comment">
            <textarea
              name="content"
              defaultValue={cm.content}
              required
              maxLength={10000}
            />
          </Field>
          <button disabled={action.busy}>Save</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <p className="prose">{cm.content}</p>
      )}
      {cm.canEdit && !editing && (
        <div className="row">
          <button className="link" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="link danger"
            disabled={action.busy}
            onClick={() => {
              if (window.confirm("Delete this comment?"))
                void action.run(async () => {
                  await api(`/bugs/${cm.bugId}/comments/${cm.id}`, {
                    method: "DELETE",
                  });
                  reload();
                });
            }}
          >
            Delete
          </button>
        </div>
      )}
      {user?.isEmailVerified && !cm.isDeleted && (
        <div className="row">
          {cm.depth < 5 && (
            <button className="link" onClick={() => setReplying((v) => !v)}>
              Reply
            </button>
          )}
          <button
            className="link"
            disabled={action.busy}
            onClick={() => {
              const reason = window.prompt(
                "Why should a moderator review this comment?",
              );
              if (reason)
                void action.run(async () => {
                  await send(`/bugs/${cm.bugId}/comments/${cm.id}/report`, {
                    reason,
                  });
                  action.setMessage("Comment sent for moderation.");
                });
            }}
          >
            Flag comment
          </button>
        </div>
      )}
      {replying && (
        <form
          onSubmit={(e) => {
            const form = e.currentTarget,
              v = formValues(e);
            void action.run(async () => {
              await send(`/bugs/${cm.bugId}/comments/${cm.id}/replies`, {
                content: String(v.get("content")),
              });
              form.reset();
              setReplying(false);
              setExpanded(true);
              setNewReplies((v) => v + 1);
              replies.reload();
              action.setMessage("Reply posted.");
            });
          }}
        >
          <Field label={`Reply to ${cm.author.displayName}`}>
            <textarea name="content" required maxLength={10000} />
          </Field>
          <button disabled={action.busy}>Post reply</button>
        </form>
      )}
      {(cm.replyCount + newReplies > 0 || expanded) && (
        <button
          className="link"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Hide replies"
            : `View replies (${cm.replyCount + newReplies})`}
        </button>
      )}
      {expanded && (
        <div className="replies">
          <Loading {...replies} />
          {replies.data?.items.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              reload={replies.reload}
            />
          ))}
          {replies.data && <Pager data={replies.data} onPage={setPage} />}
        </div>
      )}
      <Feedback {...action} />
    </article>
  );
}
