import * as pdfjs from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import Fuse from 'fuse.js';

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

/**
 * Extracts text from a PDF page using PDF.js or Tesseract OCR fallback
 */
export async function extractTextFromPage(pdfPage, onProgress) {
  // Try direct text extraction first
  const textContent = await pdfPage.getTextContent();
  let text = textContent.items.map(item => item.str).join(' ');

  // Fallback to OCR if text layer is insufficient (common for scans)
  if (text.trim().length < 20) {
    text = await performOCR(pdfPage, onProgress);
  }

  return text;
}

/**
 * Performs OCR on a PDF page
 */
async function performOCR(pdfPage, onProgress) {
  const viewport = pdfPage.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await pdfPage.render({ canvasContext: context, viewport }).promise;
  const imageData = canvas.toDataURL('image/png');

  const worker = await createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core.wasm.js',
    langPath: '/tesseract/',
    cachePath: '.',
    gzip: true,
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress * 100);
      }
    }
  });

  try {
    const { data: { text } } = await worker.recognize(imageData);
    return text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts the best vendor match from text using Fuse.js
 */
export function identifyVendor(text, vendorList) {
  if (!text || !vendorList.length) return 'UnknownVendor';

  // 1. Try exact prefix match first (very common in invoice headers)
  const cleanText = text.trim();
  for (const vendor of vendorList) {
    if (cleanText.toLowerCase().startsWith(vendor.toLowerCase())) {
      console.log(`Priority Match: Found "${vendor}" at start of text.`);
      return vendor;
    }
  }

  // 2. Fallback to tuned fuzzy matching
  const fuse = new Fuse(vendorList.map(v => ({ name: v })), {
    keys: ['name'],
    threshold: 0.5, // slightly more lenient
    ignoreLocation: true, // find the vendor anywhere in the text
    minMatchCharLength: 2,
    includeScore: true
  });

  const result = fuse.search(text);
  
  return result.length > 0 ? result[0].item.name : 'UnknownVendor';
}

/**
 * Extracts the invoice date using Regex
 */
export function identifyDate(text) {
  // Broad date patterns
  // 1. MM/DD/YYYY or DD/MM/YYYY
  // 2. YYYY-MM-DD
  // 3. Month DD, YYYY
  // 4. DD Month YYYY
  
  const datePatterns = [
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g, // MM/DD/YYYY
    /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/g, // YYYY-MM-DD
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi, // Month DD, YYYY
    /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi // DD Month YYYY
  ];

  // Look for "Invoice Date" or "Date" nearby to prioritize
  const invoiceDateKeywords = /invoice date|date of issue|billing date|date/gi;
  const dueDateKeywords = /due date|payment due|pay by|deadline|expiry|expiration/gi;
  
  // Strategy: Find all dates, and prioritize those near "Invoice Date" while penalizing "Due Date"
  let allDates = [];
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      allDates.push({ date: match[0], index: match.index });
    }
  }

  if (allDates.length === 0) return 'NoDate';

  // Find occurrences of labels
  const invoiceLabels = [...text.matchAll(invoiceDateKeywords)];
  const dueLabels = [...text.matchAll(dueDateKeywords)];
  
  // Score dates based on proximity to labels
  const scoredDates = allDates.map(d => {
    let minDistance = 10000; // Default high distance
    
    // Find closest positive label
    invoiceLabels.forEach(l => {
      const distance = Math.abs(d.index - l.index);
      if (distance < minDistance) minDistance = distance;
    });

    // Apply heavy penalty for proximity to "Due Date" labels
    dueLabels.forEach(l => {
      const distance = Math.abs(d.index - l.index);
      if (distance < 100) { // If very close to a due date label
        minDistance += (500 - distance); // Add variable penalty (max 500)
      }
    });

    return { ...d, score: minDistance };
  });

  // Pick date with the best (lowest) score
  scoredDates.sort((a, b) => a.score - b.score);
  return formatFileNameDate(scoredDates[0].date);
}

function formatFileNameDate(dateStr) {
  // Clean special characters for filename
  return dateStr.replace(/[/-]/g, '-').replace(/[,]/g, '').replace(/\s+/g, '-');
}
