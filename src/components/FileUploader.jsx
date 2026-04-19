import { useState, useRef } from 'react';
import { FileUp, Info } from 'lucide-react';

function FileUploader({ onUpload, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (disabled) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    } else {
      alert('Please upload a PDF file.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div 
      className={`uploader ${isDragging ? 'dragging' : ''} ${disabled ? 'opacity-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        accept=".pdf" 
        onChange={handleFileChange}
      />
      <FileUp size={48} color="var(--accent)" className="mb-4" />
      <p style={{fontWeight: 500}}>Drag & Drop your invoice PDF or click to browse</p>
      <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}} className="mt-2">
        Supports multi-page PDFs with existing text layers or scans (OCR).
      </p>
      {disabled && (
        <div className="flex items-center gap-2 mt-4 text-accent">
          <Info size={16} />
          <span>Processing file... please wait.</span>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
