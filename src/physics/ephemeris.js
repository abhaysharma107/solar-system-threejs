/**
 * Planetary Ephemeris — JPL Approximate Positions
 *
 * Computes heliocentric ecliptic coordinates (x, z) for each planet
 * for any given JavaScript Date, using Keplerian elements from:
 *   NASA JPL — "Approximate Positions of the Planets"
 *   https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *   Table 1 (1800 AD – 2050 AD)
 *
 * Returns angles (true anomaly + longitude of perihelion) that can be
 * used directly as orbital angles in the 3D scene.
 */

const DEG = Math.PI / 180;

// ── JPL Table 1: Keplerian elements at J2000 + rates per century ──
// [a0, aRate, e0, eRate, I0, IRate, L0, LRate, wBar0, wBarRate, Omega0, OmegaRate]
// a in AU, e dimensionless, I/L/wBar/Omega in degrees, rates per Julian century
const ELEMENTS = {
  Mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  Venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  Earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
  Mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  Jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  Saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  Uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
  Neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
};

// Pluto is not in JPL Table 1. We use fixed Keplerian elements (adequate for visualization).
const PLUTO_ELEMENTS = [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482];

/**
 * Convert a JS Date to Julian centuries past J2000.0
 */
function dateToCenturies(date) {
  // J2000.0 = 2000 Jan 1.5 TDB ≈ 2451545.0 JD
  const JD = (date.getTime() / 86400000) + 2440587.5;
  return (JD - 2451545.0) / 36525.0;
}

/**
 * Normalize angle to [-180, +180] degrees
 */
function normalizeDeg(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Solve Kepler's equation M = E - e*sin(E)  (all in degrees)
 * Returns E in degrees.
 */
function solveKepler(M, e) {
  const eStar = (180 / Math.PI) * e; // e in degrees for the formula
  let E = M + eStar * Math.sin(M * DEG);
  for (let i = 0; i < 20; i++) {
    const dM = M - (E - eStar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  return E;
}

/**
 * Compute the orbital angle (heliocentric longitude in the orbital plane)
 * for a given planet at a given JS Date.
 *
 * Returns { angle, distance } where:
 *   angle    — heliocentric longitude in radians (use directly as orbitPivot.rotation.y)
 *   distance — heliocentric distance in AU
 */
export function getPlanetPosition(name, date) {
  const T = dateToCenturies(date);
  const el = name === 'Pluto' ? PLUTO_ELEMENTS : ELEMENTS[name];
  if (!el) return { angle: 0, distance: 1 };

  // Compute elements at time T
  const a     = el[0]  + el[1]  * T;
  const e     = el[2]  + el[3]  * T;
  const I     = el[4]  + el[5]  * T; // degrees (unused for 2D angle, kept for completeness)
  const L     = el[6]  + el[7]  * T; // mean longitude, degrees
  const wBar  = el[8]  + el[9]  * T; // longitude of perihelion, degrees
  const Omega = el[10] + el[11] * T; // longitude of ascending node, degrees

  // Mean anomaly
  const M = normalizeDeg(L - wBar);

  // Eccentric anomaly
  const E = solveKepler(M, e);

  // Heliocentric coordinates in the orbital plane
  const xPrime = a * (Math.cos(E * DEG) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E * DEG);

  // We can compute the true longitude in the ecliptic plane for each planet.
  // For our 3D scene (top-down, Y-up), we map ecliptic → XZ plane.
  const omega = wBar - Omega; // argument of perihelion
  const w = omega * DEG;
  const O = Omega * DEG;
  const Inc = I * DEG;

  // Ecliptic coordinates (simplified — includes inclination)
  const xEcl = (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(Inc)) * xPrime
             + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(Inc)) * yPrime;
  const yEcl = (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(Inc)) * xPrime
             + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(Inc)) * yPrime;

  // Convert to angle (atan2) and distance
  const angle = Math.atan2(yEcl, xEcl);
  const distance = Math.sqrt(xEcl * xEcl + yEcl * yEcl);

  return { angle, distance };
}

/**
 * Compute all planet positions for a given Date.
 * Returns Map<string, { angle, distance }>
 */
export function getAllPositions(date) {
  const positions = new Map();
  const names = [...Object.keys(ELEMENTS), 'Pluto'];
  for (const name of names) {
    positions.set(name, getPlanetPosition(name, date));
  }
  return positions;
}

/**
 * Get the current Julian Date from a JS Date
 */
export function dateToJD(date) {
  return (date.getTime() / 86400000) + 2440587.5;
}
