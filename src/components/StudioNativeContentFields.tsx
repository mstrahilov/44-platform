'use client';

import { UploadField } from '@/components/UploadField';
import { SectionHeader } from '@/components/Ui';

export type DraftSamplePreview = {
  title: string;
  previewUrl: string;
  durationSeconds: number | null;
  waveformPeaks: number[];
  mimeType: string | null;
  fileSizeBytes: number | null;
};

export function createDraftSamplePreview(): DraftSamplePreview {
  return { title: '', previewUrl: '', durationSeconds: null, waveformPeaks: [], mimeType: null, fileSizeBytes: null };
}

export function ensureSamplePreviewCount(current: DraftSamplePreview[], count: number) {
  const nextCount = Math.max(0, Math.min(30, count));
  if (current.length >= nextCount) return current.slice(0, nextCount);
  return [...current, ...Array.from({ length: nextCount - current.length }, createDraftSamplePreview)];
}

export function StudioBookFields({ userId, previewUrl, onPreviewUrlChange, totalPages, onTotalPagesChange, samplePages, onSamplePagesChange, languageCode, onLanguageCodeChange }: {
  userId: string;
  previewUrl: string;
  onPreviewUrlChange: (value: string) => void;
  totalPages: string;
  onTotalPagesChange: (value: string) => void;
  samplePages: string;
  onSamplePagesChange: (value: string) => void;
  languageCode: string;
  onLanguageCodeChange: (value: string) => void;
}) {
  return (
    <section className="dashboard-form-section">
      <SectionHeader title="Native Reader" description="44OS currently supports PDF books. Upload a separate, page-limited PDF when you want Store visitors to read a sample." />
      <div className="dashboard-form-step">
        <UploadField label="Sample PDF (Optional)" folder="products/book-previews" userId={userId} value={previewUrl} accept="application/pdf,.pdf" buttonLabel="Upload sample PDF" onChange={onPreviewUrlChange} />
        <div className="dashboard-form-grid dashboard-form-grid-3">
          <label className="dashboard-field">
            <span className="dashboard-field-label">Total Pages</span>
            <input className="os-input-field" inputMode="numeric" value={totalPages} onChange={event => onTotalPagesChange(event.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="dashboard-field">
            <span className="dashboard-field-label">Sample Pages</span>
            <input className="os-input-field" inputMode="numeric" value={samplePages} onChange={event => onSamplePagesChange(event.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="dashboard-field">
            <span className="dashboard-field-label">Language</span>
            <input className="os-input-field" value={languageCode} onChange={event => onLanguageCodeChange(event.target.value.slice(0, 12))} aria-label="Book language code" />
          </label>
        </div>
      </div>
    </section>
  );
}

export function StudioSamplePreviewFields({ userId, samples, onChange }: { userId: string; samples: DraftSamplePreview[]; onChange: (samples: DraftSamplePreview[]) => void }) {
  function update(index: number, patch: Partial<DraftSamplePreview>) {
    onChange(samples.map((sample, sampleIndex) => sampleIndex === index ? { ...sample, ...patch } : sample));
  }
  return (
    <section className="dashboard-form-section studio-tracks-section">
      <SectionHeader
        title="Sample Previews"
        description="Add short public previews so visitors can hear what is inside the protected full pack. The ZIP remains the owned download."
        action={(
          <label className="dashboard-field" style={{ minWidth: 140 }}>
            <span className="dashboard-field-label">Preview Count</span>
            <select className="os-input-field" value={samples.length} onChange={event => onChange(ensureSamplePreviewCount(samples, Number(event.target.value)))}>
              {Array.from({ length: 31 }, (_, index) => <option key={index} value={index}>{index}</option>)}
            </select>
          </label>
        )}
      />
      <div className="dashboard-track-editor-list">
        {samples.map((sample, index) => (
          <div className="dashboard-track-editor-row" key={`sample-${index}`}>
            <div className="dashboard-track-editor-copy">
              <label className="dashboard-field studio-track-title-field">
                <span className="dashboard-field-label">{index + 1}. Sample Name</span>
                <input className="os-input-field" value={sample.title} onChange={event => update(index, { title: event.target.value })} />
              </label>
              <UploadField
                label="Preview Audio"
                folder="products/sample-previews"
                userId={userId}
                value={sample.previewUrl}
                accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/flac"
                buttonLabel="Upload preview"
                previewKind="none"
                hideLabel
                hideSuccessMessage
                onChange={previewUrl => update(index, { previewUrl })}
                onAudioAnalysis={analysis => update(index, {
                  durationSeconds: analysis.durationSeconds,
                  waveformPeaks: analysis.waveformPeaks,
                  mimeType: analysis.mimeType,
                  fileSizeBytes: analysis.fileSizeBytes,
                })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
