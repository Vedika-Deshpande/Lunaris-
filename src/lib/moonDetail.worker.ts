import { generateMoonBump } from "./moonDetail";

self.onmessage = (e: MessageEvent<{ lum: Uint8Array; size: number }>) => {
  const bump = generateMoonBump(e.data.lum, e.data.size);
  (self as unknown as Worker).postMessage(bump, [bump.buffer]);
};
