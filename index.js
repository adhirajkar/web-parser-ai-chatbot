import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import "dotenv/config";
import { chunkText } from "./helper.js";
import { ChromaClient } from "chromadb";

const openai = new OpenAI();
const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});
await chromaClient.heartbeat();

async function scrapeWebpage(url = "") {
  const { data } = await axios.get(url);

  const $ = cheerio.load(data);
  const pageHead = $("head").html();
  const pageBody = $("body").html();

  let internalLinks = new Set();
  let externalLinks = new Set();

  $("a").each((_, ele) => {
    const link = $(ele).attr("href");
    if (link == "/") return;
    if (link.startsWith("https") || link.startsWith("https")) {
      externalLinks.add(link);
    } else {
      internalLinks.add(link);
    }
  });

  return {
    head: pageHead,
    body: pageBody,
    internalLinks: Array.from(internalLinks),
    externalLinks: Array.from(externalLinks),
  };
}

async function generateVectorEmbeddings({ text }) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return embedding.data[0].embedding;
}

const WEB_COLLECTION = `WEB_SCRAPED_DATA`;
async function insertIntoDb({ embedding, url, body = "", head }) {
  const collection = await chromaClient.getOrCreateCollection({
    name: WEB_COLLECTION,
  });
  await collection.add({
    ids: [url],
    embeddings: [embedding],
    metadatas: [{ url, body, head }],
  });
}
async function ingest(url = "") {
  console.log("Ingesting ", url);
  const { head, body, internalLinks } = await scrapeWebpage(url);
  const bodyChunks = chunkText(body, 1000);

  //   const headEmbedding = await generateVectorEmbeddings({ text: head });
  //   await insertIntoDb({
  //     embedding: headEmbedding,
  //     url,
  //   });
  for (const chunk of bodyChunks) {
    const bodyEmbedding = await generateVectorEmbeddings({ text: chunk });
    await insertIntoDb({
      embedding: bodyEmbedding,
      url,
      head,
      body: chunk,
    });
  }

  for (const link of internalLinks) {
    const _url = `${url}${link}`;
    await ingest(_url);
  }

  console.log(`Ingesting success `, url);
}

ingest("https://adhiraj.lol");
