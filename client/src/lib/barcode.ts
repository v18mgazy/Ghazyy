import Quagga from 'quagga';

export interface ScannerConfig {
  inputStream: {
    type: string;
    constraints: {
      width: { min: number };
      height: { min: number };
      facingMode: string;
      aspectRatio: { min: number; max: number };
    };
    area?: {
      top?: string;
      right?: string;
      left?: string;
      bottom?: string;
    };
  };
  locator: {
    patchSize: string;
    halfSample: boolean;
  };
  numOfWorkers: number;
  decoder: {
    readers: string[];
  };
  locate: boolean;
}

export const defaultScannerConfig: ScannerConfig = {
  inputStream: {
    type: 'LiveStream',
    constraints: {
      width: { min: 640 },
      height: { min: 480 },
      facingMode: 'environment',
      aspectRatio: { min: 1, max: 2 }
    },
    area: {
      // Only works with certain browsers and OS combinations
      top: '0%',
      right: '0%',
      left: '0%',
      bottom: '0%'
    }
  },
  locator: {
    patchSize: 'medium',
    halfSample: true
  },
  numOfWorkers: navigator.hardwareConcurrency || 2,
  decoder: {
    readers: [
      'ean_reader',
      'ean_8_reader',
      'code_128_reader',
      'code_39_reader',
      'code_93_reader',
      'upc_reader',
      'upc_e_reader'
    ]
  },
  locate: true
};

export const startBarcodeScanner = (
  containerId: string,
  onDetected: (result: any) => void,
  onProcessed?: (result: any) => void,
  config = defaultScannerConfig
) => {
  try {
    // شكل الكاميرا يحتاج إلى التأكد من وجود العنصر قبل التهيئة
    const targetElement = document.getElementById(containerId);
    
    if (!targetElement) {
      console.error('Target element not found:', containerId);
      return () => {}; // return empty cleanup function
    }
    
    // التحقق من دعم الكاميرا في المتصفح
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Browser does not support camera access');
      return () => {};
    }
    
    // طلب إذن الوصول إلى الكاميرا قبل تهيئة المكتبة
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        // نجحت الموافقة على الكاميرا، يمكن الآن تهيئة Quagga
        stream.getTracks().forEach(track => track.stop()); // أغلق الاتصال الأولي
        
        console.log('Camera permission granted, initializing scanner on', targetElement);
        
        Quagga.init({
          ...config,
          inputStream: {
            ...config.inputStream,
            target: targetElement
          }
        }, (err) => {
          if (err) {
            console.error('Error initializing Quagga:', err);
            return;
          }
          
          console.log('Quagga initialized successfully, starting scanner');
          Quagga.start();
          
          Quagga.onDetected((result) => {
            console.log('Barcode detected:', result);
            // صوت عند اكتشاف الباركود
            try {
              const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
              beep.play().catch(e => console.log('Error playing beep:', e));
            } catch (audioErr) {
              console.log('Audio play error:', audioErr);
            }
            
            onDetected(result);
          });
          
          if (onProcessed) {
            Quagga.onProcessed(onProcessed);
          }
        });
      })
      .catch(cameraErr => {
        console.error('Camera access denied or error:', cameraErr);
      });
  } catch (e) {
    console.error('Fatal error initializing barcode scanner:', e);
  }
  
  return () => {
    try {
      Quagga.stop();
      console.log('Scanner stopped');
    } catch (e) {
      console.error('Error stopping scanner:', e);
    }
  };
};

export const stopBarcodeScanner = () => {
  Quagga.stop();
};

export const isValidBarcode = (barcode: string): boolean => {
  // Simple validation: check if it's a string of numbers
  // This should be extended based on specific barcode format requirements
  return /^\d{8,13}$/.test(barcode);
};

// Generate barcode SVG for displaying or printing
export const generateBarcodeSVG = (barcode: string): string => {
  // Check if it's a Code 128 barcode
  if (barcode.startsWith('CODE128')) {
    return generateCode128SVG(barcode);
  } else {
    // Assume it's an EAN-13 or other numeric barcode
    return generateEAN13SVG(barcode);
  }
};

