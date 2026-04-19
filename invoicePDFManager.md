Your PDF processing tool is a perfect candidate for a modern web-stack (like React or Svelte) using WebAssembly-based libraries.

The following prompt is structured as a **Product Requirements Document (PRD)**. It is designed to give a coding agent (like Claude, GPT-4, or a dedicated tool like Cursor) everything it needs to build this while strictly adhering to your privacy and "No-AI" constraints.

---

# Project Prompt: Client-Side HIPAA-Compliant PDF Splitter

## 1. Project Overview

Build a browser-based, client-side-only web application that allows users to upload a single PDF containing multiple scanned invoices. The app must extract the text, identify the vendor and date, and split the document into individual PDFs named `VendorName_Date.pdf`.

**Strict Constraints:**

- **Privacy:** Must be 100% client-side. No data can be sent to a server.
- **Compliance:** Designed with HIPAA principles in mind (No telemetry, no external logging, no cloud processing).
- **No AI:** Use traditional OCR (Tesseract.js) or Direct Text Extraction (PDF.js) with Regex and Fuzzy Matching—no LLM or AI APIs.

## 2. Technical Stack

- **Framework:** React
- **PDF Manipulation:** `pdf-lib` (for splitting and merging)
- **PDF Parsing:** `pdf.js` (for rendering and extracting existing OCR layers)
- **Fallback OCR:** `tesseract.js` (for scans where the text layer is missing)
- **Fuzzy Matching:** `fuse.js` (to match extracted text against a known list of vendors)

## 3. Functional Requirements

### Phase 1: Ingestion & Text Extraction

1.  **File Upload:** Accept a `.pdf` file via drag-and-drop or file picker.
2.  **Existing Text Layer Check:** Use `pdf.js` to attempt to extract text from the document.
    - _Logic:_ If `getTextContent()` returns valid strings, use that for speed.
3.  **OCR Fallback:** If no text layer is found, use `tesseract.js` to perform OCR on the page image. Use a Web Worker to ensure the UI does not freeze.

### Phase 2: Logic & Identification

1.  **Vendor Identification:** \* Maintain a local constant/list of specific "Known Vendors." The user will input this list when they first use the app.
    - Use `fuse.js` to find the best match for these vendors within the extracted text (to handle OCR typos).
2.  **Date Extraction:** \* Use Regular Expressions (Regex) to find common date formats (e.g., `MM/DD/YYYY`, `DD-Mon-YYYY`).
3.  **Split Logic:** \* Detect the start of a new invoice by identifying a change in the Vendor Name or Invoice Date across sequential pages.

### Phase 3: Preview & Export

1.  **Review Table:** Display a table showing: `Page Range | Detected Vendor | Detected Date | Filename Preview`.
2.  **Manual Overrides:** Allow the user to edit the Vendor or Date in the table if the extraction was incorrect.
3.  **Local Export:** Use `pdf-lib` to generate the new PDF blobs and trigger a browser download for each.

## 4. Security & Compliance Requirements

- **Disable External Calls:** Ensure Tesseract.js is configured to load worker scripts locally (not from a CDN).
- **No Analytics:** Ensure no Google Analytics, Sentry, or tracking scripts are included.
- **Memory Management:** Explicitly clear blob URLs and memory arrays once the download is complete to ensure no sensitive data persists in the browser memory longer than necessary.

## 5. UI/UX Preferences

- **Clean & Minimal:** Use a "Botanical" or "Professional Slate" aesthetic (avoid neon colors).
- **Progress Indicators:** Since OCR is heavy, provide a clear progress bar showing "Processing Page X of Y."
