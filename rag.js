const fs = require('fs');
const { ChromaClient } = require('chromadb');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function readTextFile() {
  return fs.readFileSync('ps26_3.txt', 'utf8');
}

function chunkText(text, chunkSize = 500, overlap = 100) {
  const words = text.split(' ');
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    i += chunkSize - overlap;
  }
  return chunks;
}

async function getEmbedding(text) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Convert this text to a simple numeric signature. Return ONLY a JSON array of 10 numbers between -1 and 1 that represent the key themes of this text. No explanation, just the array.
      
Text: ${text.slice(0, 200)}`
    }]
  });
  
  try {
    return JSON.parse(response.content[0].text);
  } catch {
    return Array(10).fill(0).map(() => Math.random() * 2 - 1);
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

async function main() {
  console.log('Connecting to ChromaDB...');
  const client = new ChromaClient({ 
    host: 'localhost',
    port: 8000,
    ssl: false
  });

  const heartbeat = await client.heartbeat();
  console.log('ChromaDB connected. Heartbeat:', heartbeat);

  console.log('\nReading and chunking document...');
  const text = readTextFile();
  const chunks = chunkText(text);
  console.log(`Created ${chunks.length} chunks`);

  console.log('\nGenerating embeddings for chunks...');
  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding chunk ${i + 1} of ${chunks.length}...`);
    const embedding = await getEmbedding(chunks[i]);
    embeddings.push(embedding);
  }

  console.log('\nStoring in ChromaDB...');
  const collection = await client.getOrCreateCollection({ 
    name: 'ps263v2',
    embeddingFunction: null
  });

  await collection.add({
    ids: chunks.map((_, i) => `chunk_${i}`),
    documents: chunks,
    embeddings: embeddings
  });

  console.log('Chunks stored successfully');

  console.log('\nQuerying...');
 const question = 'What are the SMCR requirements for firms?';
  console.log('Question:', question);
  
  const questionEmbedding = await getEmbedding(question);
  
  const results = await collection.query({
    queryEmbeddings: [questionEmbedding],
    nResults: 2
  });
console.log('\n--- SIMILARITY SCORES ---');
results.distances[0].forEach((distance, i) => {
  console.log(`Chunk ${i + 1} distance: ${distance.toFixed(4)}`);
});
  const context = results.documents[0].join('\n\n---\n\n');

  console.log('\nAsking Claude...');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Answer the question using ONLY the context below. If the answer is not in the context, say "I cannot find this in the document."

CONTEXT:
${context}

QUESTION: ${question}`
    }]
  });

  console.log('\n--- ANSWER ---');
  console.log(response.content[0].text);
}

main();