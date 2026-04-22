import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { extractTextFromPage, identifyVendor, identifyDate } from './extraction';

/**
 * Processes a multi-page PDF and identifies invoice boundaries
 */
export async function processPDF(file, vendorList, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const results = [];
  
  let currentInvoice = null;

  for (let i = 0; i < numPages; i++) {
    const progress = (i / numPages) * 100;
    onProgress(progress, `Processing Page ${i + 1} of ${numPages}...`);

    const page = await pdf.getPage(i + 1);
    
    // Generate thumbnail for the first page of an invoice
    // We'll generate it even if it's not the start, but we only store it for the invoice entry
    const thumbViewport = page.getViewport({ scale: 0.2 });
    const thumbCanvas = document.createElement('canvas');
    const thumbContext = thumbCanvas.getContext('2d');
    thumbCanvas.height = thumbViewport.height;
    thumbCanvas.width = thumbViewport.width;
    await page.render({ canvasContext: thumbContext, viewport: thumbViewport }).promise;
    const thumbnail = thumbCanvas.toDataURL('image/webp', 0.6);

    const text = await extractTextFromPage(page, (p) => {
       const deepProgress = progress + (p / numPages);
       onProgress(deepProgress, `OCR-ing Page ${i + 1}...`);
    });

    const vendor = identifyVendor(text, vendorList);
    const date = identifyDate(text);

    const startsWithInvoiceLabel = /^(?:Invoice|Order|Bill|Statement)\s*(?:#|No|Number)?\b/i.test(text.trim().substring(0, 100));

    // Only split on a *positive* vendor identification that differs from current.
    // If the page returned UnknownVendor it is almost certainly a continuation
    // (e.g. page 2 of a McKesson invoice with no company header).
    const isPositiveVendor = vendor !== 'UnknownVendor';
    const isNewVendor = currentInvoice && isPositiveVendor && currentInvoice.vendor !== vendor;

    // Similarly, only treat a date change as a split signal when we also have a
    // confirmed vendor, so that a dateless continuation page doesn't cause a false split.
    const isNewDate = currentInvoice && isPositiveVendor && date !== 'NoDate' && currentInvoice.date !== date;

    const shouldSplit = !currentInvoice || isNewVendor || isNewDate || (startsWithInvoiceLabel && isPositiveVendor && currentInvoice.pages.length > 0);

    if (shouldSplit) {
      if (currentInvoice) results.push(currentInvoice);
      currentInvoice = {
        vendor,
        date,
        thumbnail, // Store preview of the first page
        rotation: 0, // Manual rotation override state
        pages: [i]
      };
    } else {
      currentInvoice.pages.push(i);
    }
  }

  if (currentInvoice) results.push(currentInvoice);

  onProgress(100, 'Processing Complete');
  return results;
}

/**
 * Splits a specific set of pages from a PDF and triggers a download
 */
export async function splitAndDownloadPDF(sourceFile, pagesInfo, rotation, filename) {
  const sourceBytes = await sourceFile.arrayBuffer();
  const sourceDoc = await PDFDocument.load(sourceBytes);
  
  const newDoc = await PDFDocument.create();
  
  // Copy relevant pages
  const copiedPages = await newDoc.copyPages(sourceDoc, pagesInfo);
  
  copiedPages.forEach((page) => {
    if (rotation !== 0) {
      page.setRotation({ type: 'degrees', angle: rotation });
    }
    newDoc.addPage(page);
  });
  
  const pdfBytes = await newDoc.save();
  
  // Create File and trigger download
  const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  // Use File constructor to bake the name into the blob metadata
  const file = new File([pdfBytes.buffer.slice(0)], finalFilename, { type: 'application/pdf' });
  const url = URL.createObjectURL(file);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup with longer timeout to prevent premature revocation (causes UUID names)
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}
