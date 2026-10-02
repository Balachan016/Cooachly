import "server-only";

// Every "CC admins" email (booking confirmations/reschedules/deletions, AI
// session summaries, account invites) is routed to this single inbox instead
// of every active admin on the site, while the team pilots with one person
// watching everything. Swap this back to a per-site admin lookup if/when
// that changes.
const ADMIN_CC_EMAIL = "tharasen@live.com";

export function getAdminCcEmails(): string[] {
  return [ADMIN_CC_EMAIL];
}
