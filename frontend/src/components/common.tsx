"use client";
import {
  cloneElement,
  useId,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import Link from "next/link";
import Script from "next/script";
import type { Bug, Page, PublicConfig } from "@bugrelay/contracts";
import { api, date } from "@/lib/api";
import { useSession } from "./session";
export function useResource<T>(path: string | null) {
  const { user } = useSession();
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    setData(null);
    setError("");
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision, user]);
  return { data, error, loading, reload };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, message, setMessage, run };
}
export function Feedback({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
    </>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(
        children as ReactElement<{ id: string; "aria-describedby"?: string }>,
        { id, "aria-describedby": hint ? `${id}-hint` : undefined },
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Loading({
  error,
  loading,
}: {
  error?: string;
  loading: boolean;
}) {
  return (
    <>
      {loading && (
        <p role="status" className="muted">
          Loading…
        </p>
      )}
      <Feedback error={error} />
    </>
  );
}
export function BugCard({ bug }: { bug: Bug }) {
  return (
    <article className="card report-card">
      <div className="vote-count" aria-label={`${bug.voteCount} votes`}>
        {bug.voteCount}
        <small>votes</small>
      </div>
      <div>
        <div className="tags">
          <span className="badge">{bug.status.replace("_", " ")}</span>
          <span>{bug.applicationName}</span>
          {bug.visibility === "private" && (
            <span className="badge private">Private</span>
          )}
        </div>
        <h2>
          <Link href={`/bugs/${bug.id}`}>{bug.title}</Link>
        </h2>
        <p className="excerpt">{bug.description}</p>
        <small className="muted">
          {bug.author?.displayName ?? "Anonymous"} · {date(bug.createdAt)} ·{" "}
          {bug.commentCount} comments
        </small>
      </div>
    </article>
  );
}
export function Pager({
  data,
  onPage,
}: {
  data: Page<unknown>;
  onPage: (page: number) => void;
}) {
  return (
    <div className="row spread">
      <small className="muted">
        {data.total} results · Page {data.page}
      </small>
      <div className="row">
        <button
          disabled={data.page === 1}
          onClick={() => onPage(data.page - 1)}
        >
          Previous
        </button>
        <button
          disabled={!data.hasNextPage}
          onClick={() => onPage(data.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function Challenge({
  onToken,
  revision = 0,
}: {
  onToken: (token: string) => void;
  revision?: number;
}) {
  const { data } = useResource<PublicConfig>("/config");
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (
      !data?.turnstileSiteKey ||
      !ready ||
      !element.current ||
      !window.turnstile
    )
      return;
    callback.current("");
    const widget = window.turnstile.render(element.current, {
      sitekey: data.turnstileSiteKey,
      callback: (token: string) => callback.current(token),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => window.turnstile?.remove(widget);
  }, [data?.turnstileSiteKey, ready, revision]);
  return data?.turnstileSiteKey ? (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={element} />
    </>
  ) : null;
}
export const formValues = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  return new FormData(e.currentTarget);
};
