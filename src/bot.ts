import { Bot, InputFile } from 'grammy';
import { generateResponse } from './llm.js';
import { transcribeAudio } from './voice/transcribe.js';
import { TypingIndicator } from './ux/typing.js';
import { commands, commandDescriptions } from './commands/index.js';
import fs from 'fs';
import path from 'path';
import { startScheduler, stopScheduler } from './proactive/scheduler.js';
import { startHeartbeat, stopHeartbeat } from './proactive/heartbeat.js';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is not set in .env. Bot will not start.');
}

if (!process.env.TELEGRAM_USER_ID) {
  console.warn('TELEGRAM_USER_ID is not set in .env. Whitelist will not work.');
}

export const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID ? parseInt(process.env.TELEGRAM_USER_ID, 10) : 0;

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || 'dummy_token');

// ─── Middleware & Handlers (Register Once) ───────────────────────────────────
bot.use(async (ctx, next) => {
  if (ctx.from?.id !== ALLOWED_USER_ID) {
    console.log(`Unauthorized access attempt from user ID: ${ctx.from?.id}`);
    return; // Silently ignore
  }
  await next();
});

for (const [name, handler] of Object.entries(commands)) {
  bot.command(name, handler);
}

bot.api.setMyCommands(commandDescriptions).catch(err => {
  console.error('Failed to set command menu:', err);
});

bot.command('start', (ctx) => {
  ctx.reply('IRIS initialized. Awaiting input.');
});

bot.on('message:text', async (ctx) => {
  const userMessage = ctx.message.text;
  const typing = new TypingIndicator(ctx);
  typing.start();

  try {
    let messageToEdit: any = null;
    let lastEditTime = 0;
    const response = await generateResponse(userMessage, async (text) => {
      const now = Date.now();
      if (now - lastEditTime > 1500 && text.trim().length > 0) {
        lastEditTime = now;
        if (!messageToEdit) {
          typing.stop();
          messageToEdit = await ctx.reply(text + ' ✍️');
        } else {
          try {
            await ctx.api.editMessageText(ctx.chat.id, messageToEdit.message_id, text + ' ✍️');
          } catch(e) {}
        }
      }
    });
    typing.stop();
    if (messageToEdit) {
      try { await ctx.api.editMessageText(ctx.chat.id, messageToEdit.message_id, response); } catch(e) {}
    } else {
      await ctx.reply(response);
    }
  } catch (error) {
    typing.stop();
    console.error('Error generating response:', error);
    await ctx.reply('An error occurred while processing your request.');
  }
});

bot.on('message:voice', async (ctx) => {
  try {
    await ctx.replyWithChatAction('record_voice');
    const fileId = ctx.message.voice.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const tempFilePath = path.join(process.cwd(), 'data', `${fileId}.ogg`);
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to download voice message');
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    const text = await transcribeAudio(tempFilePath);
    fs.unlinkSync(tempFilePath);
    await ctx.reply(`🎤 *You:* ${text}`, { parse_mode: 'Markdown' });
    const typing = new TypingIndicator(ctx);
    typing.start();
    let messageToEdit: any = null;
    let lastEditTime = 0;
    const replyText = await generateResponse(text, async (chunkText) => {
      const now = Date.now();
      if (now - lastEditTime > 1500 && chunkText.trim().length > 0) {
        lastEditTime = now;
        if (!messageToEdit) {
          typing.stop();
          messageToEdit = await ctx.reply(chunkText + ' ✍️');
        } else {
          try { await ctx.api.editMessageText(ctx.chat.id, messageToEdit.message_id, chunkText + ' ✍️'); } catch(e) {}
        }
      }
    });
    typing.stop();
    if (messageToEdit) {
      try { await ctx.api.editMessageText(ctx.chat.id, messageToEdit.message_id, replyText); } catch(e) {}
    } else {
      await ctx.reply(replyText);
    }
  } catch (error) {
    console.error('Error processing voice:', error);
    await ctx.reply('An error occurred while processing your voice message.');
  }
});

let isRunning = false;

export function getBotStatus() {
  return isRunning ? 'online' : 'offline';
}

export async function startBot() {
  if (isRunning) return;
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[BOT] Skipping start: TELEGRAM_BOT_TOKEN missing.');
    return;
  }

  console.log('[BOT] Initializing start sequence...');
  
  // Send welcome message
  if (ALLOWED_USER_ID) {
    bot.api.sendMessage(ALLOWED_USER_ID, `✨ *IRIS ONLINE* ✨\n\nHello Ishaan, how can I help?`, { parse_mode: 'Markdown' }).catch(err => {
      console.error('[BOT] Welcome message failed:', err);
    });
  }

  isRunning = true;
  startScheduler();
  startHeartbeat();
  
  bot.start({
    onStart: (botInfo) => {
      console.log(`[BOT] IRIS (${botInfo.username}) is active and polling.`);
    }
  }).catch(err => {
    console.error('[BOT] Critical startup error:', err);
    if (err.message?.includes('Conflict')) {
      console.warn('[BOT] Conflict detected. Another instance is polling.');
    }
    isRunning = false;
    stopScheduler();
    stopHeartbeat();
  });
}

export async function stopBot() {
  console.log('[BOT] Termination sequence initiated...');
  stopScheduler();
  stopHeartbeat();
  try {
    if (bot.isInited()) {
      await bot.stop();
    }
    console.log('[BOT] Polling stopped successfully.');
  } catch (err) {
    console.error('[BOT] Error during stop:', err);
  } finally {
    isRunning = false;
  }
}
