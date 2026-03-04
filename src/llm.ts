import OpenAI from 'openai';
import { addMessage, getRecentMessages } from './memory/sqlite.js';
import { getAllLoadedMCPTools, callMCPTool, startMCPServer, mcpClients } from './mcp.js';
import { getRequiredTools } from './router.js';
import { upsertSemanticMemory, searchSemanticMemory } from './memory/pinecone.js';

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Helper function to wrap Promises with a timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => clearTimeout(timeoutHandle));
}

// Initialize OpenRouter
const cloudOpenai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'sk-or-v1-missing',
});

// Define the get_current_time tool (OpenAI format)
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current local time.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_semantic_memory',
      description: 'Save important facts, user preferences, or memories to long-term memory. USE THIS whenever the user asks you to remember something or provides a fact about themselves.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The fact or memory to save (e.g. "The user\'s name is Ishaan" or "Ishaan is working on a new game project")'
          }
        },
        required: ['text'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_semantic_memory',
      description: 'Search long-term memory for past facts, preferences, or context. USE THIS whenever you need to recall something the user previously told you.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find in memory (e.g. "What is the user\'s name?" or "What project is Ishaan working on?")'
          }
        },
        required: ['query'],
        additionalProperties: false
      }
    }
  }
];

function loadPersona(): string {
  try {
    const personaPath = path.join(process.cwd(), '.agent', 'persona.md');
    if (fs.existsSync(personaPath)) {
      return fs.readFileSync(personaPath, 'utf-8');
    }
  } catch (err) {
    console.error('[PERSONA] Failed to load persona.md, using default.');
  }
  return "You are IRIS (Intelligent Response and Insight System), a personal AI agent.";
}

function getCurrentTime() {
  const tz = process.env.TIMEZONE || 'America/Edmonton';
  return new Date().toLocaleString('en-US', { 
    timeZone: tz,
    dateStyle: 'full', 
    timeStyle: 'long' 
  });
}