// Generate Code 128 barcode SVG
const generateCode128SVG = (barcode: string): string => {
  const width = 220;
  const height = 100;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  
  // Add header text
  svg += `<text x="${width/2}" y="15" text-anchor="middle" font-family="Arial" font-size="12">CODE 128</text>`;
  
  // Setup drawing parameters
  let x = 20;
  const moduleWidth = 2;
  const barHeight = 60;
  
  // Draw a more visible barcode for Code 128
  // This is a simplified version that creates a barcode-like visual representation
  const codeText = barcode.replace('CODE128', ''); // Extract the numeric part
  
  // Draw start pattern
  svg += `<rect x="${x}" y="20" width="${moduleWidth*2}" height="${barHeight}" fill="black"/>`;
  x += moduleWidth*3;
  svg += `<rect x="${x}" y="20" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
  x += moduleWidth*2;
  svg += `<rect x="${x}" y="20" width="${moduleWidth*2}" height="${barHeight}" fill="black"/>`;
  x += moduleWidth*3;
  
  // Draw data pattern - create a pattern based on the digits
  for (let i = 0; i < codeText.length; i++) {
    const charCode = codeText.charCodeAt(i);
    
    // Create a somewhat random but consistent pattern for each character
    for (let j = 0; j < 4; j++) {
      const isBar = ((charCode + j) % 3) !== 0;
      const barWidth = moduleWidth * (1 + (charCode % 3));
      
      if (isBar) {
        svg += `<rect x="${x}" y="20" width="${barWidth}" height="${barHeight}" fill="black"/>`;
      }
      x += barWidth + moduleWidth;
    }
  }
  
  // Draw stop pattern
  svg += `<rect x="${x}" y="20" width="${moduleWidth*2}" height="${barHeight}" fill="black"/>`;
  x += moduleWidth*3;
  svg += `<rect x="${x}" y="20" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
  x += moduleWidth*2;
  svg += `<rect x="${x}" y="20" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
  
  // Add text at the bottom
  svg += `<text x="${width/2}" y="95" text-anchor="middle" font-family="Arial" font-size="14">${barcode}</text>`;
  
  svg += `</svg>`;
  return svg;
};

// Generate EAN-13 barcode SVG
const generateEAN13SVG = (barcode: string): string => {
  const digitToPattern = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
  ];
  
  const leftOddPattern = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
  ];
  
  const leftEvenPattern = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111'
  ];
  
  const rightPattern = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100'
  ];
  
  // Simple implementation for EAN-13
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">`;
  
  // Add title
  svg += `<text x="100" y="15" text-anchor="middle" font-family="Arial" font-size="12">EAN-13</text>`;
  
  // Add text
  svg += `<text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="12">${barcode}</text>`;
  
  // Add barcode lines (simplified)
  let x = 10;
  const width = 2;
  const height = 60;
  
  // Start guard bars
  svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="black"/>`;
  x += width + 1;
  svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="white"/>`;
  x += width + 1;
  svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="black"/>`;
  x += width + 1;
  
  // Encode digits (simplified)
  for (let i = 0; i < barcode.length; i++) {
    // Skip non-numeric characters
    if (isNaN(parseInt(barcode[i], 10))) continue;
    
    const digit = parseInt(barcode[i], 10);
    const pattern = digitToPattern[digit];
    
    for (let j = 0; j < pattern.length; j++) {
      const fill = pattern[j] === '1' ? 'black' : 'white';
      svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="${fill}"/>`;
      x += width;
    }
    
    // Middle guard bars after the 6th digit
    if (i === 5) {
      svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="white"/>`;
      x += width;
      svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="black"/>`;
      x += width;
      svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="white"/>`;
      x += width;
      svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="black"/>`;
      x += width;
      svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="white"/>`;
      x += width;
    }
  }
  
  // End guard bars
  svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="black"/>`;
  x += width + 1;
  svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="white"/>`;
  x += width + 1;
  svg += `<rect x="${x}" y="20" width="${width}" height="${height}" fill="black"/>`;
  
  svg += `</svg>`;
  return svg;
};
