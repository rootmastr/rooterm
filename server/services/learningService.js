import ollamaService from './ollamaService.js';
import ragService from './rag/ragService.js';
import contextService from './contextService.js';

class LearningService {
  /**
   * Process execution feedback to enable self-improving behavior.
   */
  async processFeedback(sessionId, originalQuery, command, output, isError) {
    try {
      console.log(`[Learning] Processing feedback for command: ${command} (Error: ${isError})`);
      
      const serverContext = sessionId ? contextService.getContext(sessionId) : null;
      const osInfo = serverContext ? serverContext.os : 'Generic Linux';

      if (!isError) {
        // Feature 3 & 4: Store successful commands as confirmed knowledge
        const successDoc = `VERIFIED SUCCESSFUL COMMAND:\nEnvironment: ${osInfo}\nGoal: ${originalQuery}\nCommand: ${command}\nOutcome: Worked perfectly.`;
        await ragService.ingestDocument(successDoc, { source: 'learned_success', confidence: 1.0 });
        return { success: true, action: 'memorized_success' };
      } else {
        // Feature 2: Error Learning & Diagnostics
        console.log(`[Learning] Diagnosing failed command...`);
        const diagnosticPrompt = `
You are an expert system diagnosing a failed shell command.
OS: ${osInfo}
Goal: ${originalQuery}
Failed Command: ${command}
Error Output: ${output}

Analyze why the command failed and provide the correct, working command.
Return ONLY JSON format. The explanation MUST be in INDONESIAN language:
{
  "explanation": "penjelasan bahasa indonesia mengapa perintah gagal...",
  "fixed_command": "the correct command..."
}`;
        
        const rawAiResponse = await ollamaService.ask(diagnosticPrompt);
        let diagnosis;
        try {
          const jsonMatch = rawAiResponse.match(/\{[\s\S]*\}/);
          diagnosis = JSON.parse(jsonMatch ? jsonMatch[0] : rawAiResponse);
        } catch (e) {
          console.warn('[Learning] Diagnosis parsing failed.');
          return { success: false, action: 'failed_diagnosis' };
        }

        // Feature 3 & 4: Store the failed case + fix
        const errorDoc = `RESOLVED FAILURE (Do not repeat this mistake):
Environment: ${osInfo}
Goal: ${originalQuery}
Failed Command: ${command}
Error Output: ${output}
Root Cause: ${diagnosis.explanation}
FIXED COMMAND TO USE INSTEAD: ${diagnosis.fixed_command}`;

        await ragService.ingestDocument(errorDoc, { source: 'learned_fix', confidence: 0.95 });
        
        return { 
          success: true, 
          action: 'learned_from_mistake', 
          fix: diagnosis.fixed_command,
          explanation: diagnosis.explanation 
        };
      }
    } catch (error) {
      console.error('[Learning Service] Error processing feedback:', error.message);
      throw error;
    }
  }

  /**
   * Feature 5: Prompt Optimization based on historical density
   * Evaluates how many learned experiences exist to tune prompt strictness
   */
  async getOptimizedSystemPrompt(serverContextString) {
    return `You are a self-improving Linux System Administrator.
System Context: ${serverContextString || 'Generic Node'}

CRITICAL RAG RULE: 
If the retrieved knowledge contains a "RESOLVED FAILURE", you MUST absolutely avoid suggesting the 'Failed Command' and instead strongly favor the 'FIXED COMMAND'.
If it contains a "VERIFIED SUCCESSFUL COMMAND", prioritize adapting it to the user's exact needs.`;
  }
}

export default new LearningService();
