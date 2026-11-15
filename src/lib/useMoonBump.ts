import { useEffect, useState } from "react";
import * as THREE from "three";

const SIZE = 4096;

/** Builds a fine-relief bump map from the albedo texture in a Web Worker. Returns null until it is ready. */
export function useMoonBump(): THREE.DataTexture | null {
  const [tex, setTex] = useState<THREE.DataTexture | null>(null);
  useEffect(() => {
    let live = true;
    let worker: Worker | null = null;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = SIZE; c.height = SIZE / 2;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx || !live) return;
      ctx.drawImage(img, 0, 0, SIZE, SIZE / 2);
      const d = ctx.getImageData(0, 0, SIZE, SIZE / 2).data;
      const lum = new Uint8Array((SIZE * SIZE) / 2);
      for (let i = 0; i < lum.length; i++) lum[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
      worker = new Worker(new URL("./moonDetail.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<Uint8Array>) => {
        if (!live) return;
        const t = new THREE.DataTexture(e.data, SIZE, SIZE / 2, THREE.RedFormat, THREE.UnsignedByteType);
        t.wrapS = THREE.RepeatWrapping;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.anisotropy = 8;
        t.needsUpdate = true;
        setTex(t);
        worker?.terminate();
      };
      worker.postMessage({ lum, size: SIZE }, [lum.buffer]);
    };
    img.src = "/textures/moon.jpg";
    return () => { live = false; worker?.terminate(); };
  }, []);
  return tex;
}
