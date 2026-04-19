import { useState } from 'react';
import { Plus, X } from 'lucide-react';

function VendorManager({ vendors, setVendors }) {
  const [newVendor, setNewVendor] = useState('');

  const addVendor = (e) => {
    e.preventDefault();
    if (newVendor.trim() && !vendors.includes(newVendor.trim())) {
      setVendors([...vendors, newVendor.trim()]);
      setNewVendor('');
    }
  };

  const removeVendor = (vendor) => {
    setVendors(vendors.filter(v => v !== vendor));
  };

  return (
    <div>
      <div className="flex gap-4 flex-wrap mb-4">
        {vendors.map(vendor => (
          <span key={vendor} className="vendor-tag">
            {vendor}
            <button onClick={() => removeVendor(vendor)}>
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={addVendor} className="flex gap-2">
        <input 
          type="text" 
          placeholder="New Vendor Name" 
          value={newVendor}
          onChange={(e) => setNewVendor(e.target.value)}
          style={{flex: 1}}
        />
        <button type="submit" className="accent">
          <Plus size={18} /> Add
        </button>
      </form>
    </div>
  );
}

export default VendorManager;
