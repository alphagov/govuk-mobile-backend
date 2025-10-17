#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Get URL from command line or use default
const url = process.argv[2] || 'https://ftpxjuxlrm7pr7sydzcpfqa34y0sgjve.lambda-url.eu-west-2.on.aws';

console.log(`Testing streaming from: ${url}`);
console.log('Press Ctrl+C to stop\n');

// Parse URL
const urlObj = new URL(url);
const isHttps = urlObj.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (isHttps ? 443 : 80),
  path: urlObj.pathname + urlObj.search,
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
};

const req = client.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('\n--- Streaming Response ---\n');

  let buffer = '';
  let chunkCount = 0;

  res.on('data', (chunk) => {
    chunkCount++;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    buffer += chunk.toString();
    
    console.log(`[${timestamp}] Chunk ${chunkCount} (${chunk.length} bytes):`);
    console.log(`Raw: ${JSON.stringify(chunk.toString())}`);
    
    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        console.log(`  Line: ${line}`);
      }
    }
    console.log('---');
  });

  res.on('end', () => {
    console.log('\n--- Stream Complete ---');
    console.log(`Total chunks received: ${chunkCount}`);
    if (buffer.trim()) {
      console.log(`Final buffer: ${buffer}`);
    }
  });

  res.on('error', (err) => {
    console.error('Response error:', err);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.setTimeout(30000, () => {
  console.log('Request timeout');
  req.destroy();
});

req.end();
