import fs from 'fs';
import path from 'path';

/**
 * Lightweight In-Memory Vector Database with Cosine Similarity
 * Stores embeddings and metadata, capable of persisting to disk.
 */
class VectorStore {
  constructor(filePath = path.join(process.cwd(), 'server', 'data', 'vector_store.json')) {
    this.filePath = filePath;
    this.vectors = [];
    this.index = new Map(); // Fast lookup by id
    this.loadFromDisk();
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  add(entries) {
    for (const entry of entries) {
      const id = entry.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const doc = {
        id,
        text: entry.text,
        metadata: entry.metadata || {},
        embedding: entry.embedding
      };
      
      this.vectors.push(doc);
      this.index.set(id, doc);
    }
    this.saveToDisk();
  }

  search(queryEmbedding, topK = 3) {
    if (this.vectors.length === 0) return [];

    const similarities = this.vectors.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort descending by score
    similarities.sort((a, b) => b.score - a.score);

    return similarities.slice(0, topK).map(doc => {
      const { embedding, ...rest } = doc; // Omit embedding in result for performance
      return rest;
    });
  }

  clear() {
    this.vectors = [];
    this.index.clear();
    this.saveToDisk();
  }

  saveToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.vectors));
    } catch (e) {
      console.error(`[VectorStore] Failed to save to disk:`, e.message);
    }
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.vectors = JSON.parse(data);
        this.vectors.forEach(doc => this.index.set(doc.id, doc));
        console.log(`[VectorStore] Loaded ${this.vectors.length} vectors from disk.`);
      }
    } catch (e) {
      console.error(`[VectorStore] Failed to load from disk:`, e.message);
    }
  }
}

export default new VectorStore();
