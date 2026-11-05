/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Password reset: Better Auth's request-password-reset / reset-password flow is
 * switched on only when RESEND_API_KEY is set (see `src/lib/email.server.ts`).
 * Without it the reset endpoints refuse (no sender) and the UI hides the
 * "Forgot password?" link, so nothing crashes.
 */
export const emailAndPasswordEnabled = true;

/** Extra Better Auth `emailAndPassword` options (spread into server.ts). */
export function emailAndPasswordExtras() {
  if (!process.env.RESEND_API_KEY?.trim()) return {};
  return {
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
      const { sendPasswordResetEmail } = await import("../email.server");
      // Don't await delivery inside the request (timing side-channel + latency).
      void sendPasswordResetEmail(user.email, user.name ?? null, url);
    },
  };
}
