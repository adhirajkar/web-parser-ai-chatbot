import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import "dotenv/config";
import { chunkText } from "./helper.js";

const openai = new OpenAI();

async function scrapeWebpage(url = "") {
  const { data } = await axios.get(url);

  const $ = cheerio.load(data);
  const pageHead = $("head").html();
  const pageBody = $("body").html();

  let internalLinks = [];
  let externalLinks = [];

  $("a").each((_, ele) => {
    const link = $(ele).attr("href");
    if (link == "/") return;
    if (link.startsWith("https") || link.startsWith("https")) {
      externalLinks.push(link);
    } else {
      internalLinks.push(link);
    }
  });

  return { head: pageHead, body: pageBody, internalLinks, externalLinks };
}

async function generateVectorEmbeddings({ text }) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: "Your text string goes here",
    encoding_format: "float",
  });
  return embedding.data[0].embedding;
}

async function ingest(url = "") {
  const { head, body, internalLinks } = await scrapeWebpage(url);
  const bodyChunks = chunkText(body, 2000);

  const headEmbedding = await generateVectorEmbeddings({ text: head });
  for (const chunk of bodyChunks) {
    const bodyEmbedding = await generateVectorEmbeddings({ text: chunk });
  }
}

scrapeWebpage("https://adhiraj.lol").then(console.log);
