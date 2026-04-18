class SafetyService {
  constructor() {
    this.dangerousPatterns = [
      { pattern: /rm\s+-rf\s+\/($|\s)/, risk: 'CRITICAL', description: 'Recursive deletion of root directory.' },
      { pattern: /rm\s+-rf\s+\$HOME/, risk: 'CRITICAL', description: 'Recursive deletion of home directory.' },
      { pattern: /mkfs\./, risk: 'HIGH', description: 'Formatting a partition or disk.' },
      { pattern: />\s*\/dev\/sd[a-z]/, risk: 'HIGH', description: 'Overwriting raw disk device.' },
      { pattern: /dd\s+if=.*of=\/dev\/sd[a-z]/, risk: 'HIGH', description: 'Disk duplication to physical device.' },
      { pattern: /:\(\)\{ :\|:& \};:/, risk: 'HIGH', description: 'Fork bomb (denial of service).' },
      { pattern: /mv\s+.*\s+\/dev\/null/, risk: 'MEDIUM', description: 'Moving data to null device (data loss).' },
      { pattern: /chmod\s+-R\s+777\s+\//, risk: 'HIGH', description: 'Making the entire system world-writable.' },
      { pattern: /chown\s+-R\s+.*:.*\s+\//, risk: 'HIGH', description: 'Changing ownership of the entire system.' }
    ];
  }

  /**
   * Analyze a command for dangerous patterns
   * @param {string} command 
   * @returns {object} { isDangerous, risk, description }
   */
  analyzeCommand(command) {
    if (!command) return { isDangerous: false };

    for (const item of this.dangerousPatterns) {
      if (item.pattern.test(command)) {
        return {
          isDangerous: true,
          risk: item.risk,
          description: item.description
        };
      }
    }

    return { isDangerous: false };
  }
}

export default new SafetyService();
