import { startMCPServer, getAllLoadedMCPTools } from './src/mcp.js';
import { loadMCPConfigs } from './src/mcp.js';

async function test() {
  console.log('Loading configs...');
  loadMCPConfigs();
  console.log('Starting Zapier...');
  try {
    await startMCPServer('zapier');
    console.log('Started. Fetching tools...');
    const tools = await getAllLoadedMCPTools();
    console.log('Tools:', JSON.stringify(tools, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

test();
