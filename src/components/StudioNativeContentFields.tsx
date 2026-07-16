'use client';

import type { Dispatch, SetStateAction } from 'react';
import { UploadField } from '@/components/UploadField';
import { SectionHeader } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';

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
      <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
        <UploadField label="Sample PDF (Optional)" folder="products/book-previews" userId={userId} value={previewUrl} accept="application/pdf,.pdf" buttonLabel="Upload sample PDF" onChange={onPreviewUrlChange} />
        <div className="dashboard-form-grid dashboard-form-grid-3 ui44-form-grid">
          <label className="dashboard-field">
            <span className="dashboard-field-label">Total Pages</span>
            <Ui44TextInput className="os-input-field" inputMode="numeric" value={totalPages} placeholder="Enter total pages" onChange={event => onTotalPagesChange(event.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="dashboard-field">
            <span className="dashboard-field-label">Sample Pages</span>
            <Ui44TextInput className="os-input-field" inputMode="numeric" value={samplePages} placeholder="Enter sample pages" onChange={event => onSamplePagesChange(event.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="dashboard-field">
            <span className="dashboard-field-label">Language</span>
            <Ui44TextInput className="os-input-field" value={languageCode} placeholder="Enter language code" onChange={event => onLanguageCodeChange(event.target.value.slice(0, 12))} aria-label="Book language code" />
          </label>
        </div>
      </div>
    </section>
  );
}

export function StudioSamplePreviewFields({ userId, samples, onChange }: { userId: string; samples: DraftSamplePreview[]; onChange: Dispatch<SetStateAction<DraftSamplePreview[]>> }) {
  function update(index: number, patch: Partial<DraftSamplePreview>) {
    onChange(current => current.map((sample, sampleIndex) => sampleIndex === index ? { ...sample, ...patch } : sample));
  }
  return (
    <section className="dashboard-form-section studio-tracks-section">
      <div className="studio-sample-preview-header">
        <SectionHeader
          title="Sample Previews"
          description="Add short public previews so visitors can hear what is inside the protected full pack. The ZIP remains the owned download."
          action={(
            <label className="dashboard-field studio-native-short-field">
              <span className="dashboard-field-label">Preview Count</span>
              <Ui44SelectInput value={samples.length || ''} onChange={event => onChange(current => ensureSamplePreviewCount(current, Number(event.target.value)))}>
                <option value="">Select preview count</option>
                {Array.from({ length: 30 }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count}</option>)}
              </Ui44SelectInput>
            </label>
          )}
        />
      </div>
      <div className="dashboard-track-editor-list">
        {samples.map((sample, index) => (
          <div className="dashboard-track-editor-row" key={`sample-${index}`}>
            <div className="dashboard-track-editor-copy">
              <label className="dashboard-field studio-track-title-field">
                <span className="dashboard-field-label">{index + 1}. Sample Name</span>
                <Ui44TextInput className="os-input-field" value={sample.title} placeholder="Enter sample title" onChange={event => update(index, { title: event.target.value })} />
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
