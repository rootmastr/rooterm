import ollamaService from '../services/ollamaService.js';
import internetService from '../services/internetService.js';
import contextService from '../services/contextService.js';
import safetyService from '../services/safetyService.js';

class AIController {
  /**
   * Main entry for AI queries
   * Feature 1, 3, 4, 5, 6 included
   */
  async handleQuery(req, res) {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      console.log(`[AI] Processing query: "${message}" for session: ${sessionId}`);

      // 1. Concurrent Fetching of Context (Feature 3 & 8)
      // We get server context and internet data in parallel
      const [serverContext, internetData] = await Promise.all([
        sessionId ? contextService.getContext(sessionId) || contextService.collectContext(sessionId) : Promise.resolve(null),
        internetService.fetchData(message)
      ]);

      // 2. Build the System Prompt (Feature 4)
      const systemPrompt = this.buildPrompt(message, serverContext, internetData);

      // 3. Generate AI Response via Ollama
      let aiRawResponse = await ollamaService.ask(systemPrompt);
      
      // 4. Parse Structured Output (Feature 5)
      const parsed = this.parseAIResponse(aiRawResponse);

      // 5. Safety Layer Verification (Feature 6)
      const safetyCheck = safetyService.analyzeCommand(parsed.command);
      
      const response = {
        answer: parsed.explanation,
        command: parsed.command,
        confidence: parsed.confidence || 0.85,
        safety: {
          isDangerous: safetyCheck.isDangerous,
          risk: safetyCheck.risk,
          description: safetyCheck.description
        }
      };

      res.json(response);

    } catch (error) {
      console.error('[AI Controller] Error:', error.message);
      res.status(500).json({ 
        error: error.message,
        answer: "I encountered a technical glitch while processing your request." 
      });
    }
  }

  /**
   * Constructs the expert prompting context
   * Feature 4 rules applied here
   */
  buildPrompt(userInput, serverInfo, internetData) {
    const contextLines = [];
    if (serverInfo) {
      contextLines.push(`SERVER ENVIRONMENT:
- OS: ${serverInfo.os}
- Kernel: ${serverInfo.kernel}
- RAM: ${serverInfo.ram}
- Disk: ${serverInfo.disk}
- Active User: ${serverInfo.user}`);
    }

    if (internetData) {
      contextLines.push(`INTERNET REFERENCE DATA:\n${internetData}`);
    }

    return `
You are a Linux Expert agent.
Context: ${serverInfo ? `OS: ${serverInfo.os}, Kernel: ${serverInfo.kernel}` : 'Linux Server'}
Ref Data: ${internetData ? internetData.slice(0, 800) : 'None'}

User: ${userInput}

Instruction: Provide a brief explanation in INDONESIAN language and the exact command to run.
Output Format (JSON): {"explanation": "penjelasan bahasa indonesia...", "command": "...", "confidence": 0.9}
`;
  }

  /**
   * Safely parses JSON from AI string response
   */
  parseAIResponse(raw) {
    try {
      // Find JSON block if AI added extra text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[AI] Failed to parse response as JSON, falling back to raw.');
      return {
        explanation: raw,
        command: null,
        confidence: 0.5
      };
    }
  }

  /**
   * Handle Suggestion Logic (Short autocomplete-style)
   */
  async handleSuggest(req, res) {
    const { input, sessionId } = req.body;
    if (!input || input.length < 3) return res.json({ suggestions: [] });

    try {
      const serverContext = sessionId ? contextService.getContext(sessionId) : null;
      const prompt = `Suggest 3 real Linux commands starting with or related to "${input}". ${serverContext ? `OS: ${serverContext.os}` : ''}. Output ONLY as a comma-separated list.`;
      
      const raw = await ollamaService.ask(prompt);
      const suggestions = raw.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s !== input)
        .slice(0, 3);
      
      res.json({ suggestions });
    } catch (e) {
      res.json({ suggestions: [] });
    }
  }

  /**
   * Returns the current context for a session
   */
  async getContext(req, res) {
    const { sessionId } = req.params;
    try {
      const context = await contextService.getContext(sessionId);
      res.json(context || { message: 'No context found' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Streaming version of handleQuery
   * Uses SSE (Server-Sent Events) for ChatGPT-like effect
   */
  async handleStreamQuery(req, res) {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // 1. Send immediate status pulse
      res.write(`data: ${JSON.stringify({ chunk: "Connected to Remote AI... 📡 (Please wait, loading may take up to 60s)\n\n" })}\n\n`);

      // 2. Fetch Context (In parallel, resilient to partial failures)
      console.log(`[AI] Gathering multi-source intelligence for: ${message}`);
      
      const session = sessionId ? contextService.contexts.get(sessionId) : null;
      let contextPromise = Promise.resolve(null);
      
      if (sessionId) {
        contextPromise = contextService.getContext(sessionId) || contextService.collectContext(sessionId);
      }

      const resContext = await Promise.allSettled([
        contextPromise,
        internetService.fetchData(message)
      ]);

      const serverContext = resContext[0].status === 'fulfilled' ? resContext[0].value : null;
      const internetData = resContext[1].status === 'fulfilled' ? resContext[1].value : null;

      res.write(`data: ${JSON.stringify({ chunk: "Processing with context... ⚙️\n\n" })}\n\n`);

      const systemPrompt = this.buildPrompt(message, serverContext, internetData);

      // Heartbeat interval to keep the stream alive while Ollama is thinking
      const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ chunk: "" })}\n\n`);
      }, 3000);

      // 3. Stream from Ollama
      let fullResponse = '';
      try {
        await ollamaService.generateStream(systemPrompt, (chunk) => {
          if (chunk.response) {
            fullResponse += chunk.response;
            res.write(`data: ${JSON.stringify({ chunk: chunk.response })}\n\n`);
          }
        });
      } catch (ollamaError) {
        clearInterval(heartbeat);
        throw new Error(`AI Core Error: ${ollamaError.message}`);
      } finally {
        clearInterval(heartbeat);
      }

      // 4. Final structured data
      const parsed = this.parseAIResponse(fullResponse);
      const safetyCheck = safetyService.analyzeCommand(parsed.command);

      const finalData = {
        done: true,
        command: parsed.command,
        confidence: parsed.confidence || 0.85,
        safety: {
          isDangerous: safetyCheck.isDangerous,
          risk: safetyCheck.risk,
          description: safetyCheck.description
        }
      };

      res.write(`data: ${JSON.stringify(finalData)}\n\n`);
      res.end();

    } catch (error) {
      console.error('[AI Controller] Stream Error:', error.message);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

export default new AIController();
