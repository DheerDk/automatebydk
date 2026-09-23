import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Image as ImageIcon, Trash2, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  maxSizeMB?: number;
  className?: string;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Pre-validates binary header magic bytes on client side before network transmission
 */
async function checkClientMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!reader.result || !(reader.result instanceof ArrayBuffer)) {
        return resolve(false);
      }
      const arr = new Uint8Array(reader.result).subarray(0, 12);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }

      // JPEG: ffd8ff
      if (header.startsWith('ffd8ff')) return resolve(true);
      // PNG: 89504e47
      if (header.startsWith('89504e47')) return resolve(true);
      // WEBP: 52494646 (RIFF) + 'WEBP' at offset 8
      if (header.startsWith('52494646')) {
        const ascii = String.fromCharCode(...arr.subarray(8, 12));
        if (ascii === 'WEBP') return resolve(true);
      }

      // Non-matching magic bytes
      resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Image / Flyer',
  description,
  placeholder = 'Paste image URL or browse from your device...',
  maxSizeMB = 5,
  className = '',
}) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifiedFile, setVerifiedFile] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setError(null);

    // 1. Check size limit
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size (${formatFileSize(file.size)}) exceeds maximum allowed limit of ${maxSizeMB}MB.`);
      return;
    }

    // 2. Check extension & MIME type
    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = ALLOWED_MIMES.includes(file.type.toLowerCase());

    if (!hasValidExt || !hasValidMime) {
      setError(`Only JPG, JPEG, PNG, and WEBP images are permitted. "${file.name}" was rejected.`);
      return;
    }

    // 3. Client-side Magic Byte Inspection (Defeats extension renaming attacks)
    const isMagicValid = await checkClientMagicBytes(file);
    if (!isMagicValid) {
      setError(`Security Alert: The file content does not match a genuine image format. Upload blocked.`);
      return;
    }

    // 4. Perform upload
    try {
      setUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', file);

      const res: any = await api.post('/upload/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      });

      const uploadedUrl = res?.data?.url || res?.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
        setVerifiedFile({
          name: file.name,
          size: formatFileSize(file.size),
        });
      } else {
        throw new Error(res?.message || 'Upload succeeded but no media URL was returned.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleClear = () => {
    onChange('');
    setVerifiedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
          <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>5MB Max • JPG, PNG, WEBP</span>
          </div>
        </div>
      )}

      {description && <p className="text-xs text-slate-400">{description}</p>}

      {/* Upload Tabs / Source Switcher */}
      <div className="flex items-center space-x-2 pb-1">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
            tab === 'upload'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Browse & Upload</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
            tab === 'url'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Image URL</span>
        </button>
      </div>

      {/* Upload Zone Tab */}
      {tab === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />

          {!value ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700/80 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center space-y-2 py-2">
                  <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                  <p className="text-xs font-medium text-slate-200">
                    {uploadProgress !== null ? `Uploading & Scanning... ${uploadProgress}%` : 'Verifying file security...'}
                  </p>
                  <p className="text-[10px] text-slate-400">Inspecting magic bytes & payload safety</p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition-colors">
                    <UploadCloud className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Click to Browse File Manager <span className="text-slate-400 font-normal">or Drag & Drop</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, JPEG, PNG, WEBP (Max 5MB) • Protected against DDoS & Malware
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Uploaded Preview State */
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 flex items-center space-x-3 shadow-inner">
              <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-700/60 relative group">
                <img
                  src={value}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                  <ImageIcon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {verifiedFile?.name || 'Image Ready'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {verifiedFile?.size ? `${verifiedFile.size} • ` : ''}
                  <span className="text-emerald-400/90 font-mono">Secured</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-full">
                  {value}
                </p>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Replace with new file"
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  title="Remove image"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct URL Tab */}
      {tab === 'url' && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={value}
                onChange={(e) => {
                  setError(null);
                  onChange(e.target.value);
                }}
                placeholder={placeholder}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
                title="Clear URL"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {value && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-md bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
                <img
                  src={value}
                  alt="URL Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 truncate">{value}</p>
                <p className="text-[10px] text-emerald-400">Live URL Linked</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error / Alert Message */}
      {error && (
        <div className="flex items-start space-x-2 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-rose-200">Upload Issue</p>
            <p className="text-[11px] text-rose-300/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default ImageUploader;
