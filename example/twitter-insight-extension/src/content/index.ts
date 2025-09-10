// Content script: scrape tweets from X(Twitter)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function withinSince(timeEl: HTMLTimeElement, sinceMs: number): boolean {
  const dt = timeEl.getAttribute("datetime");
  if (!dt) return false;
  const t = new Date(dt).getTime();
  return t >= sinceMs;
}

function extractVisibleTweetText(article: Element): string | null {
  // Heuristic: Twitter/X renders tweet text in elements with data-testid="tweetText"
  const textNodes = article.querySelectorAll('[data-testid="tweetText"]');
  if (textNodes && textNodes.length > 0) {
    return Array.from(textNodes)
      .map((n) => (n as HTMLElement).innerText)
      .join("\n")
      .trim();
  }
  // fallback to visible text in the article
  const t = (article as HTMLElement).innerText?.trim();
  return t || null;
}

async function scrollAndCollect(sinceMs: number, maxScrolls = 20): Promise<string[]> {
  const posts: string[] = [];
  let lastCount = -1;
  for (let i = 0; i < maxScrolls; i++) {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    for (const a of articles) {
      const timeEl = a.querySelector("time");
      if (!timeEl) continue;
      if (!withinSince(timeEl as HTMLTimeElement, sinceMs)) continue;
      const text = extractVisibleTweetText(a);
      if (text) posts.push(text);
    }
    if (posts.length === lastCount) break; // no progress
    lastCount = posts.length;
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as ScrollBehavior });
    await sleep(1200);
  }
  return Array.from(new Set(posts));
}

async function openFollowingFeed(): Promise<void> {
  const href = location.href;
  if (!/x\.com|twitter\.com/.test(href)) return;
  // Ensure we're on Home
  if (!/\/home/.test(location.pathname)) {
    location.assign("/home");
    await sleep(1500);
  }
  // Try to select Following tab across locales
  const labels = [
    /Following/i,
    /关注中|正在关注|關注中/,
    /フォロー中/,
    /Suivi|Abonnements/,
    /Siguiendo|Seguendo/,
  ];
  for (let t = 0; t < 5; t++) {
    const tabs = Array.from(
      document.querySelectorAll('div[role="tablist"] a[role="tab"]')
    ) as HTMLAnchorElement[];
    const following = tabs.find((a) => labels.some((re) => re.test(a.innerText)));
    if (following) {
      if (following.getAttribute("aria-selected") !== "true") {
        following.click();
        await sleep(1500);
      }
      break;
    }
    await sleep(500);
  }
}

async function openMyProfile(): Promise<void> {
  // Try to click profile from left sidebar if available; otherwise noop.
  const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') as HTMLAnchorElement | null;
  if (profileLink) {
    profileLink.click();
    await sleep(1500);
  }
}

function extractAuthorHandle(article: Element): string | null {
  // Heuristic: user name block
  const userBlock = article.querySelector('div[data-testid="User-Name"] a[href^="/"]') as HTMLAnchorElement | null;
  if (userBlock && userBlock.getAttribute('href')) {
    return userBlock.getAttribute('href')!; // like "/jack"
  }
  return null;
}

async function collectFollowingTopPosts(sinceMs: number, topN: number = 3, maxScrolls = 30): Promise<string[]> {
  await openFollowingFeed();
  const postsByAuthor = new Map<string, string[]>();
  let uniqueAuthors: string[] = [];
  let lastScrollCount = -1;
  for (let i = 0; i < maxScrolls; i++) {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    for (const a of articles) {
      const timeEl = a.querySelector('time') as HTMLTimeElement | null;
      if (!timeEl || !withinSince(timeEl, sinceMs)) continue;
      const author = extractAuthorHandle(a);
      if (!author) continue;
      if (!uniqueAuthors.includes(author)) {
        uniqueAuthors.push(author);
      }
      if (uniqueAuthors.length > topN) continue; // only first topN authors encountered
      const text = extractVisibleTweetText(a);
      if (!text) continue;
      const arr = postsByAuthor.get(author) || [];
      arr.push(text);
      postsByAuthor.set(author, arr);
    }
    if (uniqueAuthors.length >= topN) {
      // still scroll a bit more to gather more tweets from these authors
    }
    const count = Array.from(postsByAuthor.values()).reduce((s, v) => s + v.length, 0);
    if (count === lastScrollCount) break;
    lastScrollCount = count;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior });
    await sleep(1200);
  }
  // flatten
  const result: string[] = [];
  for (const author of uniqueAuthors.slice(0, topN)) {
    const arr = postsByAuthor.get(author) || [];
    for (const t of arr) result.push(t);
  }
  return Array.from(new Set(result));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === 'ping') {
        sendResponse({ ok: true, pong: 'pong' });
        return;
      }
      if (msg?.type === "collect_following_posts") {
        const since = typeof msg.since === "number" ? msg.since : Date.now() - 7 * 86400000;
        await openFollowingFeed();
        const posts = await scrollAndCollect(since);
        sendResponse({ ok: true, posts });
      } else if (msg?.type === 'collect_following_top_posts') {
        const since = typeof msg.since === 'number' ? msg.since : Date.now() - 7 * 86400000;
        const topN = typeof msg.topN === 'number' ? msg.topN : 3;
        const posts = await collectFollowingTopPosts(since, topN);
        sendResponse({ ok: true, posts });
      } else if (msg?.type === "collect_my_posts") {
        const since = typeof msg.since === "number" ? msg.since : Date.now() - 7 * 86400000;
        await openMyProfile();
        const posts = await scrollAndCollect(since);
        sendResponse({ ok: true, posts });
      }
    } catch (e: any) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true; // async response
});
