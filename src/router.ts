import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export type RoutingMode = 'HYBRID' | 'LOCAL_ONLY' | 'CLOUD_ONLY';

export interface RouteDecision {
  skill: string;
  model: 'local' | 'cloud';
  requiredServers: string[];
}

let availableSkills: { name: string, description: string, modelPreference: string, toolsRequired: string[] }[] = [];

export function loadSkills() {
  if (availableSkills.length > 0) return availableSkills;
  
  const skillsDir = path.join(process.cwd(), '.agent', 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.skill.md'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
    const name = file.replace('.skill.md', '');
    
    // Simple extraction of Description and Model Preference
    const descMatch = content.match(/\*\*Description:\*\*\n([\s\S]*?)(?=\n\*\*|$)/);
    const modelMatch = content.match(/\*\*Model Preference:\*\*\n(.*)/);
    
    // Extract tools required
    const toolsMatch = content.match(/\*\*Tools Required:\*\*\n([\s\S]*?)(?=\n\*\*|$)/);
    const toolsRequired = toolsMatch 
      ? toolsMatch[1].split('\n').map(t => t.replace(/^- `?|`?$/g, '').trim()).filter(t => t)
      : [];
    
    availableSkills.push({
      name,
      description: descMatch ? descMatch[1].trim() : 'No description',
      modelPreference: modelMatch ? modelMatch[1].trim() : 'cloud', // Default to cloud now
      toolsRequired
    });
  }
  
  return availableSkills;
}

/**
 * Lightning-fast Intent Router: Scans user message for keywords to determine which MCP tools to inject.
 * Returns an array of prefixes (e.g. ['zapier__gmail', 'notebooklm__']) or [] if no tools are needed.
 * Returns undefined if we should load all tools (fallback).
 */
export function getRequiredTools(userMessage: string): string[] | undefined {
  const msg = userMessage.toLowerCase();
  const tools: string[] = [];
  let intentDetected = false;

  // Calendar Intent
  if (msg.includes('calendar') || msg.includes('schedule') || msg.includes('meeting') || msg.includes('event')) {
    tools.push('zapier__google_calendar');
    intentDetected = true;
  }

  // Email Intent
  if (msg.includes('email') || msg.includes('gmail') || msg.includes('inbox') || msg.includes('message')) {
    tools.push('zapier__gmail');
    intentDetected = true;
  }

  // Documentation / Notebook Intent
  if (msg.includes('notebook') || msg.includes('note') || msg.includes('document')) {
    tools.push('notebooklm__');
    intentDetected = true;
  }

  // Context7 / Technical Docs Intent
  if (msg.includes('doc') || msg.includes('code') || msg.includes('context')) {
    tools.push('context7__');
    intentDetected = true;
  }

  // Generic Zapier Fallback
  if (msg.includes('zapier') || msg.includes('zap')) {
    tools.push('zapier__');
    intentDetected = true;
  }

  if (!intentDetected) {
    // Zero tools needed, pure conversation = instant reply
    return [];
  }

  return tools;
}
