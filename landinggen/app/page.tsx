import Link from "next/link";
import Image from "next/image";

import { AnimatedGridBackground } from "@/components/magic/animated-grid-background";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <AnimatedGridBackground />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[56rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--foreground)/0.12),transparent_55%)] blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_0%_0%,hsl(var(--foreground)/0.08),transparent_55%),radial-gradient(900px_circle_at_100%_0%,hsl(var(--foreground)/0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent_40%,hsl(var(--background)))]" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-20 md:py-28">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/logo-mark.svg"
              alt="Landing Studio"
              width={32}
              height={32}
              priority
            />
            <span className="text-sm font-semibold tracking-tight">
              Landing Studio
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="shadow-sm">
              <Link href="/auth?mode=login&next=/start">Login</Link>
            </Button>
            <Button asChild variant="secondary" className="shadow-sm">
              <Link href="/auth?mode=register&next=/start">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="mt-16 grid gap-10 md:mt-20 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
              Streaming code + live preview + one-click publish
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Generate a premium landing page from a single prompt.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
              A studio that turns chat into production-ready React + Tailwind,
              with a real-time preview and a publish flow wired for Vercel.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-md">
                <Link href="/auth?mode=register&next=/start">Start generating</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur">
                <p className="text-sm font-medium">Built for agencies</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Generate a premium landing from one prompt</li>
                  <li>Live preview as the code streams in</li>
                  <li>Iterate fast with chat-driven edits</li>
                  <li>Publish to Vercel with domain support</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur">
                <p className="text-sm font-medium">Premium defaults</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bento grids, glow borders, tasteful motion, and crisp
                  typography, biased toward &quot;Linear meets Apple&quot;
                  aesthetics.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
