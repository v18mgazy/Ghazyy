import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale = 'en-US', currency = 'EGP') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Always use Latin digits (Arabic numerals) instead of Arabic digits
    numberingSystem: 'latn'
  }).format(value);
}

export function formatDate(date: Date | string | number, formatPattern = 'PP', localeCode = 'en') {
  const dateObj = date instanceof Date ? date : new Date(date);
  // Always use numeric format with Latin digits even for Arabic locale
  const options = { 
    locale: localeCode === 'ar' ? ar : enUS
  };
  
  // Format the date using date-fns library
  let formattedDate = format(dateObj, formatPattern, options);
  
  // If Arabic locale, ensure we still use Western Arabic numerals (0-9)
  if (localeCode === 'ar') {
    formattedDate = formattedDate.replace(/[٠-٩]/g, digit => 
      String.fromCharCode(digit.charCodeAt(0) - 1632 + 48)
    );
  }
  
  return formattedDate;
}

export function formatTimeAgo(date: Date | string | number, localeCode = 'en') {
  const dateObj = date instanceof Date ? date : new Date(date);
  // Format time ago using date-fns library
  let formattedTimeAgo = formatDistanceToNow(dateObj, { 
    addSuffix: true,
    locale: localeCode === 'ar' ? ar : enUS 
  });
  
  // For Arabic locale, replace Arabic numerals with Western/Latin numerals
  if (localeCode === 'ar') {
    formattedTimeAgo = formattedTimeAgo.replace(/[٠-٩]/g, digit => 
      String.fromCharCode(digit.charCodeAt(0) - 1632 + 48)
    );
  }
  
  return formattedTimeAgo;
}

