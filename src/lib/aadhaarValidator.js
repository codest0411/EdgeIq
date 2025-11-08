/**
 * FREE Aadhaar Validation - Detects Invalid/Wrong Aadhaar Numbers
 * Uses Verhoeff Algorithm (Official UIDAI checksum algorithm)
 * NO API REQUIRED - Works Offline
 */

// Verhoeff algorithm tables (used by UIDAI)
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Verhoeff checksum validation (same algorithm UIDAI uses)
 * This catches 99% of typos and fake numbers
 */
function verhoeffValidate(aadhaarNumber) {
  let c = 0;
  const myArray = aadhaarNumber.split('').reverse().map(Number);
  
  for (let i = 0; i < myArray.length; i++) {
    c = d[c][p[(i % 8)][myArray[i]]];
  }
  
  return c === 0;
}

/**
 * Main validation function - Detects wrong/invalid Aadhaar
 * Returns detailed error messages
 */
export function validateAadhaarNumber(aadhaarNumber) {
  if (!aadhaarNumber) {
    return {
      isValid: false,
      error: 'Aadhaar number is required'
    };
  }
  
  // Clean input
  const cleaned = String(aadhaarNumber).replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  // Check 1: Must be exactly 12 digits
  if (cleaned.length !== 12) {
    return {
      isValid: false,
      error: `Invalid length: ${cleaned.length} digits (must be 12 digits)`
    };
  }
  
  // Check 2: Cannot start with 0 or 1 (UIDAI rule)
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return {
      isValid: false,
      error: 'Invalid Aadhaar: Cannot start with 0 or 1'
    };
  }
  
  // Check 3: Verhoeff checksum validation (catches typos and fake numbers)
  if (!verhoeffValidate(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid Aadhaar number: Checksum verification failed (wrong number or typo)'
    };
  }
  
  // All checks passed
  const formatted = cleaned.match(/.{1,4}/g).join(' ');
  
  return {
    isValid: true,
    error: null,
    formatted: formatted,
    cleaned: cleaned
  };
}

export default validateAadhaarNumber;
