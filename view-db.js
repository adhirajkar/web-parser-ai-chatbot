import { ChromaClient } from "chromadb";

const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});

async function viewData() {
  try {
    const collection = await chromaClient.getCollection({
      name: "WEB_SCRAPED_DATA",
      embeddingFunction: null,
    });

    // Get collection info
    const count = await collection.count();
    console.log(`\n📊 Collection: WEB_SCRAPED_DATA`);
    console.log(`📝 Total chunks: ${count}\n`);

    if (count === 0) {
      console.log("No data found in collection.");
      return;
    }

    // Get all data (limit to first 100 for display)
    const results = await collection.get({
      limit: 100,
    });

    console.log("=" .repeat(80));

    // Group by URL
    const urlGroups = {};
    results.ids.forEach((id, idx) => {
      const metadata = results.metadatas[idx];
      const url = metadata.url;

      if (!urlGroups[url]) {
        urlGroups[url] = [];
      }

      urlGroups[url].push({
        id,
        head: metadata.head,
        body: metadata.body,
      });
    });

    // Display grouped by URL
    Object.entries(urlGroups).forEach(([url, chunks]) => {
      console.log(`\n🔗 URL: ${url}`);
      console.log(`   Chunks: ${chunks.length}`);
      console.log(`   Title: ${chunks[0].head || 'N/A'}`);

      chunks.forEach((chunk, idx) => {
        const preview = chunk.body.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   [${idx + 1}] ${preview}${chunk.body.length > 100 ? '...' : ''}`);
      });

      console.log("-".repeat(80));
    });

    console.log(`\n✓ Total URLs: ${Object.keys(urlGroups).length}`);
    console.log(`✓ Total chunks: ${count}`);

  } catch (error) {
    console.error("Error viewing data:", error.message);
  }
}

viewData();
