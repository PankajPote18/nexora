import { useState, useEffect } from 'react';
import { Pencil, Trash2, Search, Plus, GripVertical } from 'lucide-react';
import AdminTrayForm from './AdminTrayForm';

const CustomToggle = ({ isOn, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out shadow-inner ${isOn ? 'bg-[#00c97b]' : 'bg-gray-600'
        }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${isOn ? 'translate-x-6' : 'translate-x-0'
          }`}
      >
        {isOn && (
          <svg className="w-2.5 h-2.5 text-[#00c97b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  );
};

const AdminTrays = () => {
  const [trays, setTrays] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTray, setEditingTray] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrays = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trays`);
      if (res.ok) {
        const data = await res.json();
        setTrays(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrays();
  }, []);

  const toggleStatus = async (tray) => {
    try {
      const updatedStatus = !tray.status;
      setTrays(trays.map(t => t.id === tray.id ? { ...t, status: updatedStatus } : t));
      
      const token = localStorage.getItem('token') || 'dev-token';
      await fetch(`${import.meta.env.VITE_API_URL}/api/trays/${tray.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: updatedStatus })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tray?')) {
      try {
        const token = localStorage.getItem('token') || 'dev-token';
        await fetch(`${import.meta.env.VITE_API_URL}/api/trays/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        fetchTrays();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEdit = (tray) => {
    setEditingTray(tray);
    setShowForm(true);
  };

  const filtered = trays.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 text-white font-sans max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl font-semibold text-white tracking-wide uppercase">HOME SECTION LISTING</h1>
        <button
          onClick={() => { setEditingTray(null); setShowForm(true); }}
          className="bg-[#5a6ef7] hover:bg-[#4a5ce6] text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
        >
          <Plus size={18} />
          <span>Add New Home Section</span>
        </button>
      </div>

      <div className="bg-[#141a29] rounded-xl border border-gray-800/50 shadow-2xl overflow-hidden flex flex-col">
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
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2 pl-4 pr-10 text-sm text-gray-200 focus:outline-none focus:border-[#5a6ef7] transition-colors placeholder-gray-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1e2638]/50 text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Drag (Sort)</th>
                <th className="px-6 py-4">Section Name</th>
                <th className="px-6 py-4 text-center">Position</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-[#5a6ef7] border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading trays...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-base">
                    No home sections found.
                  </td>
                </tr>
              ) : (
                filtered.map((tray) => (
                  <tr key={tray.id} className="hover:bg-[#1c2333]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <GripVertical className="text-gray-500 cursor-move" size={18} />
                    </td>
                    <td className="px-6 py-4 text-gray-200">{tray.title}</td>
                    <td className="px-6 py-4 text-center text-gray-400">{tray.sorting_position}</td>
                    <td className="px-6 py-4">
                      <CustomToggle isOn={tray.status} onToggle={() => toggleStatus(tray)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleEdit(tray)} className="text-gray-400 hover:text-[#5a6ef7] transition-colors p-1.5 hover:bg-[#5a6ef7]/10 rounded-md">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDelete(tray.id)} className="text-gray-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-400/10 rounded-md">
                          <Trash2 size={18} />
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <AdminTrayForm
            tray={editingTray}
            totalTrays={trays.length}
            onClose={() => { setShowForm(false); fetchTrays(); }}
          />
        </div>
      )}
    </div>
  );
};

export default AdminTrays;
