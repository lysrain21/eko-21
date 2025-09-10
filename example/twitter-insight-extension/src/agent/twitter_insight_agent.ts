import { Agent, AgentContext } from '@eko-ai/eko';
import type { JSONSchema7, Tool, ToolResult } from '@eko-ai/eko/dist/types';

type KeywordCount = { term: string; count: number };

// Use official Tool/ToolResult types from eko-core

function tokenize(text: string): string[] {
  // Compatible tokenizer (no Unicode property escapes). Covers ASCII + basic CJK.
  const stop = new Set([
    'the','and','for','are','with','that','this','you','your','from','have','has','will','was','were','they','them','his','her',
    'its','our','out','but','not','all','any','can','just','like','about','into','over','than','then','more','most','some','such',
    'on','in','at','to','of','a','an','is','it','be','as','by','or','if','we','i','me','my','rt','via','amp'
  ]);
  const cleaned = text.toLowerCase().replace(/https?:\/\/\S+/g, ' ');
  const tokens = cleaned.match(/[a-z0-9_\u4e00-\u9fa5]+/g) || [];
  return tokens.filter((t) => t && t.length >= 2 && !stop.has(t) && !/^\d+$/.test(t));
}

function countTerms(texts: string[], minCount = 5): KeywordCount[] {
  const freq = new Map<string, number>();
  for (const t of texts) {
    for (const tok of tokenize(t)) {
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  const arr: KeywordCount[] = [];
  for (const [term, count] of freq.entries()) {
    if (count >= minCount) arr.push({ term, count });
  }
  arr.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  return arr;
}

export default class TwitterInsightAgent extends Agent {
  public constructor(llms?: string[]) {
    const tools: Tool[] = [
      {
        name: 'analyze_following_keywords',
        description:
          'Open the Following feed on X(Twitter), collect tweets from the first 3 followings in the last 7 days, and return sorted keywords (>= 2).',
        parameters: {
          type: 'object',
          properties: {
            minCount: { type: 'number', default: 2 },
            topN: { type: 'number', default: 3 },
          },
        },
        execute: async (_args: Record<string, unknown>, _agentContext: AgentContext): Promise<ToolResult> => {
          const minCount = 2; // enforce business rule
          const topN = 3;     // enforce business rule
          const posts: string[] = await this.collectFromContentScript('collect_following_top_posts', 7, topN);
          const keywords = countTerms(posts, minCount);
          return await this.callInnerTool(async () => ({ postsCount: posts.length, keywords }));
        },
      },
      {
        name: 'collect_my_posts',
        description: 'Open your profile on X(Twitter) and collect your tweets (last 7 days).',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async (_args: Record<string, unknown>, _agentContext: AgentContext): Promise<ToolResult> => {
          const posts: string[] = await this.collectFromContentScript('collect_my_posts', 7);
          return await this.callInnerTool(async () => ({ postsCount: posts.length, posts }));
        },
      },
    ];

    super({
      name: 'TwitterInsightAgent',
      description:
        "Analyze followings' recent tweets to extract high-frequency keywords and draft posts in user's style.",
      tools,
      llms,
      planDescription:
        '1) Use analyze_following_keywords(minCount=2, topN=3) to get top keywords from the first 3 followings in last 7 days. '
        + "2) Use collect_my_posts() to get user's tweets to learn style (last 7 days). "
        + "3) Draft new posts about top 3 keywords imitating user's style. "
        + 'Return the analysis summary and 1-3 polished post drafts.',
    });
  }

  private async collectFromContentScript(action: 'collect_following_top_posts' | 'collect_my_posts', lastDays: number, topN?: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (!tabId) {
            reject(new Error('No active tab'));
            return;
          }
          const since = Date.now() - lastDays * 24 * 60 * 60 * 1000;
          const payload: any = { type: action, since };
          if (typeof topN === 'number') payload.topN = topN;
          chrome.tabs.sendMessage(tabId, payload, (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve((resp && resp.posts) || []);
          });
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
