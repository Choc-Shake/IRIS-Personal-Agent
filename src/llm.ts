import OpenAI from 'openai';
import { addMessage, getRecentMessages } from './memory/sqlite.js';
import { searchSemanticMemory, upsertSemanticMemory } from './memory/pinecone.js';

// Cloud Provider (OpenRouter)
const openRouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Local Provider (Ollama)
const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: 'ollama', // Required by SDK but ignored by Ollama
});

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12';
const CLOUD_MODEL = 'google/gemini-2.5-flash:free'; // Powerful, free, supports tools

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
  }
];

function getCurrentTime() {
  return new Date().toLocaleString('en-US', { 
    timeZone: process.env.TIMEZONE || 'America/Edmonton', 
    dateStyle: 'full', 
    timeStyle: 'long' 
  });
}

async function determineComplexity(prompt: string): Promise<'local' | 'cloud'> {
  try {
    const response = await ollama.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a routing assistant. Determine if the user request is SIMPLE (casual chat, basic questions) or COMPLEX (requires external tools like checking the time, web search, deep reasoning, or coding). Reply with ONLY the word SIMPLE or COMPLEX.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      max_tokens: 10,
    });
    const decision = response.choices[0].message.content?.trim().toUpperCase();
    return decision?.includes('COMPLEX') ? 'cloud' : 'local';
  } catch (e) {
    console.warn('Ollama routing failed or unavailable, defaulting to cloud.');
    return 'cloud';
  }
}

export async function generateResponse(userMessage: string): Promise<string> {
  try {
    // 1. Save user message to exact memory (SQLite)
    addMessage('user', userMessage);

    // 2. Retrieve semantic memories (Pinecone)
    const semanticMemories = await searchSemanticMemory(userMessage);
    const memoryContext = semanticMemories.length > 0 
      ? `\n\nRelevant past memories:\n${semanticMemories.map(m => `- ${m}`).join('\n')}`
      : '';

    // 3. Determine Routing (Local vs Cloud)
    const route = await determineComplexity(userMessage);
    const activeClient = route === 'local' ? ollama : openRouter;
    const activeModel = route === 'local' ? OLLAMA_MODEL : CLOUD_MODEL;
    
    console.log(`Routing request to: ${route.toUpperCase()} (${activeModel})`);

    // 4. Build message history
    const systemPrompt = `You are Gravity Claw, a personal AI agent. You have access to tools. Use them if necessary.${memoryContext}`;
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Load recent history (last 10 messages)
    const history = getRecentMessages(10);
    for (const msg of history) {
      messages.push(msg);
    }

    let iteration = 0;
    const MAX_ITERATIONS = 5;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await activeClient.chat.completions.create({
        model: activeModel,
        messages: messages,
        tools: tools,
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;
      messages.push(responseMessage);

      // Handle Tool Calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Save assistant's tool call intent to SQLite
        addMessage('assistant', responseMessage.content, JSON.stringify(responseMessage.tool_calls));

        for (const toolCall of responseMessage.tool_calls) {
          let toolResult: string;
          
          if (toolCall.type === 'function' && toolCall.function.name === 'get_current_time') {
            toolResult = JSON.stringify({ time: getCurrentTime() });
          } else {
            toolResult = JSON.stringify({ error: 'Unknown function' });
          }

          // Save tool result to SQLite
          addMessage('tool', toolResult, undefined, toolCall.id);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult
          });
        }
      } else {
        // No more tool calls, we have our final response
        const finalContent = responseMessage.content || 'No response generated.';
        
        // Save assistant response to exact memory (SQLite)
        addMessage('assistant', finalContent);
        
        // Async save to semantic memory (Pinecone) - embed user message and store response as metadata
        upsertSemanticMemory(userMessage, { role: 'user', response: finalContent }).catch(console.error);

        return finalContent;
      }
    }

    return "Error: Maximum agent iterations reached.";
  } catch (error) {
    console.error('Error in generateResponse:', error);
    return "Gravity Claw encountered an internal error while processing your request.";
  }
}
