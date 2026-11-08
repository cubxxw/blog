export function createTimberSampler(width, height, seed, worn = false) {
  // These terms depend only on the column. Keep Number precision and the
  // original expression order so color and roughness pixels remain identical.
  const columns = Array.from({ length: width }, (_, x) => {
    const u = x / width, kx = u - (worn ? .78 : .73);
    return {
    u, kx,
    bend: Math.sin(u * 4.7 + seed) * (worn ? .027 : .009) + Math.sin(u * 13.3 + seed) * (worn ? .008 : .003),
    knotWave: Math.sin(kx * 11),
    broadA: Math.sin(u * 2.3 + seed) * .65,
    broadB: Math.sin(u * 7.1 + seed) * .4,
    fibreB: Math.sin(u * 13 + seed) * .7,
    poreWave: Math.sin(u * 8 + seed),
    joint: (Math.exp(-u * 38) + Math.exp(-(1 - u) * 38)) * 7,
    edgeFactor: worn ? 10 + Math.sin(u * 11) * 2 : 0,
    };
  });
  return (x, y) => {
    const column = columns[x];
    const { u, kx, bend, joint } = column, v = y / height;
    const ky = v - (worn ? .09 : .29);
    const knot = Math.exp(-(kx * kx * 58 + ky * ky * 115));
    const grain = v + bend + knot * column.knotWave * .09;
    const broad = Math.sin(grain * 17 + column.broadA) * (worn ? 4.8 : 10.5)
      + Math.sin(grain * 43 + column.broadB) * (worn ? 1.5 : 3.2);
    const fibre = Math.sin(grain * 196 + Math.sin(u * 6.8 + v * 11) * .48) * 1.9
      + Math.sin(grain * 479 + column.fibreB) * 1.1;
    const pore = Math.pow(Math.max(0, Math.sin(grain * 750 + column.poreWave)), 22) * 4;
    const noise = (Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453 % 1) * 1.4;
    const heart = Math.exp(-(kx * kx * 680 + ky * ky * 2500)) * (worn ? 17 : 20);
    // A couple of broad, irregular oxidised areas belong to this old slab;
    // the remaining joinery keeps its existing quiet pigment and finish.
    const oxidation = worn ? (Math.exp(-((u - .16) ** 2 * 19 + (v - .61) ** 2 * 40))
      + Math.exp(-((u - .82) ** 2 * 32 + (v - .34) ** 2 * 24)) * .72)
      * (11 + Math.sin(u * 9 + v * 7) * 2.6 + Math.sin(u * 19 - v * 4) * .9) : 0;
    const edge = worn ? Math.pow(Math.max(0, 1 - v * 7), 2) * column.edgeFactor : 0;
    const handPolish = worn ? Math.exp(-((u-.38)**2*12+(v-.08)**2*160))*.08 : 0;
    const rubbedTone=worn?Math.exp(-((u-.42)**2*7+(v-.085)**2*140))*7:0;
    const quietCloud=worn?(Math.sin(u*8.3+v*4.9+seed)+Math.sin(u*3.9-v*6.2))*1.2:0;
    return {tone:broad+fibre-pore+noise-heart-edge-joint-oxidation+rubbedTone+quietCloud,oil:(worn?.78:.73)+Math.sin(grain*17)*.025+pore*.004-handPolish+oxidation*.003};
  };
}
