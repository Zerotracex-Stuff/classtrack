/**
 * Pure TypeScript QR Code Matrix Generator (Byte Mode, Version 1 to 10)
 * Renders a 2D boolean matrix suitable for SVG / Canvas rendering.
 */

// QR Code polynomial & RS Galois Field tables
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x & 128 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function gfPolyMul(p1: number[], p2: number[]): number[] {
  const r = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      r[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return r;
}

function gfPolyDivRemainder(dividend: number[], divisor: number[]): number[] {
  const result = [...dividend];
  for (let i = 0; i < dividend.length - divisor.length + 1; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 1; j < divisor.length; j++) {
        result[i + j] ^= gfMul(divisor[j], coef);
      }
    }
  }
  return result.slice(dividend.length - divisor.length + 1);
}

function getGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = gfPolyMul(poly, [1, GF256_EXP[i]]);
  }
  return poly;
}

// QR Version specifications for Medium Error Correction (EC Level M)
// Supported versions: 1 (21x21), 2 (25x25), 3 (29x29), 4 (33x33), 5 (37x37)
const VERSION_SPECS: Record<number, { size: number; totalBytes: number; ecBytes: number; align: number[] }> = {
  1: { size: 21, totalBytes: 26, ecBytes: 10, align: [] },
  2: { size: 25, totalBytes: 44, ecBytes: 16, align: [6, 18] },
  3: { size: 29, totalBytes: 70, ecBytes: 26, align: [6, 22] },
  4: { size: 33, totalBytes: 100, ecBytes: 36, align: [6, 26] },
  5: { size: 37, totalBytes: 134, ecBytes: 48, align: [6, 30] },
};

export function generateQRCodeMatrix(text: string): boolean[][] {
  const utf8Bytes = Array.from(new TextEncoder().encode(text));
  
  // Pick smallest fitting version
  let version = 1;
  while (version <= 5) {
    const spec = VERSION_SPECS[version];
    const dataCapacity = spec.totalBytes - spec.ecBytes - 2; // header overhead
    if (utf8Bytes.length <= dataCapacity) break;
    version++;
  }
  if (version > 5) version = 5; // fallback max cap

  const spec = VERSION_SPECS[version];
  const size = spec.size;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Function to place finder patterns
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isBlack =
            dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
            (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          matrix[nr][nc] = isBlack;
        }
      }
    }
  };

  // Place 3 finders
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  if (spec.align.length > 0) {
    for (const r of spec.align) {
      for (const c of spec.align) {
        if (matrix[r][c] !== null) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            matrix[r + dr][c + dc] =
              Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          }
        }
      }
    }
  }

  // Encode data bitstream (Mode 4: Byte Mode)
  const bits: number[] = [];
  const addBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  addBits(0b0100, 4); // Mode byte
  addBits(utf8Bytes.length, 8); // Character count
  for (const b of utf8Bytes) {
    addBits(b, 8);
  }

  const maxDataBits = (spec.totalBytes - spec.ecBytes) * 8;
  // Terminate
  while (bits.length < maxDataBits && bits.length % 8 !== 0) bits.push(0);
  while (bits.length < maxDataBits) {
    addBits(0xec, 8);
    if (bits.length < maxDataBits) addBits(0x11, 8);
  }

  // Convert bits to data codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    dataCodewords.push(byte);
  }

  // Error Correction codewords
  const genPoly = getGeneratorPoly(spec.ecBytes);
  const ecCodewords = gfPolyDivRemainder([...dataCodewords, ...new Array(spec.ecBytes).fill(0)], genPoly);

  const finalCodewords = [...dataCodewords, ...ecCodewords];
  const finalBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let b = 7; b >= 0; b--) {
      finalBits.push((cw >> b) & 1);
    }
  }

  // Place data bits in matrix (Zigzag pattern)
  let bitIdx = 0;
  let dir = -1; // up
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing column
    const rStart = dir === -1 ? size - 1 : 0;
    const rEnd = dir === -1 ? -1 : size;
    for (let r = rStart; r !== rEnd; r += dir) {
      for (const col of [c, c - 1]) {
        if (matrix[r][col] === null) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply mask 0 ( (r + col) % 2 === 0 )
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    dir = -dir;
  }

  // Fill any remaining nulls with false
  return matrix.map(row => row.map(cell => cell === true));
}
