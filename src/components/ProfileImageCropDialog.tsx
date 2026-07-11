'use client';

import { useEffect, useMemo, useState } from 'react';

type CropTarget = 'avatar' | 'hero';

export function ProfileImageCropDialog({
  file,
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  file: File;
  target: CropTarget;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const sourceUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  async function confirm() {
    if (!sourceUrl || busy) return;
    const image = await loadImage(sourceUrl);
    const outputWidth = target === 'avatar' ? 1024 : 1800;
    const outputHeight = target === 'avatar' ? 1024 : 600;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
    const scale = baseScale * zoom;
    const cropWidth = Math.min(image.naturalWidth, outputWidth / scale);
    const cropHeight = Math.min(image.naturalHeight, outputHeight / scale);
    const availableX = Math.max(0, image.naturalWidth - cropWidth);
    const availableY = Math.max(0, image.naturalHeight - cropHeight);
    const sourceX = availableX / 2 + (offsetX / 100) * (availableX / 2);
    const sourceY = availableY / 2 + (offsetY / 100) * (availableY / 2);

    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return;
    await onConfirm(new File([blob], `${target}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }

  const previewStyle = {
    transform: `translate(${offsetX * -0.35}%, ${offsetY * -0.35}%) scale(${zoom})`,
  };

  return (
    <div className="profile-crop-overlay" role="presentation">
      <button type="button" className="profile-crop-scrim" aria-label="Cancel image editing" onClick={onCancel} />
      <section className="profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
        <div className="profile-crop-header">
          <button type="button" className="profile-crop-text-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <h2 id="profile-crop-title">Adjust {target === 'avatar' ? 'profile photo' : 'cover'}</h2>
          <button type="button" className="profile-crop-text-button profile-crop-confirm" onClick={() => void confirm()} disabled={busy}>
            {busy ? 'Uploading…' : 'Use photo'}
          </button>
        </div>

        <div className={target === 'avatar' ? 'profile-crop-preview profile-crop-preview-avatar' : 'profile-crop-preview profile-crop-preview-cover'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sourceUrl} alt="Crop preview" style={previewStyle} />
        </div>

        <div className="profile-crop-controls">
          <label>
            <span>Zoom</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} />
          </label>
          <label>
            <span>Horizontal position</span>
            <input type="range" min="-100" max="100" step="1" value={offsetX} onChange={event => setOffsetX(Number(event.target.value))} />
          </label>
          <label>
            <span>Vertical position</span>
            <input type="range" min="-100" max="100" step="1" value={offsetY} onChange={event => setOffsetY(Number(event.target.value))} />
          </label>
        </div>
      </section>
    </div>
  );
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
