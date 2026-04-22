import { Settings, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import VendorManager from './components/VendorManager';
import FileUploader from './components/FileUploader';
import ReviewTable from './components/ReviewTable';
import { processPDF } from './utils/pdfProcessor';

function App() {
  const [vendors, setVendors] = useState(() => {
    const saved = localStorage.getItem('known_vendors');
    return saved ? JSON.parse(saved) : ['Henry Schein', 'Linde', 'McKesson', 'Julie Sifford', 'Boston Scientific'];
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [sourceFile, setSourceFile] = useState(null);

  useEffect(() => {
    localStorage.setItem('known_vendors', JSON.stringify(vendors));
  }, [vendors]);

  const handleFileUpload = async (file) => {
    setSourceFile(file);
    setIsProcessing(true);
    setProgress(0);
    setStatus('Reading PDF...');
    
    try {
      const extractedResults = await processPDF(file, vendors, (p, s) => {
        setProgress(p);
        setStatus(s);
      });
      setResults(extractedResults);
    } catch (error) {
      console.error(error);
      alert('Error processing PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const handleUpdateResult = (index, field, value) => {
    const newResults = [...results];
    newResults[index][field] = value;
    setResults(newResults);
  };

  return (
    <div className="dashboard">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1>PDF Invoice Splitter</h1>
          <p style={{color: 'var(--text-muted)'}}>HIPAA-Compliant • Client-Side Only • No AI</p>
        </div>
        <div className="flex gap-2 items-center">
          <button className="outline"><Settings size={18} /> Settings</button>
        </div>
      </header>

      <main className="grid gap-8">
        <section className="card">
          <h2>1. Setup Vendors</h2>
          <p className="mb-4" style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>
            Add the names of vendors you expect to find. The app uses fuzzy matching to identify them.
          </p>
          <VendorManager vendors={vendors} setVendors={setVendors} />
        </section>

        <section className="card">
          <h2>2. Upload Multi-Invoice PDF</h2>
          <FileUploader onUpload={handleFileUpload} disabled={isProcessing} />
        </section>

        {isProcessing && (
          <section className="glass-card">
            <div className="flex items-center gap-4 mb-2">
              <Loader2 className="animate-spin" size={20} />
              <div className="flex-1">
                <strong>{status}</strong>
              </div>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${progress}%`}}></div>
            </div>
          </section>
        )}

        {results.length > 0 && !isProcessing && (
          <section className="card">
            <div className="flex justify-between items-center mb-4">
              <h2>3. Review & Export</h2>
              <div className="flex gap-2">
                 <button className="primary" onClick={() => window.location.reload()}>
                  Clear All
                </button>
              </div>
            </div>
            <ReviewTable 
              results={results} 
              onUpdate={handleUpdateResult} 
              sourceFile={sourceFile}
            />
          </section>
        )}
      </main>

      <footer className="mt-8 text-center" style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
        &copy; {new Date().getFullYear()} HIPAA-Compliant PDF Processor. All data stays in your browser.
      </footer>
    </div>
  );
}

export default App;
