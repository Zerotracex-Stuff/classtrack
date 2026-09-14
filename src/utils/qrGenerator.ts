import QRCode from 'qrcode';

/**
 * Generates a 2D boolean matrix for a given string using the standard QR code specification (ISO/IEC 18004).
 * Returns boolean[][] where true represents a dark module and false represents a light module.
 * Fully compatible with all native and web barcode/QR scanners.
 */
export function generateQRCodeMatrix(
  text: string,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): boolean[][] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  try {
    const qr = QRCode.create(text, { errorCorrectionLevel });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];

    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.modules.get(r, c) === 1);
      }
      matrix.push(row);
    }

    return matrix;
  } catch (error) {
    console.error('Error generating QR code matrix:', error);
    return [];
  }
}
