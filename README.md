# Web Parser AI Chatbot

A web scraper that ingests website content into a vector database and enables AI-powered Q&A use Open API.

> **Warning:** This tool uses web scraping to collect content. Only use it on your own websites or obtain explicit permission before scraping third-party websites. Respect robots.txt and website terms of service.

## Features

- Crawls websites recursively up to configurable depth
- Chunks and embeds content using OpenAI embeddings
- Stores embeddings in ChromaDB vector database
- Answers questions using GPT-4 with relevant context retrieval

## Prerequisites

- Node.js
- Docker (for ChromaDB)
- OpenAI API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your OpenAI API key:

```
OPENAI_API_KEY=your_api_key_here
```

3. Start ChromaDB:

```bash
docker-compose up -d
```

## Usage

Edit `index.js` to configure:

- `ingest("https://your-url.com")` - Scrape and ingest a website
- `chat("your question")` - Query the ingested content

Run the application:

```bash
npm start
```

## Configuration

- `MAX_DEPTH`: Maximum crawl depth (default: 3)
- `MAX_PAGES`: Maximum pages to scrape (default: 50)
- Chunk size: 1000 characters

## Scripts

- `npm run reset-db` - Reset the vector database collection
- `npm run read-db` - View database contents
