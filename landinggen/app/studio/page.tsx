import StudioClient from "./studio-client";

export default async function StudioPage({
  searchParams,
}: {
  // In newer Next versions this can be a Promise.
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const projectId = typeof sp.projectId === "string" ? sp.projectId : null;
  const prompt = typeof sp.prompt === "string" ? sp.prompt : null;

  return (
    <StudioClient
      initialProjectId={projectId}
      initialPrompt={prompt}
    />
  );
}

