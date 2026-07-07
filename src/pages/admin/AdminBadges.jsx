import { useState, useEffect } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Check,
  X
} from 'lucide-react';

// Temporary Mock Data based on the screenshot
const initialBadges = [
  { id: 1, name: 'Hot', bg_color: '#670005', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 1, status: true },
  { id: 2, name: 'New', bg_color: '#014207', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 2, status: true },
  { id: 3, name: 'Original', bg_color: '#292929', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 3, status: true },
];

const CustomToggle = ({ isOn, onToggle }) => (
  <button
    onClick={onToggle}
    className={`w-12 h-6 rounded-full relative transition-colors duration-300 flex items-center ${isOn ? 'bg-[#22c55e]' : 'bg-[#475569]'}`}
  >
    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-300 flex items-center justify-center ${isOn ? 'translate-x-6' : 'translate-x-0.5'}`}>
      {isOn
        ? <Check size={12} className="text-[#22c55e]" strokeWidth={3} />
        : <X size={12} className="text-gray-400" strokeWidth={3} />}
    </div>
  </button>
);

const emptyForm = () => ({
  name: '',
  bg_color: '#000000',
  text_color: '#FFFFFF',
  border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)',
  sort_order: 1,
  status: true,
});

const AdminBadges = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    // Mock API call
    setTimeout(() => {
      setItems(initialBadges);
      setLoading(false);
    }, 500);
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (item) => {
    setItems((prev) =>
      prev.map((i) => i.id === item.id ? { ...i, status: !i.status } : i)
    );
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      bg_color: item.bg_color,
      text_color: item.text_color,
      border_gradient: item.border_gradient,
      sort_order: item.sort_order,
      status: item.status,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    setSaving(true);
    // Mock saving
    setTimeout(() => {
      if (editingItem) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? {
          ...i,
          name: formData.name,
          bg_color: formData.bg_color,
          text_color: formData.text_color,
          border_gradient: formData.border_gradient,
          sort_order: formData.sort_order,
          status: formData.status,
        } : i));
      } else {
        setItems(prev => [...prev, {
          id: Date.now(),
          name: formData.name,
          bg_color: formData.bg_color,
          text_color: formData.text_color,
          border_gradient: formData.border_gradient,
          sort_order: formData.sort_order,
          status: formData.status,
        }]);
      }
      setSaving(false);
      setModalOpen(false);
    }, 500);
  };

  const handleDelete = () => {
    setItems(prev => prev.filter(i => i.id !== deleteId));
    setDeleteId(null);
  };

  const BadgePreview = ({ name, bg, text, border }) => {
    return (
      <div 
        className="inline-flex items-center justify-center px-3 py-1 font-semibold text-xs rounded shadow-lg"
        style={{
          backgroundColor: bg || '#000',
          color: text || '#FFF',
          border: '1.5px solid transparent',
          backgroundClip: 'padding-box, border-box',
          backgroundOrigin: 'padding-box, border-box',
          backgroundImage: `linear-gradient(${bg || '#000'}, ${bg || '#000'}), ${border || 'linear-gradient(to bottom, #111, #FFF)'}`
        }}
      >
        {name || 'Preview'}
      </div>
    );
  };

  return (
    <div className="w-full h-auto md:h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-normal text-white uppercase tracking-wide">
          Badge Listing
        </h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded bg-[#4aa5ff] text-white font-medium hover:bg-[#3b82f6] transition-colors"
        >
          <Plus size={18} /> Add New
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#121826] rounded-xl border border-gray-800 flex-1 flex flex-col overflow-hidden">
        
        {/* Controls Bar */}
        <div className="p-5 border-b border-gray-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Results :</span>
            <select className="bg-[#1a2234] border border-gray-700 text-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#4aa5ff] text-sm">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#1a2234] border border-gray-700 text-white rounded pl-4 pr-10 py-1.5 outline-none focus:border-[#4aa5ff] text-sm w-64 placeholder-gray-500"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap min-w-[900px]">
            <thead className="bg-[#1a2235] text-gray-400 font-semibold text-xs tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4">Badge Name</th>
                <th className="px-6 py-4">Background Color</th>
                <th className="px-6 py-4">Text Color</th>
                <th className="px-6 py-4">Border Gradient</th>
                <th className="px-6 py-4">Preview</th>
                <th className="px-6 py-4 flex items-center gap-2">
                  Sorting
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] leading-[4px]">▲</span>
                    <span className="text-[8px] leading-[4px]">▼</span>
                  </div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-[#4aa5ff]" size={24} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    No badges found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1a2234] transition-colors">
                    <td className="px-6 py-4 text-gray-300">{item.name}</td>
                    <td className="px-6 py-4 text-gray-400">{item.bg_color}</td>
                    <td className="px-6 py-4 text-gray-400">{item.text_color}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs max-w-[200px] truncate" title={item.border_gradient}>{item.border_gradient}</td>
                    <td className="px-6 py-4">
                      <BadgePreview name={item.name} bg={item.bg_color} text={item.text_color} border={item.border_gradient} />
                    </td>
                    <td className="px-6 py-4 text-gray-400">{item.sort_order}</td>
                    <td className="px-6 py-4">
                      <CustomToggle isOn={item.status} onToggle={() => toggleStatus(item)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4 items-center">
                        <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-white transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="text-pink-500 hover:text-pink-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-800/50 mt-auto flex items-center justify-between text-sm text-gray-400 bg-[#121826]">
          <div className="border border-gray-700 text-gray-400 px-4 py-1.5 rounded-md font-medium text-xs bg-[#1a2234]">
            Showing page 1 of 1
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-gray-500 hover:text-white transition-colors">←</button>
            <button className="w-8 h-8 rounded-md bg-[#4aa5ff] text-white font-medium flex items-center justify-center shadow-md shadow-blue-500/20">1</button>
            <button className="p-1 text-gray-500 hover:text-white transition-colors">→</button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a2234] rounded-xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-700/50">
            
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-medium text-white tracking-wide">
                {editingItem ? 'Edit Badge' : 'Add New Badge'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white bg-[#2a3449] rounded-full p-1.5">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              
              <div className="flex justify-center mb-4">
                <div className="bg-[#121826] p-4 rounded-xl border border-gray-800 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Live Preview</span>
                  <BadgePreview name={formData.name} bg={formData.bg_color} text={formData.text_color} border={formData.border_gradient} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Badge Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#121826] border border-gray-700 text-white rounded px-4 py-2.5 outline-none focus:border-[#4aa5ff]"
                  placeholder="e.g. Hot"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Background Color</label>
                  <div className="flex bg-[#121826] border border-gray-700 rounded overflow-hidden">
                    <input
                      type="color"
                      value={formData.bg_color}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      className="w-12 h-full bg-transparent border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.bg_color}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      className="w-full bg-transparent text-white px-3 py-2.5 outline-none font-mono text-sm uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Text Color</label>
                  <div className="flex bg-[#121826] border border-gray-700 rounded overflow-hidden">
                    <input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-12 h-full bg-transparent border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-full bg-transparent text-white px-3 py-2.5 outline-none font-mono text-sm uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Border Gradient</label>
                <input
                  type="text"
                  value={formData.border_gradient}
                  onChange={(e) => setFormData({ ...formData, border_gradient: e.target.value })}
                  className="w-full bg-[#121826] border border-gray-700 text-white rounded px-4 py-2.5 outline-none focus:border-[#4aa5ff] font-mono text-sm"
                  placeholder="e.g. linear-gradient(to bottom, #111111, #FFFFFF)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Sorting Position <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#121826] border border-gray-700 text-white rounded px-4 py-2.5 outline-none focus:border-[#4aa5ff]"
                  placeholder="Enter sorting position"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <label className="text-sm text-gray-300">Status</label>
                <CustomToggle isOn={formData.status} onToggle={() => setFormData({ ...formData, status: !formData.status })} />
              </div>

            </div>

            <div className="p-6 border-t border-gray-700/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="px-6 py-2.5 rounded bg-[#22c55e] text-white font-medium hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-500/20 text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 rounded border border-gray-600 bg-transparent text-gray-300 hover:bg-[#2a3449] transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#1a2234] border border-gray-700 rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-medium text-white mb-2">Delete Badge</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete this badge? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 px-4 rounded bg-[#2a3449] text-white hover:bg-[#3a4560] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 px-4 rounded bg-pink-500 hover:bg-pink-600 text-white transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBadges;