export function generateInvoiceNumber() {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${randomNumber}`;
}

export function generateBarcodeNumber(type: 'ean13' | 'code128' = 'ean13') {
  if (type === 'code128') {
    // For Code128, generate a shorter code (5 digits only as requested)
    // This makes it easier to scan and process
    const prefix = 'C128-';
    const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return prefix + randomDigits;
  } else {
    // Generate a 13-digit barcode number (similar to EAN-13)
    const countryCode = '620'; // Example code for Egypt
    const manufacturerCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const productCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    
    // Calculate check digit (last digit)
    const digits = (countryCode + manufacturerCode + productCode).split('').map(Number);
    const sum = digits.reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return countryCode + manufacturerCode + productCode + checkDigit;
  }
}

export function getDirectionFromLanguage(language: string) {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export const validatePhoneNumber = (phone: string) => {
  // Simple validation for phone numbers
  // This should be extended based on your requirements
  return /^\+?[0-9]{8,15}$/.test(phone);
};

export function calculateTotal(price: number, quantity: number) {
  return parseFloat((price * quantity).toFixed(2));
}

export function calculateInvoiceTotal(subtotal: number, discount: number) {
  const total = Math.max(0, subtotal - discount);
  return parseFloat(total.toFixed(2));
}

export function calculateProfitFromInvoiceItems(items: any[]) {
  return items.reduce((total, item) => {
    const costPrice = item.product.purchasePrice * item.quantity;
    const salePrice = item.price * item.quantity;
    return total + (salePrice - costPrice);
  }, 0);
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function createWhatsAppLink(phoneNumber: string, message: string = "") {
  // Ensure the phone number is in the correct format (remove any spaces, dashes, etc.)
  const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
  
  // If the phone number doesn't already have a country code, add the default one (02 for Egypt)
  const phoneWithCountryCode = cleanedPhoneNumber.startsWith("+") 
    ? cleanedPhoneNumber 
    : (cleanedPhoneNumber.startsWith("0") 
      ? `+2${cleanedPhoneNumber}` 
      : `+20${cleanedPhoneNumber}`);
  
  // Create the WhatsApp URL
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
}

// Implementation of the barcode SVG generator with Code 128 support
export function generateBarcodeSVG(barcodeValue: string): string {
  // Determine if we should use Code 128 or EAN-13
  const useCode128 = !/^\d+$/.test(barcodeValue) || barcodeValue.length !== 13;
  
  if (useCode128) {
    return generateCode128SVG(barcodeValue);
  } else {
    return generateEAN13SVG(barcodeValue);
  }
}

// Generate a Code 128 barcode
function generateCode128SVG(barcodeValue: string): string {
  // Code 128 patterns for all characters (subset B - contains ASCII 32-127)
  const code128Patterns = [
    "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", // 0-4
    "10001001100", "10011001000", "10011000100", "10001100100", "11001001000", // 5-9
    "11001000100", "11000100100", "10110011100", "10011011100", "10011001110", // 10-14
    "10111001100", "10011101100", "10011100110", "11001110010", "11001011100", // 15-19
    "11001001110", "11011100100", "11001110100", "11101101110", "11101001100", // 20-24
    "11100101100", "11100100110", "11101100100", "11100110100", "11100110010", // 25-29
    "11011011000", "11011000110", "11000110110", "10100011000", "10001011000", // 30-34
    "10001000110", "10110001000", "10001101000", "10001100010", "11010001000", // 35-39
    "11000101000", "11000100010", "10110111000", "10110001110", "10001101110", // 40-44
    "10111011000", "10111000110", "10001110110", "11101110110", "11010001110", // 45-49
    "11000101110", "11011101000", "11011100010", "11011101110", "11101011000", // 50-54
    "11101000110", "11100010110", "11101101000", "11101100010", "11100011010", // 55-59
    "11101111010", "11001000010", "11110001010", "10100110000", "10100001100", // 60-64
    "10010110000", "10010000110", "10000101100", "10000100110", "10110010000", // 65-69
    "10110000100", "10011010000", "10011000010", "10000110100", "10000110010", // 70-74
    "11000010010", "11001010000", "11110111010", "11000010100", "10001111010", // 75-79
    "10100111100", "10010111100", "10010011110", "10111100100", "10011110100", // 80-84
    "10011110010", "11110100100", "11110010100", "11110010010", "11011011110", // 85-89
    "11011110110", "11110110110", "10101111000", "10100011110", "10001011110", // 90-94
    "10111101000", "10111100010", "11110101000", "11110100010", "10111011110", // 95-99
    "10111101110", "11101011110", "11110101110", "11010000100", "11010010000", // 100-104
    "11010011100" // 105 (START C)
  ];
  
  // Code 128 Start Code B (ASCII 32-127)
  const startPattern = "11010010000"; // START B (Code 104)
  
  // Constants for the barcode
  const height = 80;
  const moduleWidth = 2; // Width of the thinnest bar
  const fontSize = 14;
  const padding = { top: 10, left: 15, bottom: 20, right: 15 };
  const barHeight = height - padding.top - padding.bottom;
  
  // Calculate total width based on barcode content
  let totalModules = startPattern.length; // Start with width of START B pattern
  
  // Add width for each character
  for (let i = 0; i < barcodeValue.length; i++) {
    totalModules += 11; // Each character is 11 modules wide in Code 128
  }
  
  // Add width for checksum and stop character
  totalModules += 11 + 13; // Checksum (11) + STOP (13)
  
  const width = totalModules * moduleWidth + padding.left + padding.right;
  
  // Generate SVG for the Code 128 barcode
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Add white background
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`;
  
  // Start building the actual barcode
  let x = padding.left;
  
  // Calculate checksum
  let checksum = 104; // START B value
  for (let i = 0; i < barcodeValue.length; i++) {
    const charCode = barcodeValue.charCodeAt(i);
    // Code 128B uses ASCII values directly, but needs adjustment for values < 32
    const valueIndex = charCode - 32; // Adjust for ASCII table offset (32 is space)
    checksum += (i + 1) * valueIndex;
  }
  checksum %= 103; // Mod 103 gives the checksum index
  
  // Add START B pattern
  addPatternToSVG(startPattern, x, padding.top, moduleWidth, barHeight);
  x += startPattern.length * moduleWidth;
  
  // Add patterns for each character
  for (let i = 0; i < barcodeValue.length; i++) {
    const charCode = barcodeValue.charCodeAt(i);
    const valueIndex = charCode - 32; // Adjust for ASCII table offset
    const pattern = code128Patterns[valueIndex];
    
    addPatternToSVG(pattern, x, padding.top, moduleWidth, barHeight);
    x += pattern.length * moduleWidth;
  }
  
  // Add checksum pattern
  const checksumPattern = code128Patterns[checksum];
  addPatternToSVG(checksumPattern, x, padding.top, moduleWidth, barHeight);
  x += checksumPattern.length * moduleWidth;
  
  // Add STOP pattern (106)
  const stopPattern = "1100011101011";
  addPatternToSVG(stopPattern, x, padding.top, moduleWidth, barHeight);
  
  // Add text for the barcode value
  svg += `<text x="${width/2}" y="${height - 5}" text-anchor="middle" font-family="Arial" font-size="${fontSize}">${barcodeValue}</text>`;
  
  // Close the SVG
  svg += `</svg>`;
  
  return svg;
  
  // Helper function to add a pattern to the SVG
  function addPatternToSVG(pattern: string, xPos: number, yPos: number, modWidth: number, height: number) {
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        svg += `<rect x="${xPos}" y="${yPos}" width="${modWidth}" height="${height}" fill="black" />`;
      }
      xPos += modWidth;
    }
  }
}

