import OpenAI from "openai";
import "dotenv/config";
import { chunkText, scrapeWebpage } from "./utils/helper.js";
import { ChromaClient } from "chromadb";

const openai = new OpenAI();
const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});
await chromaClient.heartbeat();

async function generateVectorEmbeddings({ text }) {
  const MAX_CHARS = 30000;
  const truncatedText =
    text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;

  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedText,
    encoding_format: "float",
  });
  return embedding.data[0].embedding;
}

const WEB_COLLECTION = `WEB_SCRAPED_DATA`;
async function insertIntoDb({ embedding, url, body = "", head }) {
  const collection = await chromaClient.getOrCreateCollection({
    name: WEB_COLLECTION,
    embeddingFunction: null,
  });

  const id = `${url}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await collection.add({
    ids: [id],
    embeddings: [embedding],
    metadatas: [{ url, body, head }],
  });
}

const visitedUrls = new Set();
const MAX_DEPTH = 3;
const MAX_PAGES = 50;

async function ingest(url = "", depth = 0) {
  if (depth > MAX_DEPTH) {
    console.log(`Skipping ${url} - max depth reached`);
    return;
  }

  if (visitedUrls.size >= MAX_PAGES) {
    console.log(`Skipping ${url} - max pages limit reached`);
    return;
  }

  const nonHtmlExtensions = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".mp4",
    ".zip",
    ".exe",
  ];
  if (nonHtmlExtensions.some((ext) => url.toLowerCase().endsWith(ext))) {
    console.log(`Skipping ${url} - non-HTML file`);
    return;
  }

  const normalizedUrl = url.split("#")[0].replace(/\/$/, "");

  if (visitedUrls.has(normalizedUrl)) {
    console.log(`Skipping ${url} - already visited`);
    return;
  }

  visitedUrls.add(normalizedUrl);
  console.log(
    `Ingesting [${depth}/${MAX_DEPTH}] (${visitedUrls.size}/${MAX_PAGES}): ${url}`
  );

  try {
    const { head, body, internalLinks } = await scrapeWebpage(url);

    if (!body || body.length === 0) {
      console.log(`Skipping ${url} - empty content`);
      return;
    }

    const bodyChunks = chunkText(body, 1000);

    for (const chunk of bodyChunks) {
      if (!chunk || chunk.trim().length === 0) continue;

      const bodyEmbedding = await generateVectorEmbeddings({ text: chunk });
      await insertIntoDb({
        embedding: bodyEmbedding,
        url,
        head,
        body: chunk,
      });
    }

    console.log(`Ingested successfully: ${url} (${bodyChunks.length} chunks)`);

    for (const link of internalLinks) {
      await ingest(link, depth + 1);
    }
  } catch (error) {
    console.error(`Error ingesting ${url}:`, error.message);
  }
}

async function chat(query = "") {
  const embeddings = await generateVectorEmbeddings({ text: query });
  console;
  const collection = await chromaClient.getOrCreateCollection({
    name: WEB_COLLECTION,
  });
  const collectionResult = await collection.query({
    nResults: 1,
    queryEmbeddings: [embeddings],
  });

  const body = collectionResult.metadatas[0]
    .map((e) => e.body)
    .filter((e) => e.trim() !== "" && !!e);

  const url = collectionResult.metadatas[0]
    .map((e) => e.url)
    .filter((e) => e.trim() !== "" && !!e);

  const response = await openai.chat.completions.create({
    model: "chatgpt-4o-latest",
    messages: [
      {
        role: "system",
        content:
          "You are an AI support agent expert in providing support for the webpage content given to you. Reply accordingly to the user.",
      },
      {
        role: "user",
        content: `
                Query: ${query}\n\n
                URLs: ${url.join(",")}
                Retrived content of webpage: ${body.join(", ")}
            `,
      },
    ],
  });

  console.log("🤖: ", response.choices[0].message.content);
}

// ingest("https://adhiraj.lol");
chat("Who is Adhiraj?");
