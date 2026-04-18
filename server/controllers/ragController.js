import ragService from '../services/rag/ragService.js';
import contextService from '../services/contextService.js';
import safetyService from '../services/safetyService.js';
import learningService from '../services/learningService.js';

class RAGController {
  
  /**
   * Ingest text manually or from scrapers
   */
  async ingest(req, res) {
    const { text, source } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text content is required for ingestion.' });
    }

    try {
      const success = await ragService.ingestDocument(text, { source: source || 'manual_input' });
      if (success) {
        return res.json({ success: true, message: 'Document ingested and vectorized successfully.' });
      } else {
        return res.status(500).json({ success: false, message: 'Failed to process document chunks.' });
      }
    } catch (e) {
      console.error('[RAG Controller] Ingest Error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  /**
   * Endpoint for Self-Improving Feedback Loop
   */
  async submitFeedback(req, res) {
    const { sessionId, originalQuery, command, output, isError } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required for feedback.' });
    }

    try {
      const result = await learningService.processFeedback(sessionId, originalQuery, command, output, isError);
      return res.json(result);
    } catch (e) {
      console.error('[RAG Controller] Feedback Error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  /**
   * Generate an answer using RAG context
   */
  async handleQuery(req, res) {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Set headers for SSE so it behaves like ChatGPT (similar to standard AI stream)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      res.write(`data: ${JSON.stringify({ chunk: "Connected to RAG system... 📚\n\n" })}\n\n`);
      
      // Get System Context
      res.write(`data: ${JSON.stringify({ chunk: "Retrieving server context...\n\n" })}\n\n`);
      const session = sessionId ? contextService.contexts.get(sessionId) : null;
      let sysContext = null;
      if (sessionId) {
        try {
          sysContext = await (contextService.getContext(sessionId) || contextService.collectContext(sessionId));
        } catch(e) {}
      }
      
      const serverContextString = sysContext 
         ? `OS: ${sysContext.os}, Kernel: ${sysContext.kernel}` 
         : '';

      res.write(`data: ${JSON.stringify({ chunk: "Searching internal vector knowledge base... 🔍\n\n" })}\n\n`);

      // Retrieve knowledge context
      const relevantDocs = await ragService.retrieveContext(message, 3);
      if (relevantDocs.length === 0) {
        res.write(`data: ${JSON.stringify({ chunk: "No specific context found. Relying on base model... 🧠\n\n" })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ chunk: `Found ${relevantDocs.length} relevant documents. Generating response...\n\n` })}\n\n`);
      }

      // Inject learning-optimized system prompt
      const optimizedPromptBase = await learningService.getOptimizedSystemPrompt(serverContextString);
      const combinedContext = `${optimizedPromptBase}\n\nServer Info: ${serverContextString}`;
      
      const finalResult = await ragService.generateAnswer(message, combinedContext);
      const safetyCheck = safetyService.analyzeCommand(finalResult.command);
      
      res.write(`data: ${JSON.stringify({ chunk: finalResult.explanation + '\n\n' })}\n\n`);
      
      res.write(`data: ${JSON.stringify({ 
         done: true, 
         command: finalResult.command, 
         safety: { 
            isDangerous: safetyCheck.isDangerous,
            risk: safetyCheck.risk,
            description: safetyCheck.description
         }
      })}\n\n`);
      res.end();

    } catch (e) {
      console.error('[RAG Controller] Query Error:', e.message);
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  }

}

export default new RAGController();
