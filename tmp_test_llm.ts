import 'dotenv/config';
import { generateResponse } from './src/llm.js';

async function test() {
  const history = [
    "by the way you should remember the classes that im taking this semester at Norquest College, Last semster i took: Calculus 1, Engineering Mechanics: Statics, Chemistry 1, Physics:waves,optics,sound,English. This semster im taking: Calculus 2, Chemistry 2, Engineering Mechanics Dynamics, Linear Algebra, Programming and Engineering Design",
    "can you save all of that to your memory?"
  ];

  for (const msg of history) {
    console.log(`\nUser: ${msg}`);
    const res = await generateResponse(msg, (chunk) => process.stdout.write(chunk));
    console.log(`\nBot: ${res}`);
  }
}

test();
