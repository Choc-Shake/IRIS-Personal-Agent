import cron from 'node-cron';
import { generateResponse } from '../llm.js';
import { bot, ALLOWED_USER_ID, getBotStatus } from '../bot.js';
import { getRecentMessages } from '../memory/sqlite.js';

let morningTask: cron.ScheduledTask;
let eveningTask: cron.ScheduledTask;

export const MORNING_BRIEFING_PROMPT = `[SYSTEM EVENT: MORNING BRIEFING] Generate a proactive morning briefing for the user. 
CRITICAL: You MUST use the following tools:
1. 'search_semantic_memory' to look up the user's personal interests, hobbies, or current projects.
2. The web search tool to find the current weather and suggest clothing (e.g., wear a jacket).
3. The web search tool to find top news headlines today that SPECIFICALLY relate to the user's interests or identity found in memory.
4. Zapier to check their Google Calendar for today and tomorrow.
5. Zapier to check their Google Tasks for today.
6. Zapier to check their Gmail for today, return only the subject lines of the most important emails.

FORMATTING & SEARCH RULES:
- SEARCH QUERIES: Use short, 2-3 word keyword queries for DuckDuckGo (e.g., "Bahrain news today" instead of "What is happening in Bahrain right now?") to avoid bot detection.
- Space out the calendar events clearly. Use line breaks and readable date/time formatting so the schedule is easy to glance at.
- Summarize the personalized news in a short paragraph.
Do not explain that you are sending a message, checking memory, or doing searches. Just deliver the briefing natively.`;

export async function generateMorningBriefing(): Promise<string> {
  return await generateResponse(MORNING_BRIEFING_PROMPT);
}

export function startScheduler() {
  const timezone = process.env.TIMEZONE;

  // Morning Briefing @ 7:30 AM
  morningTask = cron.schedule('30 7 * * *', async () => {
    if (getBotStatus() === 'offline' || !ALLOWED_USER_ID) return;
    try {
      console.log('[PROACTIVE] Generating Morning Briefing...');
      const response = await generateMorningBriefing();
      if (bot) await bot.api.sendMessage(ALLOWED_USER_ID, `🌅 *Morning Briefing*\n\n${response}`, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Failed to run morning briefing', e);
    }
  }, { timezone });

  // Evening Recap @ 9:30 PM
  eveningTask = cron.schedule('30 21 * * *', async () => {
    if (getBotStatus() === 'offline' || !ALLOWED_USER_ID) return;
    try {
      console.log('[PROACTIVE] Generating Evening Recap...');
      const recent = getRecentMessages(50).filter(m => m.role !== 'tool').map(m => `[${m.role}] ${m.content}`).join('\n');
      const prompt = `[SYSTEM EVENT: EVENING RECAP] Generate an evening recap based on today's interactions:\n\n${recent}\n\nReview the interactions and use Google Tasks via Zapier to track and manage tasks, checking off completed ones and listing pending items for tomorrow. \n Give a very brief summary of the next day as well to help the user prepare.\nCRITICAL: If you notice any user preferences, recurring habits, or new behavioral patterns in today's interactions, USE the save_semantic_memory tool to save them for long-term storage.\nDo not explain that you are doing this, just deliver a friendly evening wrap-up.`;
      
      const response = await generateResponse(prompt);
      if (bot) await bot.api.sendMessage(ALLOWED_USER_ID, `🌙 *Evening Recap*\n\n${response}`, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Failed to run evening recap', e);
    }
  }, { timezone });

  console.log('[PROACTIVE] Morning and Evening schedulers activated.');
}

export function stopScheduler() {
  if (morningTask) morningTask.stop();
  if (eveningTask) eveningTask.stop();
}
