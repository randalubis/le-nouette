// Integration test preload: next/cache and next/navigation cannot load under tsx + react-server (React.createContext missing). Outside a request
// revalidatePath is a no-op anyway (actions.ts swallows it), so stub it. Test-only.
/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require("node:module");
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === "next/cache") return { revalidatePath() {}, revalidateTag() {} };
  if (request === "next/navigation") return { redirect() { throw new Error("redirect() stubbed in integration test"); } };
  return load.call(this, request, ...rest);
};
