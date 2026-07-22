// Every media type (banner/poster/thumbnail/subtitle/movie/trailer) uploads
// through this single call to POST /api/upload, which streams the file
// straight to Bunny Storage and returns its Bunny CDN URL. Uses XHR (not
// fetch) so upload progress can be reported for large movie/trailer files.
const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

export const uploadMediaFile = (fieldType, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append(fieldType, file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through with an empty body — the status check below still fires
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data.files?.[fieldType]);
      } else {
        reject(new Error(data.message || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed — network error'));

    xhr.send(formData);
  });
};

// Kept as a named alias so existing small-file call sites don't need to change.
export const uploadSmallFile = (fieldType, file) => uploadMediaFile(fieldType, file);
