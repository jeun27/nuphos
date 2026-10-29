import { config } from '@/config'
import { escapeHtml, isEmailConfigured, sendEmail } from '@/lib/email'
import { logError } from '@/lib/observability'

/**
 * Tells a guest which chat they can now read, with a link that opens it. Best
 * effort: the grant stands even when no mail could be sent.
 */
export async function sendGuestInvitationEmail(input: {
  to: string
  inviterName: string
  title: string
  teamId: string
  sessionId: string
}): Promise<void> {
  if (!isEmailConfigured()) return
  const link = `${config.auth.publicBaseUrl}/teams/${encodeURIComponent(input.teamId)}/agent/${encodeURIComponent(input.sessionId)}`
  const who = input.inviterName.trim() || 'A teammate'
  const subject = `${who} shared “${input.title}” with you on Nuphos`
  const text = `${who} invited you to view “${input.title}” on Nuphos. You can read it and its sub-agents.\n\nOpen it: ${link}`
  const html = `<p>${escapeHtml(who)} invited you to view “${escapeHtml(input.title)}” on Nuphos. You can read it and its sub-agents.</p><p><a href="${escapeHtml(link)}">Open the chat</a></p>`

  try {
    await sendEmail({ to: input.to, subject, html, text })
  } catch (err) {
    logError('agent.guest_invitation.email_failed', err, { session_id: input.sessionId })
  }
}
