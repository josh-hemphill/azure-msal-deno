import { msal } from "./consts.ts";
await Deno.run({
  cmd: ["npm", "run", "build"],
  cwd: msal + "/custom-build",
}).status();
const iMap = JSON.parse(Deno.readTextFileSync("./import_map.json"));
console.log(
  "Injecting Deno compatibility dependencies: \n" +
    JSON.stringify(iMap.imports, null, 2),
);

Deno.removeSync("./dist", { recursive: true });
Deno.mkdirSync("./dist");
Deno.copyFileSync(
  msal + "/custom-build/dist/index.d.ts",
  "./dist/index.d.ts",
);
Deno.copyFileSync(
  msal + "/custom-build/dist/index.js.map",
  "./dist/index.js.map",
);

await Deno.run({
  cmd: [
    "deno",
    "bundle",
    "--import-map",
    "./import_map.json",
    "./src/index.ts",
    "./dist/index.js",
  ],
  cwd: "./",
}).status();
