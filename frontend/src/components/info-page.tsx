import Link from "next/link";
export function InfoPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="wide-form">
      <div className="page-title">
        <p className="eyebrow">BugRelay</p>
        <h1>{title}</h1>
      </div>
      <div className="stack">{children}</div>
      <p style={{ marginTop: 30 }}>
        <Link href="/">Back to BugRelay</Link>
      </p>
    </article>
  );
}
