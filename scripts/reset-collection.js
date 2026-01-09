import { ChromaClient } from "chromadb";

const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});

async function resetCollection() {
  try {
    await chromaClient.deleteCollection({ name: "WEB_SCRAPED_DATA" });
    console.log("✓ Collection 'WEB_SCRAPED_DATA' deleted successfully");
  } catch (error) {
    console.log("Collection doesn't exist or already deleted:", error.message);
  }
}

resetCollection();
