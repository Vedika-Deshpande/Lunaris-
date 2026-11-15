import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { lookAt, MOON_RADIUS_KM, type SubPoint } from "@/lib/ephemeris";
import { useMoonBump } from "@/lib/useMoonBump";
import type { LandingSite } from "@/types";

const R = Math.PI / 180, TAU = Math.PI * 2, Y = new THREE.Vector3(0, 1, 0);
// lon 0 = +x, east = -z (matches three.js SphereGeometry + equirectangular map)
const dir = (lat: number, lon: number) =>
  new THREE.Vector3(Math.cos(lat * R) * Math.cos(lon * R), Math.sin(lat * R), -Math.cos(lat * R) * Math.sin(lon * R));

/** Rotation that puts the Sun on +x, so the Moon turns under a fixed light (the "Sun-fixed" view). */
function sunFrame(vs: THREE.Vector3) {
  const xp = vs.clone().normalize();
  const yp = Y.clone().sub(xp.clone().multiplyScalar(xp.y)).normalize();
  const zp = new THREE.Vector3().crossVectors(xp, yp);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(xp.x, xp.y, xp.z, 0, yp.x, yp.y, yp.z, 0, zp.x, zp.y, zp.z, 0, 0, 0, 0, 1));
}

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const ORBITERS = [
  { name: "Your orbiter", color: "#ffc766", alt: null as number | null, node: 0 },
  { name: "LRO", color: "#e6e6e6", alt: 100, node: 40 },
  { name: "Danuri", color: "#8fd0ff", alt: 100, node: 100 },
  { name: "Chandrayaan-2", color: "#ff9db8", alt: 100, node: 150 },
];

function Orbiter({ o, i, altKm }: { o: (typeof ORBITERS)[number]; i: number; altKm: number }) {
  const craft = useRef<THREE.Group>(null), ring = useRef<THREE.Group>(null);
  const pts = useMemo(() => Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos((k / 128) * TAU), 0, Math.sin((k / 128) * TAU))), []);
  const euler = useMemo(() => new THREE.Euler((Math.PI / 2) * (1 - 0.015 * i), o.node * R, 0, "YXZ"), [i, o.node]);
  const alt = o.alt ?? altKm;
  useFrame(({ clock }) => {
    const r = 1 + alt / MOON_RADIUS_KM + 0.012 * i;
    const period = TAU * Math.sqrt((MOON_RADIUS_KM + alt) ** 3 / 4902.8);
    const th = (clock.elapsedTime * TAU * 600) / period; // about 600x real time
    ring.current?.scale.setScalar(r);
    craft.current?.position.set(r * Math.cos(th), 0, r * Math.sin(th));
    if (craft.current) craft.current.rotation.y = -th;
  });
  return (
    <group rotation={euler}>
      <group ref={ring}><Line points={pts} color={o.color} transparent opacity={0.35} lineWidth={1} /></group>
      <group ref={craft} scale={0.028}>
        <mesh><boxGeometry args={[0.5, 0.5, 0.8]} /><meshStandardMaterial color={o.color} metalness={0.7} roughness={0.35} /></mesh>
        <mesh><boxGeometry args={[1.8, 0.02, 0.7]} /><meshStandardMaterial color="#1b2f6b" metalness={0.4} roughness={0.3} /></mesh>
      </group>
    </group>
  );
}

function SiteMarker({ n, color }: { n: THREE.Vector3; color: string }) {
  const ring = useRef<THREE.Mesh>(null);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y, n), [n]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 3;
    ring.current?.scale.setScalar(1 + 0.15 * Math.sin(t));
    (ring.current?.material as THREE.MeshBasicMaterial | undefined)?.setValues({ opacity: 0.65 + 0.3 * Math.sin(t) });
  });
  return (
    <group position={n.clone().multiplyScalar(1.002)} quaternion={q}>
      <mesh ref={ring} rotation-x={-Math.PI / 2}><ringGeometry args={[0.055, 0.06, 64]} /><meshBasicMaterial color={color} side={THREE.DoubleSide} transparent /></mesh>
      <Line points={[new THREE.Vector3(), new THREE.Vector3(0, 0.45, 0)]} color={color} />
    </group>
  );
}

export interface Moon3DProps {
  site: LandingSite;
  sites?: LandingSite[];
  sun: SubPoint;
  earth: SubPoint;
  sunFixed?: boolean;
  showGrid?: boolean;
  showOrbiters?: boolean;
  orbiterAltKm?: number;
  onPick?: (id: string) => void;
}

