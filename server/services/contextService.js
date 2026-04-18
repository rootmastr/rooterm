import sshService from './sshService.js';

class ContextService {
  constructor() {
    this.contexts = new Map(); // sessionId -> contextData
  }

  async collectContext(sessionId) {
    console.log(`[Context] Collecting server context for session: ${sessionId}`);
    
    try {
      const commands = {
        os: 'cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'',
        kernel: 'uname -r',
        uptime: 'uptime -p',
        ram: 'free -h | grep Mem | awk \'{print $2" total, "$3" used"}\'',
        disk: 'df -h / | tail -1 | awk \'{print $2" total, "$4" free"}\'',
        user: 'whoami',
        cpu: 'grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs'
      };

      const context = {};
      
      // Run commands in parallel
      const results = await Promise.allSettled(
        Object.keys(commands).map(async (key) => {
          const output = await sshService.execCommand(sessionId, commands[key]);
          context[key] = output;
        })
      );

      this.contexts.set(sessionId, context);
      return context;
    } catch (error) {
      console.error(`[Context] Failed to collect context for ${sessionId}:`, error.message);
      return null;
    }
  }

  getContext(sessionId) {
    return this.contexts.get(sessionId) || null;
  }

  clearContext(sessionId) {
    this.contexts.delete(sessionId);
  }
}

export default new ContextService();
