// Client MCP minimal pour le serveur Leclerc Drive : appelle ses outils sans passer par Claude.
// Usage : node worker/drive/drive.mjs '[["find_stores",{"query":"34080"}],["get_cart",{}]]'
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(here, 'node_modules', 'mcp-leclerc-drive', 'dist', 'index.js');

export async function openDrive() {
  const transport = new StdioClientTransport({ command: process.execPath, args: [SERVER], stderr: 'ignore' });
  const client = new Client({ name: 'appli-courses', version: '1.0.0' });
  await client.connect(transport);
  return {
    async call(name, args = {}) {
      const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
      const text = (r.content || []).map(c => c.text || '').join('\n');
      if (r.isError) throw new Error(text);
      return text;
    },
    close: () => client.close(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const calls = JSON.parse(process.argv[2] || '[]');
  const drive = await openDrive();
  try {
    for (const [name, args] of calls) {
      console.log(`=== ${name} ${JSON.stringify(args)}`);
      try { console.log(await drive.call(name, args)); } catch (e) { console.log('ERREUR', e.message); }
    }
  } finally { await drive.close(); }
}
