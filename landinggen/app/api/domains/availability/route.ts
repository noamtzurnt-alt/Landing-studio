import { z } from "zod";

const BodySchema = z.object({
  domain: z.string().min(1),
});

function normalizeDomain(input: string) {
  const d = input.trim().toLowerCase();
  // Simple, pragmatic validation (punycode not supported in this demo).
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) {
    throw new Error("Invalid domain. Use letters, numbers, hyphen, and dots.");
  }
  if (d.length > 253) throw new Error("Invalid domain length.");
  return d;
}

function getVercelAuth() {
  const token = process.env.VERCEL_AUTH_TOKEN ?? process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("Missing VERCEL_AUTH_TOKEN (or VERCEL_TOKEN).");
  }
  const teamId = process.env.VERCEL_TEAM_ID ?? null;
  return { token, teamId };
}

export async function POST(req: Request) {
  // Optional: allow availability checks without auth (harmless).
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  let domain: string;
  try {
    domain = normalizeDomain(parsed.data.domain);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid domain." },
      { status: 400 },
    );
  }

  let token: string;
  let teamId: string | null;
  try {
    ({ token, teamId } = getVercelAuth());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Missing Vercel auth." },
      { status: 501 },
    );
  }

  const url = new URL(
    `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/availability`,
  );
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      `Vercel availability check failed (${res.status}).`;
    return Response.json(
      { error: message, vercelStatus: res.status },
      { status: 502 },
    );
  }

  return Response.json({ domain, available: Boolean(payload?.available) });
}

