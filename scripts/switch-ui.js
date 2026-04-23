#!/usr/bin/env node

const command = process.argv[2] || "help";
const message =
  "UI switching is deprecated. This repository now uses the single implementation in pages/index.vue.";

switch (command) {
  case "new":
    console.log("Current UI: new");
    console.log(message);
    break;
  case "old":
    console.log("Current UI: new");
    console.log(message);
    console.log("No legacy UI toggle is available anymore.");
    break;
  case "status":
    console.log("Current UI: new");
    console.log("Source: pages/index.vue");
    break;
  default:
    console.log("Usage: pnpm ui:new | pnpm ui:old | pnpm ui:status");
    console.log(message);
    break;
}
