'use client';

import { Ui44CheckboxInput } from '@/components/ui44/Inputs';

export const STUDIO_RIGHTS_STATEMENT = 'I confirm that I own this work or have the necessary rights and permission to publish and distribute it through 44OS.';

export function StudioRightsPanel({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="studio-rights-panel ui44-panel ui44-panel-glass">
      <label className="settings-checkbox-row studio-rights-checkbox">
        <Ui44CheckboxInput checked={checked} onChange={event => onChange(event.target.checked)} />
        <span>{STUDIO_RIGHTS_STATEMENT}</span>
      </label>
    </div>
  );
}
