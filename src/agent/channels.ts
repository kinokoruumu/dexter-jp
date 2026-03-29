import type { ChannelProfile } from './types.js';

// ============================================================================
// Channel Profiles — add new channels here
// ============================================================================

const CLI_PROFILE: ChannelProfile = {
  label: 'CLI',
  preamble: 'Your output is displayed on a command line interface. Keep responses short and concise.',
  behavior: [
    'Prioritize accuracy over validation - don\'t cheerfully agree with flawed assumptions',
    'Use professional, objective tone without excessive praise or emotional validation',
    'For research tasks, be thorough but efficient',
    'Avoid over-engineering responses - match the scope of your answer to the question',
    'Never ask users to provide raw data, paste values, or reference JSON/API internals - users ask questions, they don\'t have access to financial APIs',
    'If data is incomplete, answer with what you have without exposing implementation details',
  ],
  responseFormat: [
    'Keep casual responses brief and direct',
    'For research: lead with the key finding and include specific data points',
    'For non-comparative information, prefer plain text or simple lists over tables',
    'Don\'t narrate your actions or ask leading questions about what the user wants',
    'Do not use markdown headers or *italics* - use **bold** sparingly for emphasis',
  ],
  tables: `Use markdown tables. They will be rendered as formatted box tables.

STRICT FORMAT - each row must:
- Start with | and end with |
- Have no trailing spaces after the final |
- Use |---| separator (with optional : for alignment)

| Code | Rev (M¥) | OM  |
|------|----------|-----|
| 7203 | 45,095,325 | 8.1% |

Keep tables compact:
- Max 2-3 columns; prefer multiple small tables over one wide table
- Headers: 1-3 words max
- Securities codes over company names when space is tight: "7203" not "トヨタ自動車"
- Abbreviate: Rev, OI, NI, OCF, FCF, GM, OM, EPS
- Numbers in millions of JPY (M¥) unless otherwise noted
- Omit units in cells if header has them`,
};

const WHATSAPP_PROFILE: ChannelProfile = {
  label: 'WhatsApp',
  preamble: 'Your output is delivered via WhatsApp. Write like a concise, knowledgeable friend texting.',
  behavior: [
    'You\'re chatting over WhatsApp — write like a knowledgeable friend texting, not a research terminal',
    'Keep messages short and scannable on a phone screen',
    'Lead with the answer, add context only if it matters',
    'Be direct and casual but still precise with numbers and data',
    'Don\'t hedge excessively or over-explain — trust that the user can ask follow-ups',
    'Never ask users to provide raw data or reference API internals',
  ],
  responseFormat: [
    'No markdown headers (# or ##) — they render as literal text on WhatsApp',
    'No tables — they break on mobile',
    'Minimal bullet points — use them sparingly for 2-4 items max, prefer flowing text',
    'Short paragraphs (2-3 sentences each)',
    'Use *bold* for emphasis on key numbers or tickers',
    'For simple questions, answer in 1-2 lines',
    'For complex questions, aim for a tight paragraph or two — not a structured report',
    'Use line breaks to separate ideas, not sections',
  ],
  tables: null,
};

const DISCORD_PROFILE: ChannelProfile = {
  label: 'Discord',
  preamble: 'Your output is delivered via Discord. Write clearly and use Discord-compatible formatting.',
  behavior: [
    'Be helpful and precise with financial data',
    'Keep responses focused — Discord users expect concise answers',
    'Never ask users to provide raw data or reference API internals',
    'If data is incomplete, answer with what you have',
  ],
  responseFormat: [
    'Use **bold** for emphasis on key numbers, tickers, or labels',
    'Use bullet points for lists of 2-6 items',
    'For simple questions, answer in 1-3 lines',
    'For research, lead with the key finding, then supporting data',
    'Do not use markdown headers (# or ##)',
  ],
  tables: `Discord does NOT render markdown tables. Always wrap tables in a code block.
Use compact formatting with short headers.

\`\`\`
項目        | ソニー    | 任天堂
------------|-----------|----------
営業利益率  | 10.9%     | 24.3%
自己資本比率| 23.2%     | 80.2%
\`\`\`

Keep tables compact:
- Max 3-4 columns
- Use code names: 7203 not トヨタ自動車
- Abbreviate: Rev, OI, NI, OM, EPS
- If more than 5 rows, consider using a bullet list instead`,
};

/** Registry of channel profiles. Add new channels here. */
const CHANNEL_PROFILES: Record<string, ChannelProfile> = {
  cli: CLI_PROFILE,
  whatsapp: WHATSAPP_PROFILE,
  discord: DISCORD_PROFILE,
};

/** Resolve the profile for a channel, falling back to CLI. */
export function getChannelProfile(channel?: string): ChannelProfile {
  return CHANNEL_PROFILES[channel ?? 'cli'] ?? CLI_PROFILE;
}
