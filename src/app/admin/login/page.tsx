import { redirect } from "next/navigation";
import { issueAdminCookie, passwordMatches, isAdminAuthed } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthed()) redirect("/admin");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    if (!passwordMatches(password)) {
      redirect("/admin/login?error=1");
    }
    await issueAdminCookie();
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-sm px-8 pt-24">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Admin sign-in<span className="text-accent">.</span>
      </h1>
      <p className="mt-2 text-sm text-secondary">
        Enter the shared admin password to view applications.
      </p>
      <form action={login} className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:shadow-focus focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-danger">Incorrect password. Try again.</p>}
        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3.5 font-display text-sm font-bold tracking-tight text-bg transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(232,255,71,0.25)]"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
