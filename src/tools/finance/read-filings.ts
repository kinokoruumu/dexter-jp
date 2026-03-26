import { DynamicStructuredTool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { resolveEdinetCode } from './resolver.js';
import { formatToolResult } from '../types.js';
import { getTextBlocks } from './text-blocks.js';
import { getShareholders } from './shareholders.js';

/**
 * Rich description for the read_filings tool.
 */
export const READ_FILINGS_DESCRIPTION = `
Intelligent meta-tool for reading Japanese securities report content. Retrieves text sections from annual securities reports (有価証券報告書) or shareholder data.

## When to Use

- Reading annual securities reports (business overview, risk factors, management analysis, strategy)
- Analyzing business risks and challenges
- Understanding management's discussion and analysis (MD&A)
- Company strategy and outlook
- Ownership structure and major shareholders

## When NOT to Use

- Structured financial data (use get_financials)
- Financial metrics and ratios (use get_financials)
- Company screening (use company_screener)
- General web searches (use web_search)

## Usage Notes

- Provide a ticker (securities code like 7203, company name like 任天堂, or EDINET code like E02367)
- Set type to "text-blocks" for report text or "shareholders" for ownership data
- Returns full text sections from the most recent annual report
`.trim();

const ReadFilingsInputSchema = z.object({
  ticker: z
    .string()
    .describe(
      "Securities code (e.g. '7203'), company name (e.g. '任天堂', 'Sony'), or EDINET code (e.g. 'E02367')."
    ),
  type: z
    .enum(['text-blocks', 'shareholders'])
    .optional()
    .describe(
      "Type of data to retrieve: 'text-blocks' for report text (business overview, risks, MD&A, strategy), 'shareholders' for ownership data (大量保有報告書)."
    ),
});

/**
 * Create a read_filings tool that retrieves text blocks from securities reports.
 */
export function createReadFilings(_model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'read_filings',
    description: `Reads Japanese securities report content. Provide a ticker and type to retrieve:
- text-blocks: Annual report text (事業の状況, 事業等のリスク, 経営者による分析, 経営方針)
- shareholders: Large shareholding reports (大量保有報告書, 5%+ holders)`,
    schema: ReadFilingsInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.(`Resolving ${input.ticker}...`);
      let edinetCode: string;
      try {
        edinetCode = await resolveEdinetCode(input.ticker);
      } catch {
        return formatToolResult(
          { error: `Could not find company: ${input.ticker}` },
          [],
        );
      }

      if (input.type === 'shareholders') {
        onProgress?.('Fetching shareholder data...');
        try {
          const result = await getShareholders.invoke({ ticker: edinetCode });
          const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result));
          return formatToolResult(parsed.data, parsed.sourceUrls || []);
        } catch (error) {
          return formatToolResult(
            { error: 'Failed to fetch shareholder data', details: error instanceof Error ? error.message : String(error) },
            [],
          );
        }
      }

      // Default: fetch text blocks from annual report
      onProgress?.('Reading securities report...');
      try {
        const result = await getTextBlocks.invoke({ ticker: edinetCode });
        const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result));
        return formatToolResult(parsed.data, parsed.sourceUrls || []);
      } catch (error) {
        return formatToolResult(
          { error: 'Failed to read securities report', details: error instanceof Error ? error.message : String(error) },
          [],
        );
      }
    },
  });
}
