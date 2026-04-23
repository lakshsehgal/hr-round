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
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Admin sign-in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the shared admin password to view applications.
      </p>
      <form action={login} className="mt-6 grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600">Incorrect password. Try again.</p>
        )}
        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
