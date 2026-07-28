import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { moviesApi } from '../../services/api';

const AdminHeroBannerForm = ({ banner, totalBanners, onClose }) => {
  // If it's a new banner, the sorting options should include the next available number.
  // If editing an existing banner, the sorting options should be up to the current total.
  const maxSorting = banner ? Math.max(totalBanners, 1) : totalBanners + 1;
  const sortingOptions = Array.from({ length: maxSorting }, (_, i) => i + 1);

  const [formData, setFormData] = useState({
    title: banner?.title || '',
    show_id: banner?.show_id || '',
    sorting_position: banner?.sorting_position || maxSorting,
    image: banner?.image || '',
  });

  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        // This picker needs every movie to choose from, not a paginated
        // page — request a high limit against the now-paginated endpoint.
        const response = await moviesApi.getAll({ limit: 500 });
        setMovies(response.data);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoadingMovies(false);
      }
    };
    fetchMovies();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let finalImageUrl = formData.image;
      
      // If a new file was chosen, upload it to /api/upload
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('banner', imageFile);
        
        // Temporarily bypassing admin token for dev environment 
        const token = localStorage.getItem('token') || 'dev-token'; 
        
        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadData
        });
        
        if (uploadRes.ok) {
          const uploaded = await uploadRes.json();
          if (uploaded.files && uploaded.files.banner) {
             // /api/upload already returns the full Bunny CDN URL.
             finalImageUrl = uploaded.files.banner;
          }
        }
      }

      const payload = {
        title: formData.title,
        show_id: formData.show_id,
        sorting_position: parseInt(formData.sorting_position, 10),
        image: finalImageUrl || 'https://placehold.co/1200x600'
      };

      const url = banner
        ? `${import.meta.env.VITE_API_URL}/api/hero-banners/${banner.id}`
        : `${import.meta.env.VITE_API_URL}/api/hero-banners`;
      
      const method = banner ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#141a29] border border-gray-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1c2333]/50">
        <h2 className="text-xl font-semibold text-gray-200">
          {banner ? 'Edit Hero Banner' : 'Add New Hero Banner'}
        </h2>
      </div>

      <div className="p-6 overflow-y-auto custom-scrollbar">
        <form id="hero-banner-form" onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Hero Banner Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Enter hero banner title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Show <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="show_id"
                value={formData.show_id}
                onChange={handleChange}
                required
                className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-400 focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
              >
                <option value="" disabled>Select Show</option>
                {loadingMovies ? (
                  <option disabled>Loading shows...</option>
                ) : (
                  movies.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))
                )}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00c97b] pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Sorting Position <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="sorting_position"
                value={formData.sorting_position}
                onChange={handleChange}
                required
                className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
              >
                {sortingOptions.map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00c97b] pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Upload Hero Banner Image <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full bg-[#1c2333] border border-gray-700 rounded-lg flex items-center overflow-hidden transition-colors focus-within:border-indigo-500">
              <label className="px-4 py-2.5 font-medium text-sm text-gray-300 border-r border-gray-700 hover:bg-[#252f44] transition-colors cursor-pointer shrink-0">
                Choose File
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
              <span className="px-4 py-2 text-sm text-[#00c97b] truncate font-medium">
                {imageFile ? imageFile.name : 'No file chosen'}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">Max size: 2MB</p>
          </div>

        </form>
      </div>

      <div className="p-6 border-t border-gray-800 bg-[#1c2333]/50 flex justify-end space-x-4 shrink-0">
        <button
          type="submit"
          form="hero-banner-form"
          disabled={saving}
          className="bg-[#00c97b] hover:bg-[#00a968] text-white px-8 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          <span>Save</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-transparent border border-gray-600 text-gray-300 hover:bg-[#1e2638] px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AdminHeroBannerForm;
