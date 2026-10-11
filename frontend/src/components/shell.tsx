"use client";
import Link from "next/link";
import { Bug, ArrowUpRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSession } from "./session";
export function Shell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useSession();
  const [error, setError] = useState("");
  return (
    <>
      <header className="site-header">
        <div className="nav-wrap">
          <Link href="/" className="brand">
            <Bug size={24} />
            BugRelay
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/bugs">Reports</Link>
            <Link href="/companies">Companies</Link>
            <Link href="/submit">
              Submit a bug <ArrowUpRight size={14} />
            </Link>
          </nav>
          <div className="account-nav">
            {loading ? (
              <span>Loading…</span>
            ) : user ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/settings">{user.displayName}</Link>
                {user.isAdmin && <Link href="/admin">Admin</Link>}
                <button
                  className="link"
                  onClick={() =>
                    void logout().catch(() =>
                      setError("Could not sign out. Try again."),
                    )
                  }
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link className="button small" href="/register">
                  Join BugRelay
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {error && (
        <p role="alert" className="error container">
          {error}
        </p>
      )}
      {user && !user.isEmailVerified && (
        <div className="verification-banner">
          Verify your email to submit reports, vote and comment.{" "}
          <Link href="/verify-email">Verify email</Link>
        </div>
      )}
      <main className="container">{children}</main>
      <footer className="container">
        <span>BugRelay · Better software, together.</span>
        <nav>
          <Link href="/guidelines">Guidelines</Link>
          <Link href="/security">Security</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </>
  );
}
