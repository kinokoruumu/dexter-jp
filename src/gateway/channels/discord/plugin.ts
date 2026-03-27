import type { ChannelPlugin, ChannelStartContext } from '../types.js';
import type { InboundMessage } from '../../types.js';
import type { GatewayConfig } from '../../config.js';
import { logger } from '../../../utils/logger.js';

type DiscordAccountConfig = {
  enabled: boolean;
};

type DiscordPluginParams = {
  loadConfig: () => GatewayConfig;
  onMessage: (inbound: InboundMessage) => Promise<void>;
};

/**
 * Create a Discord channel plugin using discord.js Gateway (WebSocket).
 * Requires: DISCORD_BOT_TOKEN environment variable.
 */
export function createDiscordPlugin(params: DiscordPluginParams): ChannelPlugin<GatewayConfig, DiscordAccountConfig> {
  return {
    id: 'discord',
    config: {
      listAccountIds: () => {
        return process.env.DISCORD_BOT_TOKEN ? ['default'] : [];
      },
      resolveAccount: () => ({ enabled: true }),
      isEnabled: (account) => account.enabled,
      isConfigured: () => Boolean(process.env.DISCORD_BOT_TOKEN),
    },
    gateway: {
      startAccount: async (ctx: ChannelStartContext<DiscordAccountConfig>) => {
        const { Client, GatewayIntentBits } = await import('discord.js');

        const client = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent,
          ],
        });

        let botUserId: string | undefined;

        client.on('ready', () => {
          botUserId = client.user?.id;
          ctx.setStatus({ connected: true });
          logger.info(`[Discord] Connected as ${client.user?.tag}`);
        });

        client.on('messageCreate', async (message) => {
          if (ctx.abortSignal.aborted) return;
          // Skip bot messages
          if (message.author.bot) return;

          const isDm = !message.guild;
          const isMentioned = message.mentions.has(client.user!);

          // In servers, only respond to @mentions; in DMs, always respond
          if (!isDm && !isMentioned) return;

          // Strip the bot mention from the message text
          let body = message.content;
          if (botUserId) {
            body = body.replace(new RegExp(`<@!?${botUserId}>\\s*`, 'g'), '').trim();
          }
          if (!body) return;

          const inbound: InboundMessage = {
            channel: 'discord',
            accountId: ctx.accountId,
            senderId: message.author.id,
            senderName: message.author.displayName || message.author.username,
            chatId: message.channelId,
            replyTo: message.channelId,
            chatType: isDm ? 'direct' : 'group',
            body,
            messageId: message.id,
            timestamp: message.createdTimestamp,
            groupSubject: message.guild?.name,
            selfId: botUserId,
            mentionedIds: message.mentions.users.map(u => u.id),
            sendComposing: async () => {
              await message.channel.sendTyping();
            },
            reply: async (text: string) => {
              // Split long messages (Discord has 2000 char limit)
              const chunks = splitMessage(text, 2000);
              for (const chunk of chunks) {
                await message.reply(chunk);
              }
            },
            send: async (text: string) => {
              const chunks = splitMessage(text, 2000);
              for (const chunk of chunks) {
                await message.channel.send(chunk);
              }
            },
          };

          await params.onMessage(inbound);
        });

        await client.login(process.env.DISCORD_BOT_TOKEN!);

        // Keep alive until abort
        await new Promise<void>((resolve) => {
          ctx.abortSignal.addEventListener('abort', () => {
            client.destroy();
            resolve();
          });
        });
      },
    },
  };
}

/** Split a message into chunks that fit Discord's 2000 char limit. */
function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Try to split at a newline
    let splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx <= 0) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).replace(/^\n/, '');
  }
  return chunks;
}
