import { z } from "zod";

import { buildNextLandingBundle } from "@/lib/vercel/nextBundle";

const PublishRequestSchema = z.object({
  previewTsx: z.string().min(1),
  productionTsx: z.string().optional(),
  alias: z.string().optional(),
  customDomain: z.string().optional(),
  leadsClientId: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = PublishRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const token = process.env.VERCEL_AUTH_TOKEN ?? process.env.VERCEL_TOKEN;
  if (!token) {
    return Response.json(
      {
        error:
          "Missing VERCEL_AUTH_TOKEN (or VERCEL_TOKEN). Add it to your environment to enable publishing.",
      },
      { status: 501 },
    );
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const name = process.env.VERCEL_PROJECT_NAME ?? "landing-studio-generated";

  const productionTsx = parsed.data.productionTsx;
  if (!productionTsx) {
    return Response.json(
      { error: "Missing productionTsx. Generate a landing page first." },
      { status: 400 },
    );
  }

  // Ensure the deployed landing can store leads to the same Firebase project.
  // We upsert NEXT_PUBLIC_FIREBASE_* env vars on the Vercel project when available.
  const firebaseEnvKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ] as const;

  const firebaseVars = firebaseEnvKeys
    .map((key) => ({ key, value: process.env[key] }))
    .filter((kv) => kv.value && String(kv.value).trim().length > 0);

  const requestedLeadsClientId = parsed.data.leadsClientId?.trim() || null;
  const leadsClientVar = requestedLeadsClientId
    ? [{ key: "NEXT_PUBLIC_LEADS_CLIENT_ID", value: requestedLeadsClientId }]
    : [];

  const envVarsToUpsert = [...firebaseVars, ...leadsClientVar];

  if (envVarsToUpsert.length) {
    const envUrl = new URL(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(name)}/env`,
    );
    envUrl.searchParams.set("upsert", "true");
    if (teamId) envUrl.searchParams.set("teamId", teamId);

    await fetch(envUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        envVarsToUpsert.map(({ key, value }) => ({
          key,
          value,
          type: "plain",
          target: ["production", "preview"],
        })),
      ),
    }).catch(() => {});
  }

  const url = new URL("https://api.vercel.com/v13/deployments");
  if (teamId) url.searchParams.set("teamId", teamId);

  const files = buildNextLandingBundle({ productionPageTsx: productionTsx });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      target: "production",
      files,
      projectSettings: {
        framework: "nextjs",
      },
    }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    return Response.json(
      { error: payload?.error?.message ?? "Vercel publish failed" },
      { status: 500 },
    );
  }

  const deploymentId = payload?.id ?? null;
  const deploymentUrl = payload?.url ? `https://${payload.url}` : null;

  const rootDomain = process.env.VERCEL_ROOT_DOMAIN;
  const requestedAlias = parsed.data.alias?.trim() || null;
  const customDomain = parsed.data.customDomain?.trim() || null;

  const defaultAlias =
    rootDomain && deploymentId
      ? `${deploymentId.slice(0, 10)}.${rootDomain}`
      : null;
  const aliasToAssign = customDomain ?? requestedAlias ?? defaultAlias;

  let aliasUrl: string | null = null;
  let domainAssigned: { domain: string; addedToProject: boolean } | null = null;

  // If the user requested a custom domain, add it to the Vercel project first.
  if (customDomain) {
    const addDomainUrl = new URL(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}/domains`,
    );
    if (teamId) addDomainUrl.searchParams.set("teamId", teamId);

    const addRes = await fetch(addDomainUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: customDomain }),
    });

    domainAssigned = {
      domain: customDomain,
      addedToProject: addRes.ok,
    };
  }

  // Assign alias to the current deployment (works for vercel.app aliases and custom domains).
  if (aliasToAssign && deploymentId) {
    const aliasEndpoint = new URL(
      `https://api.vercel.com/v2/deployments/${deploymentId}/aliases`,
    );
    if (teamId) aliasEndpoint.searchParams.set("teamId", teamId);

    const aliasRes = await fetch(aliasEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ alias: aliasToAssign }),
    });

    if (aliasRes.ok) {
      aliasUrl = `https://${aliasToAssign}`;
    }
  }

  return Response.json({
    url: aliasUrl ?? deploymentUrl,
    deploymentUrl,
    aliasUrl,
    deploymentId,
    domainAssigned,
    leadsDestination: requestedLeadsClientId
      ? { clientId: requestedLeadsClientId }
      : null,
  });
}

