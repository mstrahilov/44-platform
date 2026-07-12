'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export function ProfileImageCropDialog({
  file,
  busy,
  onCancel,
  onConfirm,
}: {
  file: File;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSourceUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
    return () => {
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);

  async function confirm() {
    if (!sourceUrl || busy) return;
    const image = await loadImage(sourceUrl);
    const outputWidth = 1024;
    const outputHeight = 1024;
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
    await onConfirm(new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }

  const previewStyle = {
    transform: `translate(${offsetX * -0.35}%, ${offsetY * -0.35}%) scale(${zoom})`,
  };

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function dragImage(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setOffsetX(value => clamp(value - (deltaX * 100) / Math.max(1, bounds.width * 0.35), -100, 100));
    setOffsetY(value => clamp(value - (deltaY * 100) / Math.max(1, bounds.height * 0.35), -100, 100));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="profile-crop-overlay" role="presentation">
      <button type="button" className="profile-crop-scrim" aria-label="Cancel image editing" onClick={onCancel} />
      <section className="profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
        <div className="profile-crop-header">
          <button type="button" className="profile-crop-text-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <h2 id="profile-crop-title">Adjust profile photo</h2>
          <button type="button" className="profile-crop-text-button profile-crop-confirm" onClick={() => void confirm()} disabled={busy}>
            {busy ? 'Uploading…' : 'Use photo'}
          </button>
        </div>

        <div
          className="profile-crop-preview profile-crop-preview-avatar"
          onPointerDown={beginDrag}
          onPointerMove={dragImage}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {sourceUrl ? <img src={sourceUrl} alt="Crop preview" style={previewStyle} draggable={false} /> : null}
        </div>

        <div className="profile-crop-controls">
          <p className="profile-crop-instruction">Drag the photo to reposition it.</p>
          <label>
            <span>Zoom</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} />
          </label>
        </div>
      </section>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
