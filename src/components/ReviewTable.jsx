import { useState } from 'react';
import { Download, Calendar, User, CheckCircle2, RotateCw } from 'lucide-react';
import { splitAndDownloadPDF } from '../utils/pdfProcessor';

function ReviewTable({ results, onUpdate, sourceFile }) {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadedIndices, setDownloadedIndices] = useState(new Set());

  const handleDownload = async (result, index) => {
    setIsExporting(true);
    try {
      await splitAndDownloadPDF(sourceFile, result.pages, result.rotation, `${result.vendor}_${result.date}.pdf`);
      setDownloadedIndices(prev => new Set([...prev, index]));
    } catch (error) {
      console.error(error);
      alert('Error exporting PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsExporting(true);
    try {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        await splitAndDownloadPDF(sourceFile, result.pages, result.rotation, `${result.vendor}_${result.date}.pdf`);
        setDownloadedIndices(prev => new Set([...prev, i]));
      }
    } catch (error) {
      console.error(error);
      alert('Error exporting some PDFs. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="review-table-container">
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid var(--border)', width: '80px'}}>Preview</th>
              <th style={{textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid var(--border)'}}>Page Range</th>
              <th style={{textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid var(--border)'}}>Vendor Match</th>
              <th style={{textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid var(--border)'}}>Invoice Date</th>
              <th style={{textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid var(--border)'}}>Filename Preview</th>
              <th style={{textAlign: 'right', padding: '12px 8px', borderBottom: '1px solid var(--border)'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index}>
                <td style={{padding: '12px 8px', borderBottom: '1px dotted var(--border)'}}>
                  <div className="preview-container" style={{
                    width: '60px', 
                    height: '80px', 
                    borderRadius: '4px', 
                    overflow: 'hidden', 
                    border: '1px solid var(--border)',
                    background: '#fff',
                    position: 'relative'
                  }}>
                    <img 
                      src={result.thumbnail} 
                      alt="Thumbnail" 
                      style={{
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        transform: `rotate(${result.rotation}deg)`,
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </div>
                  <button 
                    onClick={() => onUpdate(index, 'rotation', (result.rotation + 90) % 360)}
                    style={{marginTop: '4px', padding: '2px 4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px'}}
                  >
                    <RotateCw size={10} /> Rotate
                  </button>
                </td>
                <td style={{fontWeight: 500, padding: '12px 8px', borderBottom: '1px dotted var(--border)'}}>
                   {result.pages.length === 1 
                     ? `Page ${result.pages[0] + 1}` 
                     : `Pages ${result.pages[0] + 1} - ${result.pages[result.pages.length - 1] + 1}`
                   }
                </td>
                <td style={{padding: '12px 8px', borderBottom: '1px dotted var(--border)'}}>
                  <div className="flex gap-2 items-center">
                    <User size={16} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      value={result.vendor} 
                      onChange={(e) => onUpdate(index, 'vendor', e.target.value)}
                    />
                  </div>
                </td>
                <td>
                  <div className="flex gap-2 items-center">
                    <Calendar size={16} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      value={result.date} 
                      onChange={(e) => onUpdate(index, 'date', e.target.value)}
                    />
                  </div>
                </td>
                <td style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                  {result.vendor}_{result.date}.pdf
                </td>
                <td>
                  <button 
                    className={downloadedIndices.has(index) ? 'outline' : 'accent'}
                    onClick={() => handleDownload(result, index)}
                    disabled={isExporting}
                  >
                    {downloadedIndices.has(index) ? <CheckCircle2 size={16} /> : <Download size={16} />}
                    {downloadedIndices.has(index) ? 'Redownload' : 'Download'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 flex justify-center">
         <button className="primary p-8" onClick={handleDownloadAll} disabled={isExporting}>
           <Download size={20} /> Download All Invoices
         </button>
      </div>
    </div>
  );
}

export default ReviewTable;
