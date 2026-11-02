import { signOut } from "@/app/(site)/login/actions";
import { fmt } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";

/**
 * "Signed in as … · Not you? Use another account". For pages where acting under the
 * wrong account would stick: creating a page, approving the desktop app.
 * `next` brings them back here after signing in again.
 */
export async function AccountBar({ email, next }: { email: string | null; next?: string }) {
  const { d } = await getT();
  return (
    <form action={signOut} className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-paper-2 px-3 py-2 text-sm">
      <input type="hidden" name="relogin" value="1" />
      {next && <input type="hidden" name="next" value={next} />}
      <span className="min-w-0 break-all text-ink-soft">
        {email ? fmt(d.auth.signedInAs, { email }) : d.auth.signedInNoEmail}
      </span>
      <span className="text-ink-faint">·</span>
      <span className="text-ink-soft">{d.auth.notYou}</span>
      <button type="submit" className="font-display text-teal underline decoration-2 underline-offset-2 hover:text-ink">
        {d.auth.switchAccount}
      </button>
    </form>
  );
}
