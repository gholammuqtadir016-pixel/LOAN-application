import Link from "next/link";
export default function Home() {
  return (
    <main className="shell">
      <div className="hero">
        <span className="eyebrow">LOAN APPLICATION DEMO</span>
        <h1>One application. Three loan types.</h1>
        <p>
          A 10-step loan journey with guided validation, draft saving, private
          uploads and simulated pre-approval.
        </p>
        <Link href="/apply" className="btn">
          Apply for a loan
        </Link>
        <p className="note">
          Educational demo only. Do not enter real identity numbers or
          documents.
        </p>
      </div>
    </main>
  );
}
