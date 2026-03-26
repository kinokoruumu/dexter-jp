import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { resolveEdinetCode } from './resolver.js';
import { api as edinetApi } from './api.js';
import { formatToolResult } from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * J-Quants API client for stock price data.
 * Optional — only works when JQUANTS_REFRESH_TOKEN is set.
 *
 * Auth flow: refresh_token → id_token (24h TTL) → Bearer auth on API calls.
 * Free plan: daily OHLC for all TSE-listed stocks.
 */

const JQUANTS_BASE = 'https://api.jquants-pro.com/v2';

let cachedIdToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Get or refresh J-Quants ID token.
 */
async function getJQuantsToken(): Promise<string> {
  const refreshToken = process.env.JQUANTS_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error('JQUANTS_REFRESH_TOKEN not set');
  }

  // Reuse if token is still valid (refresh 1h before expiry)
  if (cachedIdToken && Date.now() < tokenExpiresAt - 3600_000) {
    return cachedIdToken;
  }

  const response = await fetch(`${JQUANTS_BASE}/token/auth_refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshtoken: refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`J-Quants auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { idToken: string };
  cachedIdToken = data.idToken;
  // ID token is valid for 24h
  tokenExpiresAt = Date.now() + 23 * 3600_000;
  logger.info('[J-Quants] Token refreshed');
  return cachedIdToken;
}

/**
 * Call J-Quants API with auto-authentication.
 */
async function jquantsGet(
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<Record<string, unknown>> {
  const token = await getJQuantsToken();
  const url = new URL(`${JQUANTS_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`J-Quants API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Resolve ticker to J-Quants code format (5 digits, e.g. "72030").
 * J-Quants uses 5-digit codes; EDINET/TSE uses 4-digit.
 */
async function resolveJQuantsCode(ticker: string): Promise<string> {
  // If already 5 digits, use as-is
  if (/^\d{5}$/.test(ticker)) return ticker;

  // If 4 digits, append "0" (standard J-Quants format)
  if (/^\d{4}$/.test(ticker)) return ticker + '0';

  // Otherwise resolve through EDINET DB to get secCode
  const edinetCode = await resolveEdinetCode(ticker);
  const { data: response } = await edinetApi.get(`/companies/${edinetCode}`, {});
  const company = (response.data || response) as Record<string, unknown>;
  // Company detail endpoint returns sec_code in snake_case
  const secCode = (company.sec_code || company.secCode) as string | undefined;
  if (!secCode) throw new Error(`No securities code found for ${ticker}`);
  // sec_code from EDINET is 4 digits; J-Quants needs 5
  return secCode.replace(/\D/g, '').slice(0, 4) + '0';
}

// ============================================================================
// Tools
// ============================================================================

export const STOCK_PRICE_DESCRIPTION = `
Fetches current and historical stock prices for Japanese equities from J-Quants (Tokyo Stock Exchange official data). Includes OHLC, volume, and split-adjusted prices.

**Requires:** JQUANTS_REFRESH_TOKEN environment variable.

## When to Use

- Current stock price (latest close, volume, market data)
- Historical OHLC price data over a date range
- Price trend analysis

## When NOT to Use

- Company financials or ratios (use get_financials)
- Securities report content (use read_filings)
- Company screening (use company_screener)
`.trim();

const StockPriceInputSchema = z.object({
  ticker: z
    .string()
    .describe(
      "Securities code (e.g. '7203' for Toyota), company name, or EDINET code."
    ),
  from: z
    .string()
    .optional()
    .describe('Start date (YYYY-MM-DD). If omitted, returns latest data.'),
  to: z
    .string()
    .optional()
    .describe('End date (YYYY-MM-DD). If omitted, defaults to today.'),
});

export const getStockPrice = new DynamicStructuredTool({
  name: 'get_stock_price',
  description: `Fetches stock price data for a Japanese equity from J-Quants (TSE official data). Returns OHLC, volume, and split-adjusted prices. Specify date range for historical data, or omit for the latest available price.`,
  schema: StockPriceInputSchema,
  func: async (input) => {
    const code = await resolveJQuantsCode(input.ticker);

    const params: Record<string, string | undefined> = {
      code,
      from: input.from,
      to: input.to,
    };

    const data = await jquantsGet('/prices/daily_quotes', params);
    const quotes = data.daily_quotes as Array<Record<string, unknown>> | undefined;

    if (!quotes || quotes.length === 0) {
      return formatToolResult({ error: `No price data found for ${input.ticker}` }, []);
    }

    // For single-day / latest queries, return just the most recent
    if (!input.from && !input.to) {
      const latest = quotes[quotes.length - 1];
      return formatToolResult({
        code: latest.Code,
        date: latest.Date,
        open: latest.AdjustmentOpen,
        high: latest.AdjustmentHigh,
        low: latest.AdjustmentLow,
        close: latest.AdjustmentClose,
        volume: latest.AdjustmentVolume,
        turnover: latest.TurnoverValue,
      }, []);
    }

    // For date ranges, return compact array
    const compact = quotes.map((q) => ({
      date: q.Date,
      open: q.AdjustmentOpen,
      high: q.AdjustmentHigh,
      low: q.AdjustmentLow,
      close: q.AdjustmentClose,
      volume: q.AdjustmentVolume,
    }));

    return formatToolResult(compact, []);
  },
});

/**
 * Check if J-Quants is available (JQUANTS_REFRESH_TOKEN is set).
 */
export function isJQuantsAvailable(): boolean {
  return Boolean(process.env.JQUANTS_REFRESH_TOKEN);
}
