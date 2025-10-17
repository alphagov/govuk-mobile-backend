#!/usr/bin/env node

const WebSocket = require('ws');

// Get WebSocket URL from command line or use default
const wsUrl = process.argv[2] || 'wss://edc3cgwt49.execute-api.eu-west-2.amazonaws.com/dev';

console.log(`Connecting to WebSocket: ${wsUrl}`);
console.log('Press Ctrl+C to disconnect\n');

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  console.log('Sending stream request...\n');
  
  // Send a message to start streaming
  ws.send(JSON.stringify({ action: 'stream' }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  process.stdout.write(message.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n\n🔌 WebSocket closed: ${code} - ${reason}`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Disconnecting...');
  ws.close();
  process.exit(0);
});
