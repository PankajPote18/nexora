import * as tus from 'tus-js-client';

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

// Large-file (movie/trailer) resumable upload — goes directly from the
// browser to the VPS, never through this backend. Render only issues a
// short-lived, upload-scoped authorization token first.
//
// Returns the `tus.Upload` instance immediately (before the transfer
// finishes) so the caller can keep a ref for pause (`upload.abort()`) /
// resume (`startResumableUpload` again with the same file — tus-js-client
// finds and resumes the matching in-progress upload automatically).
export const startResumableUpload = async ({
  file,
  fieldType, // 'movie' | 'trailer'
  movieId,
  adminToken,
  onProgress,
  onSuccess,
  onError,
}) => {
  if (!adminToken) {
    const err = new Error('You must be logged in as an admin to upload movie/trailer files. Go to /admin/login.');
    onError?.(err);
    throw err;
  }

  const authRes = await fetch(`${API_BASE}/media/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      fieldType,
      filename: file.name,
      filesize: file.size,
      mimetype: file.type,
      movieId,
    }),
  });

  if (!authRes.ok) {
    const data = await authRes.json().catch(() => ({}));
    const err = new Error(data.message || `Upload authorization failed (${authRes.status})`);
    onError?.(err);
    throw err;
  }

  const { uploadId, tusEndpoint, authToken } = await authRes.json();

  const upload = new tus.Upload(file, {
    endpoint: tusEndpoint,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: { Authorization: `Bearer ${authToken}` },
    metadata: {
      uploadId,
      fieldType,
      filename: file.name,
      filetype: file.type,
      ...(movieId ? { movieId: String(movieId) } : {}),
    },
    onError: (error) => onError?.(error),
    onProgress: (bytesUploaded, bytesTotal) => onProgress?.(bytesUploaded, bytesTotal),
    onSuccess: (payload) => {
      let url;
      try {
        const header = payload?.lastResponse?.getHeader?.('Upload-Info');
        if (header) url = JSON.parse(header).url;
      } catch {
        // fall through with url undefined — onSuccess handler below still fires
      }
      onSuccess?.(url);
    },
  });

  const previousUploads = await upload.findPreviousUploads();
  if (previousUploads.length) {
    upload.resumeFromPreviousUpload(previousUploads[0]);
  }
  upload.start();

  return upload;
};

// Small-file (banner/poster/thumbnail/subtitle) upload — same mechanism the
// hero banner form already uses, unchanged.
export const uploadSmallFile = async (fieldType, file) => {
  const formData = new FormData();
  formData.append(fieldType, file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Upload failed (${res.status})`);
  }

  return data.files?.[fieldType];
};
