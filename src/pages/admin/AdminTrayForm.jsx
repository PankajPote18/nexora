import { useState, useEffect } from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';

const AdminTrayForm = ({ tray, totalTrays, onClose }) => {
  const maxSorting = tray ? Math.max(totalTrays, 1) : totalTrays + 1;
  const sortingOptions = Array.from({ length: maxSorting }, (_, i) => i + 1);

  const [formData, setFormData] = useState({
    title: tray?.title || '',
    sorting_position: tray?.sorting_position || maxSorting,
    shape: tray?.shape || 'rectangle',
    aspect_ratio: tray?.aspect_ratio || '16:9',
    status: tray?.status ?? true,
    shows: tray?.shows || []
  });

  const [movies, setMovies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/movies`);
        if (res.ok) {
          setMovies(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMovies();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleShowSelection = (e) => {
    const options = e.target.options;
    const selectedShows = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedShows.push(options[i].value);
      }
    }
    setFormData({ ...formData, shows: selectedShows });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        sorting_position: parseInt(formData.sorting_position, 10),
        shape: formData.shape,
        aspect_ratio: formData.aspect_ratio,
        status: formData.status,
        shows: formData.shows
      };

      const url = tray
        ? `${import.meta.env.VITE_API_URL}/api/trays/${tray.id}`
        : `${import.meta.env.VITE_API_URL}/api/trays`;
      const method = tray ? 'PUT' : 'POST';

      const token = localStorage.getItem('token') || 'dev-token';
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error('Failed to save tray');
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save tray. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#141a29] rounded-xl border border-gray-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#1c2333]">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          {tray ? 'Edit Tray' : 'Create Tray'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-3 py-1.5 rounded-lg flex items-center text-sm font-medium border border-gray-700">
          <X size={16} className="mr-1.5" /> Cancel
        </button>
      </div>

      <div className="p-6 overflow-y-auto custom-scrollbar">
        <form id="tray-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tray Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Section Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Listing Position <span className="text-red-500">*</span>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Select Shows <span className="text-red-500">*</span>
              </label>
              <select
                multiple
                name="shows"
                value={formData.shows}
                onChange={handleShowSelection}
                required
                className="w-full h-32 bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar"
              >
                {movies.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Shape <span className="text-red-500">*</span> <span className="text-xs font-normal ml-1">Select the image shape to display in the tray</span>
                </label>
                <div className="relative">
                  <select
                    name="shape"
                    value={formData.shape}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                  >
                    <option value="">Select Shape</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="square">Square</option>
                    <option value="trending">Top 10</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00c97b] pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Aspect Ratio <span className="text-red-500">*</span> <span className="text-xs font-normal ml-1">Select the aspect quantity for the tray's shows</span>
                </label>
                <div className="relative">
                  <select
                    name="aspect_ratio"
                    value={formData.aspect_ratio}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1c2333] border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                  >
                    <option value="">Select Ratio</option>
                    <option value="16:9">16:9</option>
                    <option value="1:1">1:1</option>
                    <option value="4:3">4:3</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00c97b] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="status"
                className="sr-only peer" 
                checked={formData.status}
                onChange={handleChange}
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
          form="tray-form"
          disabled={isSubmitting}
          className="bg-[#00c97b] hover:bg-[#00b06b] text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Home Section'
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminTrayForm;
