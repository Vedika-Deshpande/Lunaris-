# Lunar Landing Site Navigator

    npm install
    npm run dev

Open http://localhost:5173/

Sun/Earth positions are computed in src/lib/ephemeris.ts (approximate model, smooth-sphere horizon).
Backend contract: src/api/index.ts.

## 3D Moon

`src/components/dashboard/Moon3D.tsx` is the React Three Fiber port of the original single-file simulator
(Sun-fixed / Moon-fixed frame, stars, photographic Sun, Earth, orbiters, clickable sites, uplink line).
The `/simulator` route uses it with the Sun-fixed frame and orbiters on by default.

Surface: `public/textures/moon.jpg` is a 4096x2048 global Clementine-based map (near and far side).
`src/lib/moonDetail.ts` builds a fine-relief bump map from it in a Web Worker (high-passed albedo + regolith
noise + small craters), so the Moon shows relief at the terminator and when zoomed in.
Texture credit: Jens Meyer / Steve Albers map, via github.com/CoryG89/MoonDemo (free for personal, non-commercial use).
Replace it with a public-domain LROC/LOLA map before any commercial use.
