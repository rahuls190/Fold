/* Joint sleeves for stacked Foldlight sections.
   A sleeve is a thin ring that slides inside two neighbouring sections at their shared rim.
   Its outer wall traces the sections' inner wall (minus a clearance), so it follows the pleats,
   locks rotation and aligns both parts. Moving away from the joint, the outer radius may only
   stay equal or shrink (running minimum), so the sleeve can always be pushed in from the rim.
   Units: mm. Meshes use the Foldlight convention: vertices [x, y, z], z up, part base at z = 0. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Radial distance from the axis to the nearest wall, sampled at A angles, on the plane z. */
  function radialAt(tris, V, z, A) {
    const r = new Float64Array(A).fill(Infinity), step = TAU / A;
    for (const t of tris) {
      const p = V[t[0]], q = V[t[1]], s = V[t[2]], pts = [];
      for (const [a, b] of [[p, q], [q, s], [s, p]]) {
        const da = a[2] - z, db = b[2] - z;
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const u = da / (da - db); pts.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); }
      }
      if (pts.length < 2) continue;
      const [P, Q] = pts, Dx = Q[0] - P[0], Dy = Q[1] - P[1];
      let a1 = Math.atan2(P[1], P[0]), a2 = Math.atan2(Q[1], Q[0]), span = a2 - a1;
      if (span > Math.PI) span -= TAU; else if (span < -Math.PI) span += TAU;
      if (Math.abs(span) > Math.PI / 2) continue;
      const lo = Math.min(a1, a1 + span), hi = Math.max(a1, a1 + span);
      for (let k = Math.ceil(lo / step - 1e-9); k <= Math.floor(hi / step + 1e-9); k++) {
        const th = k * step, ux = Math.cos(th), uy = Math.sin(th), den = ux * Dy - uy * Dx;
        if (Math.abs(den) < 1e-12) continue;
        const tt = (P[0] * Dy - P[1] * Dx) / den;
        if (tt <= 0) continue;
        const idx = ((k % A) + A) % A;
        if (tt < r[idx]) r[idx] = tt;
      }
    }
    return r;
  }

  /* Pull the two sample angles either side of a wall corner down to that corner's radius.
     Between samples the sleeve is a straight chord, so a sharp inward corner that falls between
     two samples would otherwise poke through the chord. */
  function pinCorner(r, x, y, A) {
    const rad = Math.hypot(x, y); if (!(rad > 0)) return;
    const u = ((Math.atan2(y, x) / TAU) % 1 + 1) % 1 * A, i = Math.floor(u) % A, j = (i + 1) % A;
    if (rad < r[i]) r[i] = rad; if (rad < r[j]) r[j] = rad;
  }
  /* radialAt plus every slice-polygon corner pinned (conservative wall for fitting). */
  function wallAt(tris, V, z, A) {
    const r = radialAt(tris, V, z, A);
    for (const t of tris) {
      for (const [a, b] of [[V[t[0]], V[t[1]]], [V[t[1]], V[t[2]]], [V[t[2]], V[t[0]]]]) {
        const da = a[2] - z, db = b[2] - z;
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const u = da / (da - db); pinCorner(r, a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1]), A); }
      }
    }
    return r;
  }

  /* Inner-wall envelope of one section near one end. fromTop: walk down from the top rim.
     The wall is sliced every FINE mm (triangles bucketed by height so each slice is cheap),
     mesh vertices inside the band are added as point limits, and a running minimum keeps the
     sleeve insertable. Returned rows are spaced `step` apart; each row uses the envelope at
     the NEXT row's depth, so the straight band between two rows never reaches past any wall
     sample inside it. */
  const FINE = 0.25;
  function envelope(mesh, depth, step, fromTop, A) {
    const V = mesh.vertices; let zTop = -Infinity, zBot = Infinity;
    for (const v of V) { if (v[2] > zTop) zTop = v[2]; if (v[2] < zBot) zBot = v[2]; }
    const lo = fromTop ? zTop - depth - 1 : zBot, hi = fromTop ? zTop : zBot + depth + 1, nb = Math.ceil((hi - lo) / FINE) + 2;
    const bins = Array.from({ length: nb }, () => []);
    for (const t of mesh.faces) {
      const a = V[t[0]][2], b = V[t[1]][2], c = V[t[2]][2], z0 = Math.min(a, b, c), z1 = Math.max(a, b, c);
      if (z1 < lo || z0 > hi) continue;
      for (let k = Math.max(0, Math.floor((z0 - lo) / FINE)); k <= Math.min(nb - 1, Math.floor((z1 - lo) / FINE)); k++) bins[k].push(t);
    }
    const nf = Math.max(1, Math.ceil(depth / FINE)), raw = [];
    for (let k = 0; k <= nf; k++) {
      const d = Math.min(depth, k * FINE), off = Math.max(0.05, d);   /* stay just off the rim face */
      const z = fromTop ? zTop - off : zBot + off, bin = bins[Math.min(nb - 1, Math.max(0, Math.floor((z - lo) / FINE)))];
      raw.push(wallAt(bin, V, z, A));
    }
    for (const v of V) {                                   /* wall corners between slices */
      const d = fromTop ? zTop - v[2] : v[2] - zBot;
      if (d > 0.05 && d <= depth) pinCorner(raw[Math.min(nf, Math.ceil(d / FINE))], v[0], v[1], A);
    }
    const fineEnv = []; let env = null;
    for (const rr of raw) { env = env ? env.map((e, i) => Math.min(e, rr[i])) : Float64Array.from(rr); fineEnv.push(env); }
    const at = d => fineEnv[Math.min(nf, Math.ceil(d / FINE - 1e-9))];
    const n = Math.max(1, Math.ceil(depth / step)), levels = [], rawRows = [];
    for (let k = 0; k <= n; k++) {
      const d = Math.min(depth, k * step);
      levels.push({ d, env: Float64Array.from(at(Math.min(depth, d + step))) });
      rawRows.push(raw[Math.min(nf, Math.round(d / FINE))]);
    }
    return { levels, raw: rawRows };
  }

  function sleeve(lower, upper, opt) {
    const depth = opt.depth, c = opt.clearance, w = opt.wall, step = opt.step || 1.5, A = opt.angles || 720;
    const L = envelope(lower, depth, step, true, A), U = envelope(upper, depth, step, false, A);
    const joint = L.levels[0].env.map((e, i) => Math.min(e, U.levels[0].env[i]));
    if (joint.some(x => !Number.isFinite(x))) throw Error('Could not trace the inner wall at this joint');
    /* stack levels bottom -> top in joint coordinates (z = 0 at the shared rim) */
    const rows = [];
    for (let k = L.levels.length - 1; k >= 1; k--) rows.push({ z: -L.levels[k].d, env: L.levels[k].env.map((e, i) => Math.min(e, joint[i])), raw: L.raw[k] });
    rows.push({ z: 0, env: joint, raw: joint });
    for (let k = 1; k < U.levels.length; k++) rows.push({ z: U.levels[k].d, env: U.levels[k].env.map((e, i) => Math.min(e, joint[i])), raw: U.raw[k] });
    let minInner = Infinity, gapSum = 0, gapN = 0, contact = 0;
    const V = [], F = [], R = rows.length;
    rows.forEach(row => {
      for (let i = 0; i < A; i++) {
        const ro = row.env[i] - c, ri = ro - w, th = i / A * TAU;
        if (!Number.isFinite(ro)) throw Error('Could not trace the inner wall at this joint');
        minInner = Math.min(minInner, ri);
        const gap = row.raw[i] - ro; if (Number.isFinite(gap)) { gapSum += gap; gapN++; if (gap <= c + 0.35) contact++; }
        V.push([ro * Math.cos(th), ro * Math.sin(th), row.z]);
      }
      for (let i = 0; i < A; i++) { const ro = row.env[i] - c - w, th = i / A * TAU; V.push([ro * Math.cos(th), ro * Math.sin(th), row.z]); }
    });
    if (minInner < 3) throw Error('Sleeve wall is too thick for this opening');
    const o = (r, i) => r * 2 * A + ((i % A) + A) % A, n = (r, i) => r * 2 * A + A + ((i % A) + A) % A;
    for (let r = 0; r < R - 1; r++) for (let i = 0; i < A; i++) {
      F.push([o(r, i), o(r, i + 1), o(r + 1, i + 1)], [o(r, i), o(r + 1, i + 1), o(r + 1, i)]);
      F.push([n(r, i), n(r + 1, i + 1), n(r, i + 1)], [n(r, i), n(r + 1, i), n(r + 1, i + 1)]);
    }
    for (let i = 0; i < A; i++) {
      F.push([o(0, i), n(0, i + 1), o(0, i + 1)], [o(0, i), n(0, i), n(0, i + 1)]);
      F.push([o(R - 1, i), o(R - 1, i + 1), n(R - 1, i + 1)], [o(R - 1, i), n(R - 1, i + 1), n(R - 1, i)]);
    }
    const inspect = root.ShadeEngine.inspect;
    let report = inspect(V, F); if (report.volume < 0) { F.forEach(t => t.reverse()); report = inspect(V, F); }
    let rmin = Infinity, rmax = 0; joint.forEach(x => { rmin = Math.min(rmin, x); rmax = Math.max(rmax, x); });
    return { vertices: V, faces: F, report, stats: { depth, wall: w, clearance: c, height: 2 * depth, meanGap: gapN ? gapSum / gapN : 0, contact: gapN ? contact / gapN : 0, rimMin: 2 * rmin, rimMax: 2 * rmax } };
  }

  /* move a joint-centred sleeve so its bottom is at z = 0, for printing */
  function forPrint(s) { const d = s.stats.depth; return { vertices: s.vertices.map(v => [v[0], v[1], v[2] + d]), faces: s.faces, report: s.report }; }

  root.JointEngine = { sleeve, forPrint, radialAt };
  if (typeof module !== 'undefined') module.exports = root.JointEngine;
})(globalThis);
