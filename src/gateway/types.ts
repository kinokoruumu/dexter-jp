import type { ChannelId } from './channels/types.js';

/**
 * Channel-agnostic inbound message.
 * Each channel plugin normalizes its raw message into this type before calling handleInbound.
 */
export type InboundMessage = {
  /** Which channel this message came from */
  channel: ChannelId;
  /** Account ID within the channel (e.g., WhatsApp phone, Slack workspace) */
  accountId: string;

  // --- Sender / recipient ---
  /** Sender identifier (user ID, phone number, etc.) */
  senderId: string;
  /** Display name of the sender */
  senderName?: string;
  /** Chat/conversation identifier (group ID, channel ID, DM ID) */
  chatId: string;
  /** Where to send the reply (may differ from chatId for some channels) */
  replyTo: string;
  /** Message type */
  chatType: 'direct' | 'group';

  // --- Content ---
  /** Text body of the message */
  body: string;
  /** Unique message ID */
  messageId?: string;
  /** Timestamp (epoch ms) */
  timestamp?: number;

  // --- Group context (optional) ---
  /** Group/channel name */
  groupSubject?: string;
  /** Group participant list */
  groupParticipants?: string[];
  /** JIDs/IDs that were mentioned in the message */
  mentionedIds?: string[];
  /** Bot's own ID in this channel (for mention detection) */
  selfId?: string;
  /** Bot's alternative ID (e.g., WhatsApp LID) */
  selfIdAlt?: string;

  // --- Callbacks ---
  /** Send a typing/composing indicator */
  sendComposing: () => Promise<void>;
  /** Reply to this specific message */
  reply: (text: string) => Promise<void>;
  /** Send a message to the conversation (not a reply to a specific message) */
  send: (text: string) => Promise<void>;
};
