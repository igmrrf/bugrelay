import Link from "next/link";
import { Search, Users, ShieldCheck, ArrowUpRight } from "lucide-react";
export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">A shared home for software issues</p>
        <h1>
          Good software starts
          <br />
          with a clear report.
        </h1>
        <p>
          Report what’s broken. Help others find a workaround. Give teams the
          context they need to make it right.
        </p>
        <div className="row">
          <Link className="button primary" href="/submit">
            Submit a bug <ArrowUpRight size={17} />
          </Link>
          <Link className="button" href="/bugs">
            Explore reports
          </Link>
        </div>
      </section>
      <div className="grid">
        <article className="card">
          <Search size={25} />
          <h2 style={{ marginTop: 22 }}>Find it first</h2>
          <p className="muted">
            Search existing reports, compare symptoms, and add your vote to the
            issues that affect you.
          </p>
        </article>
        <article className="card">
          <Users size={25} />
          <h2 style={{ marginTop: 22 }}>Keep it moving</h2>
          <p className="muted">
            Share reproduction steps, discuss workarounds, and follow responses
            from verified company teams.
          </p>
        </article>
        <article className="card">
          <ShieldCheck size={25} />
          <h2 style={{ marginTop: 22 }}>Report responsibly</h2>
          <p className="muted">
            Security reports are private, with access limited to the reporter,
            platform administrators and verified company members.
          </p>
        </article>
      </div>
      <section style={{ paddingTop: 65 }}>
        <div className="row spread">
          <div>
            <p className="eyebrow">For product teams</p>
            <h2>Meet your users where the bugs are.</h2>
            <p className="muted">
              Verify your company, invite your team, and respond to reports in
              one place.
            </p>
          </div>
          <Link className="button" href="/companies">
            Find your company <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
