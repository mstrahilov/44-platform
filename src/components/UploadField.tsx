'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { getUploadErrorMessage, uploadPrivateItemFile, uploadPublicFile } from '@/lib/uploads';
import { Ui44FileInput } from '@/components/ui44/Inputs';

export const AUDIO_UPLOAD_ACCEPT = 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/flac,.mp3,.m4a,.aac,.wav,.flac';

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
  hideActionsWhenPreviewed?: boolean;
  storage?: 'public' | 'private-item';
  onUploadingChange?: (uploading: boolean) => void;
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
  hideActionsWhenPreviewed = false,
  storage = 'public',
  onUploadingChange,
}: UploadFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    onUploadingChange?.(true);
    setMessage('');

    try {
      const uploadedValue = storage === 'private-item'
        ? (await uploadPrivateItemFile({ file, folder, userId })).path
        : (await uploadPublicFile({ file, folder, userId })).publicUrl;
      // Commit the durable upload before optional metadata work. Release-track
      // uploads use lightweight media metadata instead of decoding the entire file
      // in memory, which keeps phone uploads from competing with audio analysis.
      onChange(uploadedValue);
      setMessage('Upload complete.');
      if (accept?.includes('audio') && onAudioAnalysis) {
        void analyzeAudioFile(file).then(analysis => {
          if (analysis.durationSeconds && onAudioMetadata) onAudioMetadata(Math.ceil(analysis.durationSeconds));
          onAudioAnalysis(analysis);
        }).catch(() => undefined);
      } else if (accept?.includes('audio') && onAudioMetadata) {
        void readAudioDuration(file).then(duration => {
          if (duration) onAudioMetadata(Math.ceil(duration));
        });
      }
    } catch (error) {
      setMessage(getUploadErrorMessage(error));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      event.target.value = '';
    }
  }

  return (
    <div className="dashboard-field">
      {!hideLabel && <div className="dashboard-field-label">{label}</div>}
      {value && previewKind !== 'none' && (previewKind === 'image' || accept?.includes('image')) ? (
        <div className="upload-preview upload-preview-image ui44-media-preview ui44-media-preview-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" />
          <button type="button" className="upload-preview-remove" aria-label={`Remove ${label}`} onClick={() => onChange('')}>
            ×
          </button>
        </div>
      ) : value && previewKind !== 'none' ? (
        <div className="upload-preview upload-preview-file ui44-media-preview ui44-media-preview-file">
          <span>{value.split('/').pop() || 'Uploaded file'}</span>
          <button type="button" className="upload-preview-remove" aria-label={`Remove ${label}`} onClick={() => onChange('')}>
            ×
          </button>
        </div>
      ) : null}
      {!(hideActionsWhenPreviewed && value) ? <div className="ui44-upload-actions">
        <label htmlFor={inputId} className={`os-button os-button-secondary os-button-compact${uploading ? ' ui44-upload-button-busy' : ''}`}>
          {uploading ? 'Uploading…' : buttonLabel}
        </label>
        <Ui44FileInput
          id={inputId}
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="ui44-file-input-hidden"
        />
        {value ? <span className="upload-state upload-state-complete">Uploaded</span> : null}
      </div> : null}
      {message && !(hideSuccessMessage && message === 'Upload complete.') ? (
        <div
          className={message === 'Upload complete.' ? 'dashboard-status dashboard-status-success ui44-status ui44-status-success' : 'dashboard-status dashboard-status-error ui44-status ui44-status-error'}
          role={message === 'Upload complete.' ? 'status' : 'alert'}
        >
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
