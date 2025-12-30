// Docker startup script for Nitro application
// This script creates an HTTP server using the Nitro handler

import { createServer } from 'node:http';
import { handler } from './.output/server/index.mjs';

const PORT = process.env.PORT || 3000;

const server = createServer(handler);

server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🚀 Ready for traffic!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
