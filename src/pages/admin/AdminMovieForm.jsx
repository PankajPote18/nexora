import { useState, useEffect } from 'react';
import { Check, X, Plus, Trash2, ArrowLeft } from 'lucide-react';

const CustomToggle = ({ isOn, onToggle }) => (
  <button
    type="button"
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

const AdminMovieForm = ({ movie, onClose }) => {
  const [formData, setFormData] = useState(movie || {
    title: '', sort_order: 1, ageRating: '', genres: '', language: '', matureTheme: '', vendor: '',
    videoUrl: '', badge: '', status: true,
    posterFile: null, backdropFile: null,
    posterUrl: '', backdropUrl: ''
  });

  const [episodes, setEpisodes] = useState(
    movie?.episodes || ['']
  );

  // Master Data Lists
  const [genresList, setGenresList] = useState([]);
  const [languagesList, setLanguagesList] = useState([]);
  const [ageCertificatesList, setAgeCertificatesList] = useState([]);
  const [matureThemesList, setMatureThemesList] = useState([]);
  const [badgesList, setBadgesList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);

  useEffect(() => {
    // Fetch dynamic dropdown data
    const fetchMasterData = async () => {
      try {
        const [genRes, langRes, ageRes, themeRes, badgeRes, vendorRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/master/genres`),
          fetch(`${import.meta.env.VITE_API_URL}/api/master/languages`),
          fetch(`${import.meta.env.VITE_API_URL}/api/master/age-certificates`),
          fetch(`${import.meta.env.VITE_API_URL}/api/master/mature-themes`),
          fetch(`${import.meta.env.VITE_API_URL}/api/master/badges`),
          fetch(`${import.meta.env.VITE_API_URL}/api/master/vendors`)
        ]);

        if(genRes.ok) setGenresList(await genRes.json());
        if(langRes.ok) setLanguagesList(await langRes.json());
        if(ageRes.ok) setAgeCertificatesList(await ageRes.json());
        if(themeRes.ok) setMatureThemesList(await themeRes.json());
        if(badgeRes.ok) setBadgesList(await badgeRes.json());
        if(vendorRes.ok) setVendorsList(await vendorRes.json());
      } catch (error) {
        console.error("Error fetching master data for dropdowns:", error);
      }
    };

    fetchMasterData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = movie
      ? `${import.meta.env.VITE_API_URL}/api/movies/${movie.id}`
      : `${import.meta.env.VITE_API_URL}/api/movies`;
    const method = movie ? 'PUT' : 'POST';

    // Simple JSON payload for now
    const payload = {
      ...formData,
      genres: typeof formData.genres === 'string' ? formData.genres.split(',').map(s => s.trim()) : formData.genres,
      category_id: 'originals', // use a valid category string ID
    };

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => onClose());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        [type]: file,
      }));
    }
  };

  const handleEpisodeChange = (index, value) => {
    const newEpisodes = [...episodes];
    newEpisodes[index] = value;
    setEpisodes(newEpisodes);
  };

  const addEpisode = () => {
    setEpisodes([...episodes, '']);
  };

  const removeEpisode = (index) => {
    if (episodes.length > 1) {
      const newEpisodes = episodes.filter((_, i) => i !== index);
      setEpisodes(newEpisodes);
    }
  };

  const insertEpisodeAfter = (index) => {
    const newEpisodes = [...episodes];
    newEpisodes.splice(index + 1, 0, '');
    setEpisodes(newEpisodes);
  };

  return (
    <div className="w-full h-auto bg-[#121826] rounded-xl flex flex-col font-sans mb-8">
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-800/50">
        <h2 className="text-xl md:text-2xl font-normal text-white uppercase tracking-wide">
          {movie ? 'Edit Show' : 'Create Show'}
        </h2>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-md bg-transparent text-gray-300 hover:bg-[#1a2234] hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Shows
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Show Name <span className="text-red-500">*</span></label>
            <input required name="title" value={formData.title} onChange={handleChange} placeholder="Show Name" className="w-full bg-[#1a2234] border border-gray-700 text-white rounded px-4 py-3 outline-none focus:border-[#4aa5ff]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Sorting Priority <span className="text-red-500">*</span></label>
            <input required type="number" min="1" name="sort_order" value={formData.sort_order} onChange={handleChange} placeholder="Sorting priority ranking" className="w-full bg-[#1a2234] border border-gray-700 text-white rounded px-4 py-3 outline-none focus:border-[#4aa5ff]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Age Certificate <span className="text-red-500">*</span></label>
            <select required name="ageRating" value={formData.ageRating} onChange={handleChange} className="w-full bg-[#1a2234] border border-gray-700 text-[#00e5ff] rounded px-4 py-3 outline-none focus:border-[#4aa5ff] appearance-none">
              <option value="">Select Age Certificate</option>
              {ageCertificatesList.filter(i => i.status).map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Genre <span className="text-red-500">*</span></label>
            <select required name="genres" value={Array.isArray(formData.genres) ? formData.genres.join(', ') : formData.genres} onChange={handleChange} className="w-full bg-[#1a2234] border border-gray-700 text-[#00e5ff] rounded px-4 py-3 outline-none focus:border-[#4aa5ff] appearance-none">
              <option value="">Select Genre</option>
              {genresList.filter(i => i.status).map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Language <span className="text-red-500">*</span></label>
            <select required name="language" value={formData.language} onChange={handleChange} className="w-full bg-[#1a2234] border border-gray-700 text-[#00e5ff] rounded px-4 py-3 outline-none focus:border-[#4aa5ff] appearance-none">
              <option value="">Select Language</option>
              {languagesList.filter(i => i.status).map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Mature Theme <span className="text-red-500">*</span></label>
            <select required name="matureTheme" value={formData.matureTheme} onChange={handleChange} className="w-full bg-[#1a2234] border border-gray-700 text-[#00e5ff] rounded px-4 py-3 outline-none focus:border-[#4aa5ff] appearance-none">
              <option value="">Select Mature Theme</option>
              {matureThemesList.filter(i => i.status).map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Vendor <span className="text-red-500">*</span></label>
            <select required name="vendor" value={formData.vendor} onChange={handleChange} className="w-full bg-[#1a2234] border border-gray-700 text-[#00e5ff] rounded px-4 py-3 outline-none focus:border-[#4aa5ff] appearance-none">
              <option value="">Select Vendor</option>
              {vendorsList.filter(i => i.status).map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Trailer URL <span className="text-red-500">*</span></label>
            <input required name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="https://example.com/trailer" className="w-full bg-[#1a2234] border border-gray-700 text-white rounded px-4 py-3 outline-none focus:border-[#4aa5ff]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Upload Horizontal Poster Image <span className="text-red-500">*</span></label>
            <div className="flex items-center border border-gray-700 rounded bg-[#1a2234] overflow-hidden">
              <label className="cursor-pointer bg-[#2a3449] hover:bg-[#3a4560] text-white px-4 py-3 text-sm font-medium transition-colors shrink-0">
                Choose File
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'backdropFile')} />
              </label>
              <span className="px-4 text-sm text-[#00E5FF] truncate">
                {formData.backdropFile ? formData.backdropFile.name : 'No file chosen'}
              </span>
            </div>
            <p className="text-xs text-gray-500 pt-1">Upload a horizontal poster image Max: 2MB</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Upload Vertical Poster Image <span className="text-red-500">*</span></label>
            <div className="flex items-center border border-gray-700 rounded bg-[#1a2234] overflow-hidden">
              <label className="cursor-pointer bg-[#2a3449] hover:bg-[#3a4560] text-white px-4 py-3 text-sm font-medium transition-colors shrink-0">
                Choose File
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'posterFile')} />
              </label>
              <span className="px-4 text-sm text-[#00E5FF] truncate">
                {formData.posterFile ? formData.posterFile.name : 'No file chosen'}
              </span>
            </div>
            <p className="text-xs text-gray-500 pt-1">Upload a vertical poster image Max: 2MB</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Select Badge</label>
            <select name="badge" value={formData.badge} onChange={handleChange} className="w-full bg-[#1a2234] border border-gray-700 text-[#00e5ff] rounded px-4 py-3 outline-none focus:border-[#4aa5ff] appearance-none">
              <option value="">Select Badge</option>
              {badgesList.filter(i => i.status).map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-8">
            <CustomToggle isOn={formData.status} onToggle={() => setFormData(prev => ({ ...prev, status: !prev.status }))} />
            <span className="text-sm text-gray-300">Display publicly</span>
          </div>

        </div>

        <div className="border-t border-gray-800/50 my-6"></div>

        {/* Episodes Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm text-gray-400">Episode Url <span className="text-red-500">*</span></label>
            <button
              type="button"
              onClick={addEpisode}
              className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add Episode
            </button>
          </div>

          {episodes.map((ep, index) => (
            <div key={index} className="flex items-center gap-4 bg-[#1a2234] border border-gray-800/50 rounded-lg p-3">
              <div className="w-8 h-8 rounded bg-[#4aa5ff] flex items-center justify-center text-white font-medium shadow-md shadow-blue-500/20 shrink-0">
                {index + 1}
              </div>
              
              <input 
                required
                type="text" 
                value={ep} 
                onChange={(e) => handleEpisodeChange(index, e.target.value)}
                placeholder={`Episode ${index + 1} Url`} 
                className="flex-1 bg-[#121826] border border-gray-700 text-white rounded px-4 py-2 outline-none focus:border-[#4aa5ff]" 
              />
              
              <button 
                type="button" 
                onClick={() => insertEpisodeAfter(index)}
                className="w-10 h-10 border border-gray-700 rounded bg-[#121826] flex items-center justify-center text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors shrink-0"
              >
                <Plus size={16} />
              </button>
              
              <button 
                type="button"
                onClick={() => removeEpisode(index)}
                disabled={episodes.length === 1}
                className="w-10 h-10 border border-gray-700 rounded bg-[#121826] flex items-center justify-center text-pink-500 hover:bg-pink-500/10 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800/50 pt-6 mt-6 flex justify-end gap-4">
          <button
            type="submit"
            className="px-6 py-2.5 rounded bg-[#22c55e] text-white font-medium hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-500/20"
          >
            Save Show
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded border border-gray-600 bg-transparent text-gray-300 hover:bg-[#2a3449] hover:text-white transition-colors font-medium"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};

export default AdminMovieForm;
