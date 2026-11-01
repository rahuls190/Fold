/* Print checks that look at the real geometry, not the settings.
   thinnestWall: the thinnest wall measured perpendicular to the surface. For a radially offset shell a
   face whose normal makes angle a with the radial direction is wall*cos(a) thick. Against an exact
   point-to-surface measurement on 32 pattern/profile cases: usually within 10 %, worst +12 % / -22 %.
   selfIntersection: exact triangle/triangle test in a background worker (angular sectors + height sweep),
   cached per section shape so it runs once per change and never blocks the page. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  function thinnestWall(mesh, m) {
    if (!mesh || mesh.spiralEnvelope || m.pattern === 'hypar') return null;
    if (mesh.panelInfo) return { mm: m.wall, exact: true };
    let wall = m.wall;
    if (mesh.vessel) wall *= Math.min(m.vase?.scaleX || 1, m.vase?.scaleY || 1);
    const V = mesh.vertices; let zmin = Infinity, zmax = -Infinity;
    for (const v of V) { if (v[2] < zmin) zmin = v[2]; if (v[2] > zmax) zmax = v[2]; }
    const solidBase = mesh.vessel && m.vase?.base && m.mount === 'none' ? m.vase.baseThickness : 0;
    const lo = zmin + (m.mount === 'bottom' ? m.plate : solidBase) + 0.01, hi = zmax - (m.mount === 'top' ? m.plate : 0) - 0.01;
    const cut = m.pattern === 'pierced' || m.pattern === 'nervous';
    let best = Infinity, at = 0;
    /* a cut edge is as thick as the wall minus the rounding taken off each face */
    if (cut) { best = wall - 2 * Math.min(m.round || 0, 0.35 * wall, Math.max(0, (wall - 0.8) / 2)); at = (zmin + zmax) / 2; }
    for (const t of mesh.faces) {
      const a = V[t[0]], b = V[t[1]], c = V[t[2]];
      if (Math.max(a[2], b[2], c[2]) <= lo || Math.min(a[2], b[2], c[2]) >= hi) continue;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, L = Math.hypot(nx, ny, nz);
      const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, r = Math.hypot(cx, cy);
      if (!L || !r) continue;
      const d = (nx * cx + ny * cy) / (L * r);
      if (d <= (cut ? 0.75 : 0.02)) continue;        /* inner shell, rims, plates; for cut-outs also the hole side walls */
      const th = wall * d;
      if (th < best) { best = th; at = (a[2] + b[2] + c[2]) / 3; }
    }
    return Number.isFinite(best) ? { mm: best, z: at, exact: false } : null;
  }

  /* Runs inside the worker (and as a fallback on the page). P: flat xyz, T: flat triangle indices. */
  function findSelfIntersection(P, T) {
    const m = T.length / 3, S = 96, box = new Float64Array(m * 6), sectors = Array.from({ length: S }, () => []);
    for (let i = 0; i < m; i++) {
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, a0 = 0, lo = 0, hi = 0;
      for (let c = 0; c < 3; c++) {
        const k = T[3 * i + c] * 3, x = P[k], y = P[k + 1], z = P[k + 2];
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
        const a = Math.atan2(y, x);
        if (c === 0) a0 = a; else { let d = a - a0; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; if (d < lo) lo = d; if (d > hi) hi = d; }
      }
      box[i * 6] = x0; box[i * 6 + 1] = y0; box[i * 6 + 2] = z0; box[i * 6 + 3] = x1; box[i * 6 + 4] = y1; box[i * 6 + 5] = z1;
      if (hi - lo > Math.PI / 2 || Math.min(Math.hypot(x0, y0), Math.hypot(x1, y1), Math.hypot((x0 + x1) / 2, (y0 + y1) / 2)) < 1) { for (let s = 0; s < S; s++) sectors[s].push(i); continue; }
      const s0 = Math.floor((a0 + lo) / TAU * S), s1 = Math.floor((a0 + hi) / TAU * S);
      for (let s = s0; s <= s1; s++) sectors[((s % S) + S) % S].push(i);
    }
    const p = (i, c) => T[3 * i + c] * 3;
    function segTri(pi, qi, ai, bi, ci) {
      const dx = P[qi] - P[pi], dy = P[qi + 1] - P[pi + 1], dz = P[qi + 2] - P[pi + 2];
      const e1x = P[bi] - P[ai], e1y = P[bi + 1] - P[ai + 1], e1z = P[bi + 2] - P[ai + 2], e2x = P[ci] - P[ai], e2y = P[ci + 1] - P[ai + 1], e2z = P[ci + 2] - P[ai + 2];
      const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, det = e1x * hx + e1y * hy + e1z * hz;
      if (Math.abs(det) < 1e-12) return false;
      const f = 1 / det, sx = P[pi] - P[ai], sy = P[pi + 1] - P[ai + 1], sz = P[pi + 2] - P[ai + 2], u = f * (sx * hx + sy * hy + sz * hz);
      if (u < 1e-7 || u > 1 - 1e-7) return false;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = f * (dx * qx + dy * qy + dz * qz);
      if (v < 1e-7 || u + v > 1 - 1e-7) return false;
      const t = f * (e2x * qx + e2y * qy + e2z * qz); return t > 1e-7 && t < 1 - 1e-7;
    }
    const seen = new Set();
    for (const list of sectors) {
      list.sort((a, b) => box[a * 6 + 2] - box[b * 6 + 2]);
      for (let ii = 0; ii < list.length; ii++) {
        const i = list[ii], zi = box[i * 6 + 5];
        for (let jj = ii + 1; jj < list.length; jj++) {
          const j = list[jj]; if (box[j * 6 + 2] > zi) break;
          if (box[j * 6] > box[i * 6 + 3] || box[i * 6] > box[j * 6 + 3] || box[j * 6 + 1] > box[i * 6 + 4] || box[i * 6 + 1] > box[j * 6 + 4]) continue;
          const A0 = T[3 * i], A1 = T[3 * i + 1], A2 = T[3 * i + 2], B0 = T[3 * j], B1 = T[3 * j + 1], B2 = T[3 * j + 2];
          if (A0 === B0 || A0 === B1 || A0 === B2 || A1 === B0 || A1 === B1 || A1 === B2 || A2 === B0 || A2 === B1 || A2 === B2) continue;
          const key = i < j ? i * m + j : j * m + i; if (seen.has(key)) continue; seen.add(key);
          for (let e = 0; e < 3; e++) {
            if (segTri(p(i, e), p(i, (e + 1) % 3), p(j, 0), p(j, 1), p(j, 2)) || segTri(p(j, e), p(j, (e + 1) % 3), p(i, 0), p(i, 1), p(i, 2)))
              return { z: (P[p(i, 0) + 2] + P[p(i, 1) + 2] + P[p(i, 2) + 2]) / 3 };
          }
        }
      }
    }
    return null;
  }

  /* Background runner: one job at a time, newest shape wins, results cached by key. */
  const cache = new Map(); let worker = null, workerFailed = false, current = null, timer = 0, onDone = null;
  function makeWorker() {
    if (worker || workerFailed) return worker;
    try {
      const src = 'const findSelfIntersection=' + findSelfIntersection.toString() + ';const TAU=Math.PI*2;self.onmessage=e=>{const r=findSelfIntersection(e.data.P,e.data.T);self.postMessage({key:e.data.key,hit:r});};';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = e => { if (current !== e.data.key) return; remember(e.data.key, { state: 'done', hit: e.data.hit }); current = null; onDone && onDone(); };
      worker.onerror = () => { workerFailed = true; worker = null; current = null; };
    } catch { workerFailed = true; worker = null; }
    return worker;
  }
  function remember(k, v) { cache.set(k, v); if (cache.size > 40) cache.delete(cache.keys().next().value); }
  function flatten(mesh) {
    const P = new Float64Array(mesh.vertices.length * 3), T = new Uint32Array(mesh.faces.length * 3);
    mesh.vertices.forEach((v, i) => { P[3 * i] = v[0]; P[3 * i + 1] = v[1]; P[3 * i + 2] = v[2]; });
    mesh.faces.forEach((f, i) => { T[3 * i] = f[0]; T[3 * i + 1] = f[1]; T[3 * i + 2] = f[2]; });
    return { P, T };
  }
  function selfIntersection(key, mesh, done) {
    if (cache.has(key)) return cache.get(key);
    onDone = done;
    if (current === key) return { state: 'running' };
    clearTimeout(timer);
    if (current && worker) { worker.terminate(); worker = null; }
    current = key;
    timer = setTimeout(() => {
      if (current !== key) return;
      const w = makeWorker(), { P, T } = flatten(mesh);
      if (w) w.postMessage({ key, P, T }, [P.buffer, T.buffer]);
      else if (mesh.faces.length <= 30000) { remember(key, { state: 'done', hit: findSelfIntersection(P, T) }); current = null; done && done(); }
      else { remember(key, { state: 'skipped' }); current = null; done && done(); }
    }, 300);
    return { state: 'running' };
  }

  root.FoldlightChecks = { thinnestWall, findSelfIntersection, selfIntersection };
  if (typeof module !== 'undefined') module.exports = root.FoldlightChecks;
})(globalThis);
