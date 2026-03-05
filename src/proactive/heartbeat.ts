import { generateResponse } from '../llm.js';
import { bot, ALLOWED_USER_ID, getBotStatus } from '../bot.js';

let heartbeatInterval: NodeJS.Timeout;

export function startHeartbeat() {
  // Run every hour (3600000 ms)
  const intervalMs = 60 * 60 * 1000;
  
  heartbeatInterval = setInterval(async () => {
    if (getBotStatus() === 'offline' || !ALLOWED_USER_ID) return;
    
    try {
      console.log('[PROACTIVE] Hourly heartbeat running...');
      // We instruct the LLM to output exactly "NOTHING_URGENT" if there's nothing to say.
      const prompt = `[SYSTEM EVENT: HOURLY HEARTBEAT] Please check my calendar, emails, or recent memory for anything immediately urgent (e.g., a meeting in the next hour or an urgent unread email). If there is NOTHING noteworthy, reply EXACTLY with the word "NOTHING_URGENT" and do not say anything else. If there is something important, write a brief, proactive message warning me.`;
      
      const response = await generateResponse(prompt);
      
      if (!response.includes('NOTHING_URGENT')) {
          await bot.api.sendMessage(ALLOWED_USER_ID, `🔔 *IRIS Alert*\n\n${response}`, { parse_mode: 'Markdown' });
      } else {
          console.log('[PROACTIVE] Heartbeat checked. Nothing urgent.');
      }
    } catch (e) {
      console.error('[PROACTIVE] Heartbeat failed:', e);
    }
  }, intervalMs);
  
  console.log('[PROACTIVE] Hourly heartbeat monitor activated.');
}

export function stopHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}
