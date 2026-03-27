/**
 * Detect if the bot was @-mentioned in a group message.
 */
export function isBotMentioned(params: {
  mentionedJids?: string[];
  selfJid?: string | null;
  selfLid?: string | null;
  selfE164?: string | null;
  body: string;
}): boolean {
  const { mentionedJids, selfJid, selfLid, selfE164, body } = params;

  if (mentionedJids?.length && selfJid) {
    // Direct ID match (works for Discord/Slack where IDs are plain strings)
    if (mentionedJids.includes(selfJid)) {
      return true;
    }

    // WhatsApp JID/LID base match (split on @ and : for phone-based IDs)
    const selfBases = new Set<string>();
    for (const id of [selfJid, selfLid]) {
      if (id) {
        const base = id.split('@')[0]?.split(':')[0];
        if (base) selfBases.add(base);
      }
    }

    if (selfBases.size > 0) {
      for (const jid of mentionedJids) {
        const base = jid.split('@')[0]?.split(':')[0];
        if (base && selfBases.has(base)) {
          return true;
        }
      }
    }
  }

  // Fallback: check if bot's phone digits appear in message body
  if (selfE164) {
    const digits = selfE164.replace(/\D/g, '');
    if (digits.length >= 7 && body.includes(digits)) {
      return true;
    }
  }

  return false;
}
