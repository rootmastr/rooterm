import axios from 'axios';

class OllamaService {
  constructor() {
    // Rigid configuration to use remote server only as requested by user
    this.baseUrl = 'http://111.68.31.232:11434';
    this.model = 'llama3:latest'; // Use the exact tag found on server
    this.timeout = 120000; // Increased to 120s (2 min) for remote loading
  }

  /**
   * Generates a streaming response from the remote Ollama server
   */
  async generateStream(prompt, onChunk) {
    console.log(`[Ollama] Attempting connection to ${this.baseUrl} with model ${this.model}...`);
    try {
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/api/generate`,
        data: {
          model: this.model,
          prompt: prompt,
          stream: true
        },
        responseType: 'stream',
        timeout: this.timeout,
        proxy: false, // Ensure direct connection
        headers: { 'Accept': 'application/x-ndjson' }
      });

      console.log(`[Ollama] Stream connection established. Waiting for chunks...`);

      let buffer = '';
      let chunkCount = 0;

      return new Promise((resolve, reject) => {
        const streamTimeout = setTimeout(() => {
          if (chunkCount === 0) {
            reject(new Error("Remote server connected but sent no data for 120s."));
          }
        }, 120000);

        response.data.on('data', chunk => {
          chunkCount++;
          const chunkStr = chunk.toString();
          console.log(`[Ollama] Received chunk #${chunkCount} (${chunkStr.length} chars)`);

          buffer += chunkStr;
          let lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              onChunk(parsed);
            } catch (e) {
              console.error('[Ollama] JSON parse error on line:', e.message);
            }
          }
        });

        response.data.on('end', () => {
          clearTimeout(streamTimeout);
          console.log(`[Ollama] Stream ended. Total chunks: ${chunkCount}`);
          if (buffer.trim()) {
            try { onChunk(JSON.parse(buffer)); } catch (e) { }
          }
          resolve();
        });

        response.data.on('error', err => {
          clearTimeout(streamTimeout);
          console.error('[Ollama] Stream error:', err.message);
          reject(err);
        });
      });
    } catch (error) {
      console.error('[Ollama] Connection Failed:', error.message);
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection Refused: Remote server ${this.baseUrl} is not accepting connections on port 11434.`);
      }
      throw error;
    }
  }

  async generate(prompt, stream = false) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: stream
      }, {
        timeout: this.timeout,
        proxy: false
      });
      return response.data;
    } catch (error) {
      console.error('[Ollama] Direct call error:', error.message);
      throw error;
    }
  }

  /**
   * Generates embeddings for the RAG system using nomic-embed-text
   */
  async getEmbedding(text, embeddingModel = 'nomic-embed-text') {
    try {
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/api/embeddings`,
        data: {
          model: embeddingModel,
          prompt: text
        },
        timeout: this.timeout,
        proxy: false
      });
      return response.data;
    } catch (error) {
      console.error('[Ollama] Embedding failed:', error.message);
      throw error;
    }
  }

  async ask(prompt) {
    const result = await this.generate(prompt, false);
    return result.response;
  }
}

export default new OllamaService();