function Scene({ site, sites = [], sun, earth, sunFixed = false, showGrid = true, showOrbiters = false, orbiterAltKm = 100, onPick }: Moon3DProps) {
  const base = useTexture("/textures/moon.jpg");
  base.colorSpace = THREE.SRGBColorSpace;
  base.anisotropy = 8;
  const sunTex = useTexture("/textures/sun.jpg");
  const bump = useMoonBump();
  const camera = useThree((s) => s.camera);
  const moonRef = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { q, light, sunPos, earthPos } = useMemo(() => {
    const vs = dir(sun.latDeg, sun.lonDeg), ve = dir(earth.latDeg, earth.lonDeg);
    const qq = sunFixed ? sunFrame(vs) : new THREE.Quaternion();
    const tq = (v: THREE.Vector3, k: number) => v.clone().applyQuaternion(qq).multiplyScalar(k);
    return { q: qq, light: tq(vs, 30), sunPos: tq(vs, 26), earthPos: tq(ve, 9) };
  }, [sun.latDeg, sun.lonDeg, earth.latDeg, earth.lonDeg, sunFixed]);
  const qRef = useRef(q);
  qRef.current = q;

  useEffect(() => {
    camera.position.copy(dir(site.lat, site.lon).applyQuaternion(qRef.current).multiplyScalar(4.2));
    camera.lookAt(0, 0, 0);
  }, [site.lat, site.lon, camera]);

  const grat = useMemo(() => {
    const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: 0x9db8e0, transparent: true, opacity: 0.2 });
    for (let la = -60; la <= 60; la += 30) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 97 }, (_, i) => dir(la, (i / 96) * 360 - 180).multiplyScalar(1.003))), m));
    for (let lo = -150; lo <= 180; lo += 30) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 49 }, (_, i) => dir(-90 + (i / 48) * 180, lo).multiplyScalar(1.003))), m));
    return g;
  }, []);

  const stars = useMemo(() => {
    const rnd = seeded(7), n = 9000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u), k = 0.3 + rnd() * 0.7, warm = rnd();
      pos.set([r * Math.cos(a) * 160, u * 160, r * Math.sin(a) * 160], i * 3);
      col.set([k * (warm < 0.2 ? 1 : 0.9), k * 0.93, k * (warm > 0.8 ? 1 : 0.92)], i * 3);
    }
    return { pos, col };
  }, []);

  const glow = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "#fff"); g.addColorStop(0.2, "rgba(255,220,140,.9)"); g.addColorStop(1, "rgba(255,180,60,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  const earthTex = useMemo(() => {
    const rnd = seeded(11), c = document.createElement("canvas"); c.width = 256; c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#1d56a8"; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 46; i++) {
      x.fillStyle = i % 3 ? "#3f8a4b" : "#e9eef5"; x.globalAlpha = i % 3 ? 0.85 : 0.5;
      x.beginPath(); x.ellipse(rnd() * 256, rnd() * 128, 6 + rnd() * 22, 4 + rnd() * 10, rnd() * 3, 0, TAU); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const earthRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (earthRef.current) earthRef.current.rotation.y += dt * 0.05; });

  const sel = dir(site.lat, site.lon);
  const earthUp = lookAt(site, earth).elevationDeg > 0, sunUp = lookAt(site, sun).elevationDeg > 0;
  const sitePos = sel.clone().multiplyScalar(1.002).applyQuaternion(q);
  const labelOf = (s: LandingSite) => hover === s.id || s.id === site.id;

  return (
    <>
      <ambientLight intensity={0.035} color="#8aa4d0" />
      <directionalLight position={light} intensity={3.2} />
      <directionalLight position={earthPos} intensity={0.05} color="#6cb4ff" />

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[stars.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={1.3} sizeAttenuation={false} vertexColors transparent depthWrite={false} />
      </points>

      <group quaternion={q}>
        <mesh ref={moonRef}>
          <sphereGeometry args={[1, 192, 96]} />
          <meshStandardMaterial key={bump ? "detail" : "base"} map={base} bumpMap={bump ?? undefined} bumpScale={bump ? 2 : 0} roughness={1} metalness={0} />
        </mesh>
        <primitive object={grat} visible={showGrid} />
        {sites.map((s) => {
          const n = dir(s.lat, s.lon);
          return (
            <group key={s.id}>
              <mesh position={n.clone().multiplyScalar(1.008)} onClick={(e) => { e.stopPropagation(); onPick?.(s.id); }} onPointerOver={(e) => { e.stopPropagation(); setHover(s.id); document.body.style.cursor = "pointer"; }} onPointerOut={() => { setHover(null); document.body.style.cursor = ""; }}>
                <sphereGeometry args={[0.008, 10, 10]} /><meshBasicMaterial color="#ffffff" />
              </mesh>
              {labelOf(s) && s.id !== "custom" && (
                <Html position={n.clone().multiplyScalar(1.05)} occlude={[moonRef as React.RefObject<THREE.Object3D>]} style={{ pointerEvents: "none" }}>
                  <span className="whitespace-nowrap text-[11px] text-white [text-shadow:0_0_4px_#000,0_0_4px_#000]">{s.name}</span>
                </Html>
              )}
            </group>
          );
        })}
        <SiteMarker n={sel} color={site.kind === "custom" ? "#ff5ad1" : "#ffc766"} />
      </group>

      {earthUp && <Line points={[sitePos, earthPos]} color="#7fe3a1" transparent opacity={0.7} />}
      {sunUp && <Line points={[sitePos, sitePos.clone().addScaledVector(sunPos.clone().normalize(), 0.6)]} color="#ffc766" />}

      <mesh ref={earthRef} position={earthPos}>
        <sphereGeometry args={[0.55, 48, 24]} /><meshStandardMaterial map={earthTex} roughness={0.8} />
      </mesh>

      <sprite position={sunPos} scale={[15, 15, 1]}><spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent /></sprite>
      <sprite position={sunPos} scale={[6.35, 6.35, 1]} center={new THREE.Vector2(0.4993, 0.5129)}>
        <spriteMaterial map={sunTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>

      {showOrbiters && ORBITERS.map((o, i) => <Orbiter key={o.name} o={o} i={i} altKm={orbiterAltKm} />)}

      <OrbitControls enablePan={false} minDistance={1.12} maxDistance={16} rotateSpeed={0.6} />
    </>
  );
}

export function Moon3D(props: Moon3DProps) {
  return (
    <Canvas camera={{ fov: 40, near: 0.02, far: 400 }} gl={{ antialias: true }} dpr={[1, 2]}>
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
