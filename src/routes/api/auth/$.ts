import { createFileRoute } from "@tanstack/react-router";

/** Better Auth handler: every `/api/auth/*` request (sign-up, sign-in, session, OAuth). */
async function handle({ request }: { request: Request }) {
  const { auth } = await import("@/lib/auth/server");
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
