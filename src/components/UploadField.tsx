'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';

type UploadFieldProps = {
  label: string;
  folder: string;
  userId: string;
  value: string;
  accept?: string;
  buttonLabel?: string;
  onChange: (nextValue: string) => void;
};

export function UploadField({
  label,
  folder,
  userId,
  value,
  accept,
  buttonLabel = 'Upload file',
  onChange,
}: UploadFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const result = await uploadPublicFile({ file, folder, userId });
      onChange(result.publicUrl);
      setMessage('Upload complete.');
    } catch (error) {
      setMessage(getUploadErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="dashboard-field">
      <div className="dashboard-field-label">{label}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label htmlFor={inputId} className="os-button os-button-secondary os-button-compact" style={{ cursor: uploading ? 'progress' : 'pointer' }}>
          {uploading ? 'Uploading…' : buttonLabel}
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
        />
        <span style={{ color: value ? 'var(--os-color-ink-secondary)' : 'var(--os-color-ink-muted)', fontSize: 13 }}>
          {value ? 'Uploaded' : 'No file selected yet'}
        </span>
      </div>
      {message ? (
        <div className={message === 'Upload complete.' ? 'dashboard-status dashboard-status-success' : 'dashboard-status dashboard-status-error'}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
