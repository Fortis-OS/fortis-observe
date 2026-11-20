/**
 * Bot rules for incoming page views. The tracker only fires from the
 * portfolio's JavaScript, so plain crawlers rarely reach it; what does get
 * through is headless browsers, link-preview fetchers, uptime monitors,
 * scripts, and anything running from a datacenter.
 *
 * Keep DATACENTER_ISPS in step with supabase/migrations/20261121_bots_privacy_uptime.sql,
 * which applies the same rules to older rows.
 */

// User agents that announce automation
const BOT_UA = new RegExp(
    [
        "bot\\b", "bot/", "crawl", "spider", "slurp", "scrap", "fetch",
        "headless", "phantomjs", "puppeteer", "playwright", "selenium", "webdriver",
        "lighthouse", "pagespeed", "gtmetrix", "pingdom", "uptime", "monitor", "statuscake", "checkly",
        // link-preview fetchers (the chat apps' own in-app browsers are left alone: real people use them)
        "facebookexternalhit", "facebookcatalog", "embedly", "preview",
        "skypeuripreview", "linkedinbot", "twitterbot", "redditbot", "applebot", "bingpreview",
        "python-requests", "python-urllib", "aiohttp", "httpx", "curl/", "wget/", "go-http-client",
        "java/", "okhttp", "axios/", "node-fetch", "undici", "libwww", "httpclient", "postman",
    ].join("|"),
    "i",
);

// Networks that are hosting providers, not people at home or on a phone
export const DATACENTER_ISPS = [
    "amazon", "aws", "google cloud", "google llc", "microsoft", "azure", "digitalocean", "ovh", "hetzner",
    "linode", "akamai", "alibaba", "tencent", "choopa", "vultr", "contabo", "oracle", "scaleway",
    "leaseweb", "m247", "datacamp", "hostinger", "ionos", "upcloud", "kamatera", "cherry servers",
    "fly.io", "render", "heroku", "netlify", "vercel", "cloudflare, inc", "fastly", "zenlayer",
];

export type BotVerdict = { bot: boolean; reason?: string };

export function classify(input: {
    userAgent: string;
    browser: string;
    isp: string;
    /** navigator.webdriver, sent by the portfolio; true for automated browsers */
    webdriver?: boolean;
}): BotVerdict {
    const ua = input.userAgent.trim();
    if (!ua) return { bot: true, reason: "no user agent" };
    if (input.webdriver) return { bot: true, reason: "navigator.webdriver" };
    if (/headless/i.test(input.browser)) return { bot: true, reason: "headless browser" };
    if (BOT_UA.test(ua)) return { bot: true, reason: "automation user agent" };
    const isp = input.isp.toLowerCase();
    if (DATACENTER_ISPS.some((name) => isp.includes(name))) return { bot: true, reason: "datacenter network" };
    return { bot: false };
}
