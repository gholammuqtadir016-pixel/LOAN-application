import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/current-user";
import { OpenApplication } from "@/components/auth/OpenApplication";

export default async function DashboardPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const applications = await db()
    .client.orm.public.Application.select(
      "id",
      "status",
      "createdAt",
      "updatedAt",
    )
    .where({ userId })
    .orderBy((application) => application.updatedAt.desc())
    .limit(50)
    .all();

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">LOAN APPLICATION DEMO</span>
          <h1>My applications</h1>
          <p className="muted">
            Only applications linked to your signed-in account appear here.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="secondary">
            Sign out
          </button>
        </form>
      </header>

      <Link className="auth-link-button" href="/apply">
        Create a new application
      </Link>

      <section className="dashboard-list" aria-label="Your applications">
        {applications.length === 0 && (
          <p>No applications yet. Create your first draft.</p>
        )}
        {applications.map((application) => (
          <article className="dashboard-item" key={application.id}>
            <div>
              <strong>
                {application.status === "SUBMITTED"
                  ? "Submitted application"
                  : "Draft application"}
              </strong>
              <p className="muted">
                Updated {application.updatedAt.toLocaleDateString("en-IN")}
              </p>
            </div>
            <OpenApplication id={application.id} />
          </article>
        ))}
      </section>
    </main>
  );
}
