'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { getUploadErrorMessage, uploadPrivateItemFile, uploadPublicFile } from '@/lib/uploads';

type UploadFieldProps = {
  label: string;
  folder: string;
  userId: string;
  value: string;
  accept?: string;
  buttonLabel?: string;
  previewKind?: 'image' | 'file' | 'none';
  onChange: (nextValue: string) => void;
  onAudioMetadata?: (durationSeconds: number) => void;
  onAudioAnalysis?: (analysis: { durationSeconds: number | null; waveformPeaks: number[]; mimeType: string; fileSizeBytes: number }) => void;
  hideLabel?: boolean;
  hideSuccessMessage?: boolean;
  storage?: 'public' | 'private-item';
};

export function UploadField({
  label,
  folder,
  userId,
  value,
  accept,
  buttonLabel = 'Upload file',
  previewKind,
  onChange,
  onAudioMetadata,
  onAudioAnalysis,
  hideLabel = false,
  hideSuccessMessage = false,
  storage = 'public',
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
      const analysisPromise = accept?.includes('audio') ? analyzeAudioFile(file) : Promise.resolve(null);
      const uploadedValue = storage === 'private-item'
        ? (await uploadPrivateItemFile({ file, folder, userId })).path
        : (await uploadPublicFile({ file, folder, userId })).publicUrl;
      // Commit the durable upload as soon as storage accepts it. Audio analysis can
      // take several seconds on mobile and must never leave the form looking empty.
      onChange(uploadedValue);
      const analysis = await analysisPromise;
      if (analysis?.durationSeconds && onAudioMetadata) onAudioMetadata(Math.ceil(analysis.durationSeconds));
      if (analysis && onAudioAnalysis) onAudioAnalysis(analysis);
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
      {!hideLabel && <div className="dashboard-field-label">{label}</div>}
      {value && previewKind !== 'none' && (previewKind === 'image' || accept?.includes('image')) ? (
        <div className="upload-preview upload-preview-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" />
          <button type="button" className="upload-preview-remove" aria-label={`Remove ${label}`} onClick={() => onChange('')}>
            ×
          </button>
        </div>
      ) : value && previewKind !== 'none' ? (
        <div className="upload-preview upload-preview-file">
          <span>{value.split('/').pop() || 'Uploaded file'}</span>
          <button type="button" className="upload-preview-remove" aria-label={`Remove ${label}`} onClick={() => onChange('')}>
            ×
          </button>
        </div>
      ) : null}
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
        <span className={value ? 'upload-state upload-state-complete' : 'upload-state'}>
          {value ? 'Uploaded' : 'No file selected yet'}
        </span>
      </div>
      {message && !(hideSuccessMessage && message === 'Upload complete.') ? (
        <div className={message === 'Upload complete.' ? 'dashboard-status dashboard-status-success' : 'dashboard-status dashboard-status-error'}>
          {message}
        </div>
      ) : null}
    </div>
  );
}

function readAudioDuration(file: File) {
  return new Promise<number | null>(resolve => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        // Loading an empty source can throw in older WebKit builds.
      }
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), 15_000);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.ceil(audio.duration) : null;
      finish(duration);
    }, { once: true });
    audio.addEventListener('error', () => finish(null), { once: true });
    audio.src = objectUrl;
    audio.load();
  });
}

async function analyzeAudioFile(file: File) {
  const durationFallback = readAudioDuration(file);
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const bucketCount = 72;
    const bucketSize = Math.max(1, Math.floor(channel.length / bucketCount));
    const waveformPeaks = Array.from({ length: bucketCount }, (_, bucketIndex) => {
      let peak = 0;
      const start = bucketIndex * bucketSize;
      const end = Math.min(channel.length, start + bucketSize);
      for (let index = start; index < end; index += 1) peak = Math.max(peak, Math.abs(channel[index] ?? 0));
      return Number(peak.toFixed(3));
    });
    await context.close();
    return { durationSeconds: buffer.duration, waveformPeaks, mimeType: file.type || 'audio/mpeg', fileSizeBytes: file.size };
  } catch {
    return { durationSeconds: await durationFallback, waveformPeaks: [], mimeType: file.type || 'audio/mpeg', fileSizeBytes: file.size };
  }
}
