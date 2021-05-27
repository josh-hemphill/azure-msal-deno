import { msal } from "./consts.ts";
await Deno.run({
  cmd: [
    "npm",
    "i",
    "-g",
    "lerna",
    "typescript",
  ],
  cwd: msal,
}).status();
await Deno.run({
  cmd: ["npm", "run", "clean"],
  cwd: msal,
}).status();
await Deno.run({
  cmd: ["npm", "install"],
  cwd: msal,
}).status();
await Deno.run({
  cmd: ["npm", "run", "build"],
  cwd: msal + "/lib/msal-common",
}).status();
await Deno.run({
  cmd: ["npm", "run", "build"],
  cwd: msal + "/lib/msal-node",
}).status();
