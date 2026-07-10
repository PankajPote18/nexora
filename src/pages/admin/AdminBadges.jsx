import { useState, useEffect } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
  Palette
} from 'lucide-react';

const CustomToggle = ({ isOn, onToggle }) => (
  <button
    onClick={onToggle}
    className={`w-12 h-6 rounded-full relative transition-colors duration-300 flex items-center shadow-inner ${isOn ? 'bg-[#00c97b]' : 'bg-gray-700'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-300 flex items-center justify-center shadow-md ${isOn ? 'translate-x-7' : 'translate-x-1'}`}>
      {isOn && <Check size={10} className="text-[#00c97b]" strokeWidth={4} />}
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

const BadgePreview = ({ name, bg, text, border, size = "normal" }) => {
  const isLarge = size === "large";
  return (
    <div 
      className={`inline-flex items-center justify-center font-bold tracking-widest uppercase shadow-lg shadow-black/50 ${isLarge ? 'px-6 py-2 text-sm rounded-lg' : 'px-3 py-1 text-[10px] rounded'}`}
      style={{
        backgroundColor: bg || '#000',
        color: text || '#FFF',
        border: isLarge ? '2px solid transparent' : '1.5px solid transparent',
        backgroundClip: 'padding-box, border-box',
        backgroundOrigin: 'padding-box, border-box',
        backgroundImage: `linear-gradient(${bg || '#000'}, ${bg || '#000'}), ${border || 'linear-gradient(to bottom, #111, #FFF)'}`
      }}
    >
      {name || 'PREVIEW'}
    </div>
  );
};

const AdminBadges = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/master/badges`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (item) => {
    try {
      const updatedStatus = !item.status;
      const token = localStorage.getItem('token') || 'dev-token';
      await fetch(`${import.meta.env.VITE_API_URL}/api/master/badges/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: updatedStatus })
      });
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, status: updatedStatus } : i)
      );
    } catch (error) {
      console.error(error);
    }
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        bg_color: formData.bg_color,
        text_color: formData.text_color,
        border_gradient: formData.border_gradient,
        sort_order: parseInt(formData.sort_order, 10),
        status: formData.status,
      };

      const token = localStorage.getItem('token') || 'dev-token';
      const url = editingItem
        ? `${import.meta.env.VITE_API_URL}/api/master/badges/${editingItem.id}`
        : `${import.meta.env.VITE_API_URL}/api/master/badges`;
      const method = editingItem ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      await fetchItems();
      setModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token') || 'dev-token';
      await fetch(`${import.meta.env.VITE_API_URL}/api/master/badges/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchItems();
    } catch (error) {
      console.error(error);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="flex-1 text-white font-sans max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl font-semibold text-white tracking-wide uppercase">Badge Listing</h1>
        <button
          onClick={openCreate}
          className="bg-[#5a6ef7] hover:bg-[#4a5ce6] text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap font-medium"
        >
          <Plus size={18} /> <span>Add New Badge</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#141a29] rounded-xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Controls Bar */}
        <div className="p-4 md:p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <span>Results :</span>
            <div className="relative">
              <select className="bg-transparent border border-gray-700 rounded-md py-1.5 pl-3 pr-8 appearance-none focus:outline-none focus:border-indigo-500 text-gray-300 text-sm">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={14} className="text-gray-500" />
              </div>
            </div>
          </div>
          
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-[#5a6ef7] transition-colors placeholder-gray-500"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead className="bg-[#1e2638]/50 text-gray-400 font-medium tracking-wider">
              <tr>
                <th className="px-6 py-4">Badge Name</th>
                <th className="px-6 py-4 text-center">Preview</th>
                <th className="px-6 py-4">Background</th>
                <th className="px-6 py-4">Text Color</th>
                <th className="px-6 py-4">Border</th>
                <th className="px-6 py-4 text-center">Sorting</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-[#5a6ef7] border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading badges...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-base">
                    No badges found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1c2333]/50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-gray-200">{item.name}</td>
                    <td className="px-6 py-4 text-center">
                      <BadgePreview name={item.name} bg={item.bg_color} text={item.text_color} border={item.border_gradient} />
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full border border-gray-600" style={{ backgroundColor: item.bg_color }}></div>
                        <span className="font-mono text-xs">{item.bg_color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full border border-gray-600" style={{ backgroundColor: item.text_color }}></div>
                        <span className="font-mono text-xs">{item.text_color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-[11px] max-w-[150px] truncate" title={item.border_gradient}>
                      {item.border_gradient}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">{item.sort_order}</td>
                    <td className="px-6 py-4">
                      <CustomToggle isOn={item.status} onToggle={() => toggleStatus(item)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-indigo-400 transition-colors p-1.5 hover:bg-indigo-400/10 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="text-gray-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-400/10 rounded-lg">
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
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141a29] rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#1c2333]">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Palette size={20} className="text-[#5a6ef7]" />
                <span>{editingItem ? 'Edit Badge' : 'Create Badge'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-3 py-1.5 rounded-lg flex items-center text-sm font-medium border border-gray-700">
                <X size={16} className="mr-1.5" /> Cancel
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="badge-form" onSubmit={handleSave} className="space-y-6">
                
                {/* Live Preview Banner */}
                <div className="bg-[#1c2333] rounded-xl border border-gray-700/50 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-2 left-3 text-[10px] font-bold tracking-widest text-gray-500 uppercase">Live Preview</div>
                  <BadgePreview name={formData.name || 'NEW MOVIE'} bg={formData.bg_color} text={formData.text_color} border={formData.border_gradient} size="large" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Badge Text <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="e.g. HOT, NEW, EXCLUSIVE"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Background Color</label>
                    <div className="flex bg-[#1c2333] border border-gray-700 rounded-lg overflow-hidden focus-within:border-indigo-500 transition-colors">
                      <input
                        type="color"
                        value={formData.bg_color}
                        onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                        className="w-12 h-10 bg-transparent border-none cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formData.bg_color}
                        onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                        className="w-full bg-transparent text-gray-200 px-3 py-2 outline-none font-mono text-sm uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Text Color</label>
                    <div className="flex bg-[#1c2333] border border-gray-700 rounded-lg overflow-hidden focus-within:border-indigo-500 transition-colors">
                      <input
                        type="color"
                        value={formData.text_color}
                        onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                        className="w-12 h-10 bg-transparent border-none cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formData.text_color}
                        onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                        className="w-full bg-transparent text-gray-200 px-3 py-2 outline-none font-mono text-sm uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Border Gradient (CSS)</label>
                    <input
                      type="text"
                      value={formData.border_gradient}
                      onChange={(e) => setFormData({ ...formData, border_gradient: e.target.value })}
                      className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                      placeholder="linear-gradient(to bottom, #111, #FFF)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Sorting Position</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.status}
                      onChange={() => setFormData({ ...formData, status: !formData.status })}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00c97b]"></div>
                    <span className="ml-3 text-sm font-medium text-gray-300">Display publicly</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-end bg-[#1c2333]">
              <button
                type="submit"
                form="badge-form"
                disabled={saving || !formData.name}
                className="bg-[#00c97b] hover:bg-[#00b06b] text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Badge'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#1c2333] border border-gray-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-2">Delete Badge</h3>
            <p className="text-gray-400 text-sm mb-8">
              Are you sure you want to delete this badge? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 rounded-lg border border-gray-700 bg-transparent text-gray-300 hover:bg-[#252f44] transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-medium shadow-lg shadow-red-500/20"
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
