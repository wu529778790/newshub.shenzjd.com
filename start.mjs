#!/usr/bin/env node
import http from 'node:http';
import { handler } from './.output/server/index.mjs';

const server = http.createServer(handler);
server.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Server running');
});
