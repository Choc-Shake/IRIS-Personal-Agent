import { generateResponse } from '../llm.js';
import { bot, ALLOWED_USER_ID, getBotStatus } from '../bot.js';

let heartbeatInterval: NodeJS.Timeout;

export function startHeartbeat() {
  // Run every 4 hours (14400000 ms)
  const intervalMs = 60 * 60 * 4000;
  
  heartbeatInterval = setInterval(async () => {
    if (getBotStatus() === 'offline' || !ALLOWED_USER_ID) return;
    
    try {
      console.log('[PROACTIVE] 4 Hourly heartbeat running...');
      // We instruct the LLM to output exactly "NOTHING_URGENT" if there's nothing to say.
      const prompt = `[SYSTEM EVENT: 4 Hourly HEARTBEAT] Please check my calendar, unread emails, or recent memory for anything immediately urgent (e.g., a meeting in the next hour or an urgent unread email). If there is NOTHING noteworthy, reply EXACTLY with the word "NOTHING_URGENT" and do not say anything else. If there is something important, write a brief, proactive message warning me with a few key details.`;
      
      const response = await generateResponse(prompt);
      
      if (!response.includes('NOTHING_URGENT')) {
          if (bot) await bot.api.sendMessage(ALLOWED_USER_ID, `🔔 *IRIS Heartbeat*\n\n${response}`, { parse_mode: 'Markdown' });
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
