import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface UploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelected, isLoading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragOver(true);
    } else if (e.type === 'dragleave') {
      setIsDragOver(false);
    }
  };

  const validateAndForward = (file: File) => {
    setErrorMsg(null);
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg(`Ukuran berkas (${(file.size / 1024 / 1024).toFixed(1)} MB) melebihi batas 15 MB.`);
      return;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowed = ['.mp3'];
    if (!allowed.includes(ext)) {
      setErrorMsg(`Format berkas "${ext}" tidak didukung. Harap gunakan berkas audio berformat MP3 (.mp3).`);
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndForward(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      validateAndForward(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--accent-quiet)' : 'var(--border-subtle)'}`,
          backgroundColor: isDragOver ? 'var(--accent-quiet-bg)' : 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 20px',
          textAlign: 'center',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={isLoading}
        />
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 14px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-surface-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDragOver ? 'var(--accent-quiet)' : 'var(--text-secondary)'
        }}>
          <UploadCloud size={24} />
        </div>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Tarik & lepas file audio ke sini, atau klik untuk memilih
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Khusus format MP3 (Maksimal 15 MB, durasi 0,5 - 120 detik)
        </p>
      </div>

      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-danger-bg)',
          color: 'var(--accent-danger)',
          fontSize: '13px'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
