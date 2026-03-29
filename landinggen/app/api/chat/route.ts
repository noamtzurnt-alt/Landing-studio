import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";

function normalizeAnthropicModelId(input: string | undefined | null) {
  const raw = input?.trim();
  if (!raw) return "claude-sonnet-4-6";

  // Common "latest" style aliases people try to use.
  const map: Record<string, string> = {
    "claude-4-6-sonnet-latest": "claude-sonnet-4-6",
    "claude-4.6-sonnet-latest": "claude-sonnet-4-6",
    "claude-4-6-sonnet": "claude-sonnet-4-6",
    "claude-3-5-sonnet-latest": "claude-3.5-sonnet",
    "claude-3.5-sonnet-latest": "claude-3.5-sonnet",
    "claude-3-5-haiku-latest": "claude-3.5-haiku",
    "claude-3.5-haiku-latest": "claude-3.5-haiku",
  };

  return map[raw] ?? raw;
}

const ChatRequestSchema = z.object({
  prompt: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
  current: z
    .object({
      previewTsx: z.string().optional(),
      productionTsx: z.string().optional(),
    })
    .optional(),
});

const SYSTEM = `You are a senior product designer + frontend engineer.
You generate premium, production-ready landing pages with a wow effect (Linear / Apple-level polish).

HARD REQUIREMENT (component primitives):
- You MUST use the provided in-repo primitives from \`components/magic/*\` as your building blocks.
- Do NOT hand-roll generic sections when a primitive exists. Prefer composition.
- Your layout MUST prominently feature: bento grids, glassmorphism, glowing borders, and scroll-triggered entrance animations.

Allowed/required primitives in PRODUCTION_TSX (use these aggressively):
- \`AnimatedGridBackground\` from "@/components/magic/animated-grid-background"
- \`Spotlight\` from "@/components/magic/spotlight"
- \`GlowCard\` from "@/components/magic/glow-card"
- \`BentoGrid\`, \`BentoCard\` from "@/components/magic/bento-grid"
- \`ScrollReveal\` from "@/components/magic/scroll-reveal"
- \`ShimmerButton\` from "@/components/magic/shimmer-button"
- You MUST include a Contact section that renders \`<ContactForm />\` imported from "@/components/contact-form"
  - The form stores leads into Firestore collection \`leads\` via the in-repo Firebase client.

OUTPUT FORMAT (strict):
- Return ONLY two fenced code blocks.
- First code block must be labeled PREVIEW_TSX and contain TSX that defines a single React component named \`Landing\`.
  - No imports.
  - Tailwind-only.
  - You MAY use Framer Motion via the global \`Motion\` object (preloaded in the preview iframe).
  - Prefer glass + bento + subtle animations.
- Second code block must be labeled PRODUCTION_TSX and contain a Next.js App Router page component:
  - Default export \`function Page()\`.
  - MUST import and use the primitives listed above.
  - MUST include \`ContactForm\` usage near the end of the page (before footer/CTA endcap).
  - You MAY use \`framer-motion\` directly, but prefer \`ScrollReveal\` for scroll animations.
  - Single-page landing only (no routing).

DESIGN REQUIREMENTS:
- High-end hero with strong typographic hierarchy
- Bento grid feature section (use \`BentoGrid\` + \`BentoCard\`)
- Glassmorphism surfaces + glow accents (use \`GlowCard\`, \`Spotlight\`, gradients)
- Scroll animations (use \`ScrollReveal\` on key sections)
- CTA section with premium button treatment (use \`ShimmerButton\`)

QUALITY / STYLE (very important):
- NO emojis, NO ASCII icons, NO "keyboard icons" in UI (e.g. 🎀, ✨, ★, etc.). Keep it premium and professional.
- Keep spacing + font sizes consistent and aligned to a clear grid. Avoid chaotic, mismatched sizing.
- Responsive by default: must look great on mobile and desktop.
  - Use mobile-first Tailwind with breakpoints (sm/md/lg).
  - Avoid fixed widths that overflow on small screens.
  - Ensure tap targets and text sizes are readable on mobile.

NO commentary. NO markdown other than the two fences.`;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(parsed.error.message, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "Missing ANTHROPIC_API_KEY. Add it to your environment to enable chat.",
      { status: 501 },
    );
  }

  const { prompt, history = [], current } = parsed.data;

  const trimTail = (s: string, maxChars: number) => {
    const t = s.trim();
    if (t.length <= maxChars) return t;
    return t.slice(-maxChars);
  };

  const currentContext =
    current?.previewTsx || current?.productionTsx
      ? `\n\nCURRENT CODE (for iterative edits):\nPREVIEW_TSX:\n${current?.previewTsx ?? ""}\n\nPRODUCTION_TSX:\n${current?.productionTsx ?? ""}\n`
      : "";
  const currentContextTrimmed = currentContext
    ? `\n\nCURRENT CODE (tail only):\nPREVIEW_TSX:\n${trimTail(current?.previewTsx ?? "", 3500)}\n\nPRODUCTION_TSX:\n${trimTail(current?.productionTsx ?? "", 3500)}\n`
    : "";

  const messages = [
    { role: "system" as const, content: SYSTEM },
    ...history.slice(-10),
    {
      role: "user" as const,
      content: `${prompt}${currentContextTrimmed}`,
    },
  ];

  const modelId = normalizeAnthropicModelId(process.env.ANTHROPIC_MODEL);
  const model = anthropic(modelId);

  try {
    const result = streamText({
      model,
      messages,
      temperature: 0.6,
      // Keep responses small + fast (two TSX blocks only).
      // Large token budgets increase latency and overload risk.
      maxOutputTokens: 6000,
      maxRetries: 5,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : `Anthropic request failed (model: ${modelId})`;
    return new Response(message, { status: 500 });
  }
}

