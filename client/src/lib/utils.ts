import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale = 'en-US', currency = 'USD') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(value);
}

export function formatDate(date: Date | string | number, formatPattern = 'PP', localeCode = 'en') {
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, formatPattern, { 
    locale: localeCode === 'ar' ? ar : enUS 
  });
}

export function formatTimeAgo(date: Date | string | number, localeCode = 'en') {
  const dateObj = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(dateObj, { 
    addSuffix: true,
    locale: localeCode === 'ar' ? ar : enUS 
  });
}

export function generateInvoiceNumber() {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${randomNumber}`;
}

export function generateBarcodeNumber() {
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

// Implementation of the barcode SVG generator (EAN-13 standard)
export function generateBarcodeSVG(barcodeValue: string): string {
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
