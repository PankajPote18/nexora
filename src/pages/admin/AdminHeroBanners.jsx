import { useState, useEffect } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import AdminHeroBannerForm from './AdminHeroBannerForm';

const CustomToggle = ({ isOn, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out border border-gray-600 focus:outline-none ${isOn ? 'bg-[#00c97b]' : 'bg-[#1e2638]'}`}
  >
    <div
      className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out flex items-center justify-center shadow-md ${isOn ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-400'}`}
    >
      {isOn ? <Check size={10} className="text-[#00c97b]" /> : <X size={10} className="text-gray-600" />}
    </div>
  </button>
);

const AdminHeroBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/hero-banners`);
      const data = await res.json();
      setBanners(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (banner) => {
    try {
      const updatedStatus = !banner.status;
      await fetch(`${import.meta.env.VITE_API_URL}/api/hero-banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updatedStatus })
      });
      setBanners((prev) =>
        prev.map((b) => b.id === banner.id ? { ...b, status: updatedStatus } : b)
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this hero banner?')) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/hero-banners/${id}`, {
          method: 'DELETE'
        });
        fetchBanners();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="text-gray-300">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-wide">HERO BANNER LISTING</h1>
        <button
          onClick={() => { setEditingBanner(null); setShowForm(true); }}
          className="bg-[#5a6ef7] hover:bg-[#4a5deb] text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} />
          <span>Add New Hero Banner</span>
        </button>
      </div>

      <div className="bg-[#141a29] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <span>Results :</span>
            <div className="relative">
              <select className="bg-transparent border border-gray-700 rounded-md py-1.5 pl-3 pr-8 appearance-none focus:outline-none focus:border-indigo-500 text-gray-300 text-sm">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 placeholder-gray-600 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1e2638]/50 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Show</th>
                  <th className="px-6 py-4 font-medium text-center">Sorting <span className="text-xs">↕</span></th>
                  <th className="px-6 py-4 font-medium">Image</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((banner) => (
                  <tr key={banner.id} className="hover:bg-[#1c2333]/50 transition-colors group">
                    <td className="px-6 py-4 text-gray-200">{banner.title}</td>
                    <td className="px-6 py-4 text-gray-400">{banner.show?.title || 'Unknown Show'}</td>
                    <td className="px-6 py-4 text-center text-gray-400">{banner.sorting_position}</td>
                    <td className="px-6 py-4">
                      <img src={banner.image || 'https://placehold.co/60x80'} alt="thumbnail" className="w-12 h-16 object-cover rounded-md border border-gray-700 shadow-md" />
                    </td>
                    <td className="px-6 py-4">
                      <CustomToggle isOn={banner.status} onToggle={() => toggleStatus(banner)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => { setEditingBanner(banner); setShowForm(true); }}
                          className="text-gray-500 hover:text-indigo-400 transition-colors p-1.5 hover:bg-indigo-400/10 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-400/10 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No hero banners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <AdminHeroBannerForm
            banner={editingBanner}
            totalBanners={banners.length}
            onClose={() => { setShowForm(false); fetchBanners(); }}
          />
        </div>
      )}
    </div>
  );
};

export default AdminHeroBanners;
