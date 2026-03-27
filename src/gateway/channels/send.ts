import type { ChannelId } from './types.js';
import { cleanMarkdownForWhatsApp } from '../utils.js';

/**
 * Format markdown text for a specific channel.
 * Each channel has different formatting conventions.
 */
export function formatForChannel(channel: ChannelId, markdown: string): string {
  switch (channel) {
    case 'whatsapp':
      return cleanMarkdownForWhatsApp(markdown);
    case 'slack':
      // Slack uses mrkdwn: **bold** → *bold*, _italic_ stays
      return markdown.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    case 'discord':
      // Discord supports standard markdown natively
      return markdown;
    case 'line':
      // LINE has no rich text in plain messages — strip markdown
      return markdown
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
    default:
      return markdown;
  }
}
