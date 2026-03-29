import { z } from "zod";

const ContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5), // E164 expected by Vercel; validated upstream too.
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(2).max(2), // ISO country code
  companyName: z.string().optional(),
});

const BodySchema = z.object({
  domain: z.string().min(1),
  years: z.number().int().min(1).max(10).default(1),
  autoRenew: z.boolean().default(true),
  languageCode: z.string().optional(),
  contactInformation: ContactSchema,
  // Optional override; if not provided we'll fetch via /price.
  expectedPrice: z.number().positive().optional(),
  // Optional; defaults to env VERCEL_PROJECT_NAME.
  vercelProjectName: z.string().optional(),
});

function normalizeDomain(input: string) {
  const d = input.trim().toLowerCase();
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

function requireAuthedUser(req: Request) {
  // Demo-level guard: require a logged-in user to call purchase.
  // We don't verify the token server-side in this demo (no Firebase Admin configured),
  // but requiring an ID token reduces accidental exposure.
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) throw new Error("Missing Authorization header.");
  return m[1];
}

async function vercelJson(res: Response) {
  const payload = await res.json().catch(() => null);
  return payload;
}

export async function POST(req: Request) {
  try {
    requireAuthedUser(req);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unauthorized" },
      { status: 401 },
    );
  }

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

  const projectName =
    parsed.data.vercelProjectName?.trim() ||
    process.env.VERCEL_PROJECT_NAME ||
    "landing-studio-generated";

  // 1) Availability
  const availabilityUrl = new URL(
    `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/availability`,
  );
  if (teamId) availabilityUrl.searchParams.set("teamId", teamId);

  const availabilityRes = await fetch(availabilityUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const availability = await vercelJson(availabilityRes);
  if (!availabilityRes.ok) {
    return Response.json(
      {
        error:
          availability?.message ||
          availability?.error?.message ||
          `Vercel availability check failed (${availabilityRes.status}).`,
        vercelStatus: availabilityRes.status,
      },
      { status: 502 },
    );
  }
  if (!availability?.available) {
    return Response.json(
      { error: "Domain is not available.", domain, available: false },
      { status: 409 },
    );
  }

  // 2) Price (unless caller already supplied expectedPrice)
  let expectedPrice = parsed.data.expectedPrice ?? null;
  if (expectedPrice == null) {
    const priceUrl = new URL(
      `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/price`,
    );
    priceUrl.searchParams.set("years", String(parsed.data.years));
    if (teamId) priceUrl.searchParams.set("teamId", teamId);

    const priceRes = await fetch(priceUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const price = await vercelJson(priceRes);
    if (!priceRes.ok) {
      return Response.json(
        {
          error:
            price?.message ||
            price?.error?.message ||
            `Vercel price lookup failed (${priceRes.status}).`,
          vercelStatus: priceRes.status,
        },
        { status: 502 },
      );
    }

    const purchasePriceRaw = price?.purchasePrice;
    const asNumber =
      typeof purchasePriceRaw === "number"
        ? purchasePriceRaw
        : typeof purchasePriceRaw === "string"
          ? Number.parseFloat(purchasePriceRaw)
          : NaN;

    if (!Number.isFinite(asNumber) || asNumber <= 0) {
      return Response.json(
        {
          error:
            "Couldn't determine expectedPrice for this domain (premium pricing may require manual approval).",
          domain,
        },
        { status: 400 },
      );
    }
    expectedPrice = asNumber;
  }

  // 3) Buy domain
  const buyUrl = new URL(
    `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/buy`,
  );
  if (teamId) buyUrl.searchParams.set("teamId", teamId);

  const buyRes = await fetch(buyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      autoRenew: parsed.data.autoRenew,
      years: parsed.data.years,
      expectedPrice,
      contactInformation: parsed.data.contactInformation,
      ...(parsed.data.languageCode ? { languageCode: parsed.data.languageCode } : {}),
    }),
  });
  const buy = await vercelJson(buyRes);
  if (!buyRes.ok) {
    const message =
      buy?.message ||
      buy?.error?.message ||
      // Common cases: insufficient funds, invalid contact fields, expected price mismatch
      `Domain purchase failed (${buyRes.status}).`;
    return Response.json(
      { error: message, domain, vercelStatus: buyRes.status, details: buy },
      { status: 502 },
    );
  }

  const orderId = buy?.orderId ?? null;

  // 4) Assign to Vercel project
  const addDomainUrl = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}/domains`,
  );
  if (teamId) addDomainUrl.searchParams.set("teamId", teamId);

  const addRes = await fetch(addDomainUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });
  const addPayload = await vercelJson(addRes);

  return Response.json({
    domain,
    available: true,
    orderId,
    expectedPrice,
    project: projectName,
    addedToProject: addRes.ok,
    addDomainError: addRes.ok
      ? null
      : addPayload?.message || addPayload?.error?.message || "Failed to add domain to project.",
  });
}