// Generate an EAN-13 barcode SVG
function generateEAN13SVG(barcodeValue: string): string {
  // EAN-13 requires exactly 13 digits
  if (!/^\d{13}$/.test(barcodeValue)) {
    // Pad to 13 digits if needed or generate a valid EAN-13
    barcodeValue = barcodeValue.padEnd(12, '0');
    
    // Calculate check digit (13th digit)
    const digits = barcodeValue.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    barcodeValue = barcodeValue + checkDigit;
  }
  
  // EAN-13 encoding patterns
  const leftOddPatterns = [
    "0001101", "0011001", "0010011", "0111101", "0100011", 
    "0110001", "0101111", "0111011", "0110111", "0001011"
  ];
  
  const leftEvenPatterns = [
    "0100111", "0110011", "0011011", "0100001", "0011101", 
    "0111001", "0000101", "0010001", "0001001", "0010111"
  ];
  
  const rightPatterns = [
    "1110010", "1100110", "1101100", "1000010", "1011100", 
    "1001110", "1010000", "1000100", "1001000", "1110100"
  ];
  
  // First digit encoding patterns for the left side (which determines odd/even pattern)
  const firstDigitEncoding = [
    "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", 
    "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
  ];
  
  // Constants for the barcode
  const height = 80;
  const width = 220;
  const moduleWidth = 2; // Width of the thinnest bar
  const fontSize = 14;
  const padding = { top: 10, left: 10, bottom: 20, right: 10 };
  const guardBarHeight = height - padding.top - (padding.bottom / 2); // Guard bars are taller
  const normalBarHeight = height - padding.top - padding.bottom;

  // Generate SVG for the EAN-13 barcode
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Add white background
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`;
  
  // Start building the actual barcode
  let x = padding.left;
  
  // First digit of EAN-13 (encoded in the parity pattern of the left side)
  const firstDigit = parseInt(barcodeValue[0], 10);
  const parityPattern = firstDigitEncoding[firstDigit];
  
  // Add text for first digit
  svg += `<text x="${x}" y="${height - 5}" font-family="Arial" font-size="${fontSize}">${firstDigit}</text>`;
  x += moduleWidth * 10; // Space for first digit text
  
  // Left guard bars (101)
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  x += moduleWidth * 2; // Skip the white space
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  x += moduleWidth * 2; // Space after guard
  
  // Left side of the barcode (6 digits, each 7 modules wide)
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(barcodeValue[i], 10);
    const pattern = parityPattern[i-1] === 'L' ? leftOddPatterns[digit] : leftEvenPatterns[digit];
    
    // Add text for digit below the barcode
    const digitX = x + (moduleWidth * 3); // Center digit under its barcode pattern
    svg += `<text x="${digitX}" y="${height - 5}" text-anchor="middle" font-family="Arial" font-size="${fontSize}">${digit}</text>`;
    
    // Add barcode pattern for digit
    for (let j = 0; j < pattern.length; j++) {
      if (pattern[j] === '1') {
        svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${normalBarHeight}" fill="black" />`;
      }
      x += moduleWidth;
    }
  }
  
  // Middle guard bars (01010)
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  x += moduleWidth * 2;
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  x += moduleWidth * 2;
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  x += moduleWidth * 2;
  
  // Right side of the barcode (6 digits, each 7 modules wide)
  for (let i = 7; i < 13; i++) {
    const digit = parseInt(barcodeValue[i], 10);
    const pattern = rightPatterns[digit];
    
    // Add text for digit below the barcode
    const digitX = x + (moduleWidth * 3); // Center digit under its barcode pattern
    svg += `<text x="${digitX}" y="${height - 5}" text-anchor="middle" font-family="Arial" font-size="${fontSize}">${digit}</text>`;
    
    // Add barcode pattern for digit
    for (let j = 0; j < pattern.length; j++) {
      if (pattern[j] === '1') {
        svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${normalBarHeight}" fill="black" />`;
      }
      x += moduleWidth;
    }
  }
  
  // Right guard bars (101)
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  x += moduleWidth * 2; // Skip the white space
  svg += `<rect x="${x}" y="${padding.top}" width="${moduleWidth}" height="${guardBarHeight}" fill="black" />`;
  
  // Close the SVG
  svg += `</svg>`;
  
  return svg;
}
