import axios from "axios";
import * as cheerio from "cheerio";

export function chunkText(text, chunkSize) {
  if (!text || chunkSize <= 0) return [];

  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

export async function scrapeWebpage(url = "") {
  const { data } = await axios.get(url);

  const $ = cheerio.load(data);

  const pageTitle = $("title").text();
  const pageDescription = $('meta[name="description"]').attr("content") || "";
  const pageHead = `${pageTitle} ${pageDescription}`.trim();

  $("script, style, noscript").remove();
  const pageBody = $("body").text().replace(/\s+/g, " ").trim();

  let internalLinks = new Set();
  let externalLinks = new Set();

  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  $("a").each((_, ele) => {
    const link = $(ele).attr("href");
    if (!link || link === "/" || link === "#") return;

    if (link.startsWith("http://") || link.startsWith("https://")) {
      if (link.startsWith(baseUrl)) {
        internalLinks.add(link);
      } else {
        externalLinks.add(link);
      }
    } else if (link.startsWith("/")) {
      internalLinks.add(`${baseUrl}${link}`);
    } else if (!link.startsWith("#")) {
      const fullUrl = new URL(link, url).href;
      if (fullUrl.startsWith(baseUrl)) {
        internalLinks.add(fullUrl);
      }
    }
  });

  return {
    head: pageHead,
    body: pageBody,
    internalLinks: Array.from(internalLinks),
    externalLinks: Array.from(externalLinks),
  };
}
