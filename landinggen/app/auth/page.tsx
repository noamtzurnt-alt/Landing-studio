import AuthClient from "@/app/auth/auth-client";

export default async function AuthPage({
  searchParams,
}: {
  // In newer Next versions this can be a Promise.
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const next = typeof sp.next === "string" ? sp.next : null;
  const mode =
    sp.mode === "register" ? ("register" as const) : ("login" as const);
  return <AuthClient nextPath={next ?? "/start"} initialMode={mode} />;
}

