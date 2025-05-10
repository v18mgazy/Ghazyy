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

// Implementation of the barcode SVG generator
export function generateBarcodeSVG(barcodeValue: string): string {
  // Constants for the barcode
  const height = 80;
  const width = 200;
  const barWidth = 2;
  const fontSize = 14;
  const padding = 10;
  
  // Generate the barcode pattern (simplified)
  const generateBars = (code: string): string => {
    // This is a simple implementation. In a real app, you'd use a proper barcode algorithm
    let bars = '';
    let x = padding;
    
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i], 10);
      const barLength = 10 + (digit * 3); // Vary bar length based on digit
      
      // Draw bar
      bars += `<rect x="${x}" y="${padding}" width="${barWidth}" height="${barLength}" fill="black" />`;
      x += barWidth * 2;
    }
    
    return bars;
  };
  
  // Create the full SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${generateBars(barcodeValue)}
      <text x="${width / 2}" y="${height - padding}" text-anchor="middle" font-family="Arial" font-size="${fontSize}">${barcodeValue}</text>
    </svg>
  `;
  
  return svg;
}