export async function generateResponse(userMessage: string, onChunk?: (text: string) => void): Promise<string> {
  const startTime = Date.now();
  console.log(`\n[LLM] --- GENERATION STARTED ---`);

  // 0. Pre-Flight Intent Routing
  const allowedTools = getRequiredTools(userMessage);
  if (allowedTools && allowedTools.length === 0) {
    console.log(`[ROUTER] Zero external tools required for this query. Bypassing MCP layer.`);
  } else if (allowedTools) {
    console.log(`[ROUTER] Filtering MCP tools to distinct prefixes: ${allowedTools.join(', ')}`);
  } else {
    console.log(`[ROUTER] No specific intent detected. Allowing all tools.`);
  }

  // 1. Save user message to exact memory (SQLite)
  addMessage('user', userMessage);

  // 2. Load recent history (last 10 messages)
  const history = getRecentMessages(10);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  
  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'tool') {
      const messageParam: any = { role: msg.role, content: msg.content };
      if (msg.tool_calls) messageParam.tool_calls = msg.tool_calls;
      if (msg.tool_call_id) messageParam.tool_call_id = msg.tool_call_id;
      messages.push(messageParam);
    }
  }

  // Perform an automatic Semantic Memory search for context
  let memoryContext = '';
  try {
    const memoryResults = await searchSemanticMemory(userMessage);
    if (memoryResults && memoryResults.length > 0) {
      memoryContext = `\nRELEVANT PAST MEMORIES/CONTEXT ABOUT USER:\n` + memoryResults.map(r => `- ${r}`).join('\n');
    }
  } catch (err) {
    console.log('[DEBUG] Memory search failed or skipped');
  }

  const systemPrompt = `${loadPersona()}
Today's Date: ${getCurrentTime()}

CRITICAL RULES FOR TOOLS:
1. ZAPIER 'instructions' PARAMETER: Every Zapier tool REQUIRES an 'instructions' parameter. Example: { "instructions": "Find events for tomorrow" }.
2. CONVERSATIONAL RESPONSES: Read tool data and answer naturally. DO NOT output raw JSON or execution metadata.
${memoryContext}`;
  
  // Prepend system prompt to messages
  messages.unshift({ role: 'system', content: systemPrompt });

  let iteration = 0;
  const MAX_ITERATIONS = 15;

  // Force OpenRouter use
  const openaiClient = cloudOpenai;
  const modelName = process.env.OPENROUTER_MODEL || 'openrouter/free';

  console.log(`[LLM] Executing with Model: ${modelName} (cloud)`);

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    // Fetch dynamic MCP tools (filtered by Intent Router)
    let mcpTools: any[] = [];
    if (!allowedTools || allowedTools.length > 0) {
      mcpTools = await getAllLoadedMCPTools(allowedTools);
    }
    const allTools = [...tools, ...mcpTools];

    const requestPayload: any = {
      model: modelName,
      messages: messages,
    };
    
    if (allTools.length > 0) {
      requestPayload.tools = allTools;
      requestPayload.tool_choice = 'auto';
    }

    console.log(`[DEBUG] Iteration ${iteration}. Sending ${allTools.length} tools to cloud model.`);
    
    // Call LLM
    try {
      const llmCallStart = Date.now();
      const stream: any = await withTimeout(
        openaiClient.chat.completions.create({
          ...requestPayload,
          stream: true
        }),
        45000,
        "OpenRouter LLM network connection timed out"
      );

      let finalContent = "";
      const toolCallsMap: Record<number, any> = {};

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          finalContent += delta.content;
          if (onChunk) onChunk(finalContent);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallsMap[tc.index]) {
              toolCallsMap[tc.index] = {
                id: tc.id,
                type: 'function',
                function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
              };
            } else {
              if (tc.id) toolCallsMap[tc.index].id = tc.id;
              if (tc.function?.name) toolCallsMap[tc.index].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallsMap[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }
      }

      const llmCallDuration = Date.now() - llmCallStart;
      console.log(`[PERF] LLM Streaming Call took ${llmCallDuration}ms`);

      const tool_calls = Object.values(toolCallsMap);
      const responseMessage: any = {
        role: 'assistant',
        content: finalContent || null,
        tool_calls: tool_calls.length > 0 ? tool_calls : undefined
      };

      console.log(`[DEBUG] LLM response: tool_calls=${responseMessage.tool_calls?.length || 0}, content=${!!responseMessage.content}`);
      messages.push({ role: responseMessage.role, content: responseMessage.content, tool_calls: responseMessage.tool_calls } as any);

      // Handle Tool Calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Save assistant message with tool calls to SQLite
        addMessage('assistant', responseMessage.content || '', JSON.stringify(responseMessage.tool_calls));

        const toolResponses = await Promise.all(responseMessage.tool_calls.map(async (toolCall: any) => {
          let toolResult: string;
          
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            
            if (functionName === 'get_current_time') {
              toolResult = JSON.stringify({ time: getCurrentTime() });
            } else if (functionName === 'save_semantic_memory') {
              try {
                const args = JSON.parse(toolCall.function.arguments || '{}');
                await upsertSemanticMemory(args.text);
                toolResult = JSON.stringify({ status: "success", message: `Memory saved: ${args.text}` });
              } catch (err: any) {
                toolResult = JSON.stringify({ error: err.message });
              }
            } else if (functionName === 'search_semantic_memory') {
              try {
                const args = JSON.parse(toolCall.function.arguments || '{}');
                const results = await searchSemanticMemory(args.query);
                toolResult = JSON.stringify({ results });
              } catch (err: any) {
                toolResult = JSON.stringify({ error: err.message });
              }
            } else if (functionName.includes('__')) {
              // MCP Tool execution
              const [serverName, actualToolName] = functionName.split('__');
              try {
                const args = JSON.parse(toolCall.function.arguments || '{}');
                
                // On-the-fly server loading (robustness second layer)
                if (!mcpClients[serverName]) {
                  console.log(`[LLM] Server ${serverName} requested by LLM but not loaded. Attempting on-the-fly start...`);
                  try {
                    await startMCPServer(serverName);
                  } catch (startErr) {
                    throw new Error(`Failed to start server ${serverName} on-the-fly: ${startErr}`);
                  }
                }

                const result = await withTimeout(
                  callMCPTool(serverName, actualToolName, args),
                  45000,
                  `MCP Tool ${functionName} timed out after 45 seconds`
                );
                // MCP tools usually return { content: [{ type: 'text', text: '...' }] }
                if (result && result.content && Array.isArray(result.content)) {
                  toolResult = result.content.map((c: any) => c.text).join('\n');
                } else {
                  toolResult = JSON.stringify(result);
                }
              } catch (err: any) {
                console.error(`Error calling MCP tool ${functionName}:`, err);
                toolResult = JSON.stringify({ error: err.message });
              }
            } else {
              toolResult = JSON.stringify({ error: 'Unknown function' });
            }
          } else {
            toolResult = JSON.stringify({ error: 'Unknown tool type' });
          }

          return {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult
          };
        }));

        // Push all tool responses to messages array
        for (const toolResponse of toolResponses) {
          messages.push(toolResponse as any);
          // Save tool response to exact memory (SQLite)
          addMessage('tool', toolResponse.content, undefined, toolResponse.tool_call_id);
        }
      } else {
        // No more tool calls, we have our final response
        const finalContent = responseMessage.content || 'No response generated.';
        
        // Save assistant response to exact memory (SQLite)
        addMessage('assistant', finalContent);
        
        const totalDuration = Date.now() - startTime;
        console.log(`[PERF] Total Generation Time: ${totalDuration}ms`);
        console.log(`[LLM] --- GENERATION FINISHED ---\n`);

        return finalContent;
      }
    } catch (e: any) {
      console.error("[LLM] Error calling OpenRouter:", e.message);
      const totalDuration = Date.now() - startTime;
      console.log(`[PERF] Failed after ${totalDuration}ms\n`);
      return `I encountered an error connecting to my core reasoning unit: ${e.message}`;
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[PERF] Exceeded max iterations after ${totalDuration}ms\n`);
  return "Error: Maximum agent iterations reached.";
}
