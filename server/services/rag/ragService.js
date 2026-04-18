import ollamaService from '../ollamaService.js';
import vectorStore from './vectorStore.js';

class RAGService {
  /**
   * Split text into smaller chunks for embeddings (poor man's recursive character text splitter)
   */
  chunkText(text, maxChunkSize = 500) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    return chunks;
  }

  /**
   * Ingest text into the Vector Store
   * Text source could be scraping, manual input, or logs
   */
  async ingestDocument(text, sourceMetadata = {}) {
    console.log(`[RAG] Ingesting document from source: ${sourceMetadata.source || 'unknown'}`);
    const chunks = this.chunkText(text);
    
    // We fetch embeddings sequentially to avoid hammering the local Ollama server
    const entries = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunkStr = chunks[i];
        try {
          // Note: using /api/embeddings from Ollama endpoint mapped in the service
          const embedRes = await ollamaService.getEmbedding(chunkStr);
          entries.push({
            text: chunkStr,
            metadata: { ...sourceMetadata, chunkIndex: i },
            embedding: embedRes.embedding
          });
        } catch (e) {
          console.warn(`[RAG] Failed to embed chunk ${i}: ${e.message}`);
        }
    }

    if (entries.length > 0) {
      vectorStore.add(entries);
      console.log(`[RAG] Successfully ingested ${entries.length} chunks.`);
      return true;
    }
    return false;
  }

  /**
   * Retrieve most similar chunks given a user query
   */
  async retrieveContext(query, topK = 3) {
    try {
      const queryEmbedRes = await ollamaService.getEmbedding(query);
      const queryEmbedding = queryEmbedRes.embedding;

      const results = vectorStore.search(queryEmbedding, topK);
      return results;
    } catch (e) {
      console.error(`[RAG] Retrieval failed: ${e.message}`);
      return [];
    }
  }

  /**
   * Build an augmented prompt and get response from Ollama
   */
  async generateAnswer(userQuery, systemContext = null) {
    // 1. Retrieve knowledge
    const relevantDocs = await this.retrieveContext(userQuery, 3);
    
    // 2. Build context blocks
    const contextContent = relevantDocs.map((doc, idx) => `[Doc ${idx + 1}]:\n${doc.text}`).join('\n\n');

    // 3. Assemble prompt
    const prompt = `You are an expert AI system assistant using a specialized Retrieval-Augmented Generation (RAG) system.
Below is the system environment and some retrieved knowledge context to help answer the user's query.
Base your response MAINLY on the Provided Context if it is relevant.

--- SERVER CONTEXT ---
${systemContext || 'None available'}

--- RETRIEVED KNOWLEDGE ---
${contextContent || 'No relevant knowledge found in vector store.'}

--- USER QUERY ---
${userQuery}

INSTRUCTION: 
Provide a strictly JSON formatted response with NO markdown formatting. Write the detailed explanation entirely in INDONESIAN language:
{ 
  "command": "executable command if applicable, or null", 
  "explanation": "penjelasan bahasa indonesia...", 
  "source": "rag" 
}`;

    // 4. Generate
    console.log(`[RAG] Asking LLM with augmented context (${relevantDocs.length} docs retrieved)...`);
    const rawAiResponse = await ollamaService.ask(prompt);
    
    return this.parseAIResponse(rawAiResponse);
  }

  parseAIResponse(raw) {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      return JSON.parse(jsonStr);
    } catch (e) {
      return { explanation: raw, command: null, source: "fallback" };
    }
  }
}

export default new RAGService();
