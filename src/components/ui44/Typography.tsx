import { createElement, type HTMLAttributes, type ReactNode } from 'react';

export type Ui44TextVariant =
  | 'page-title'
  | 'section-title'
  | 'subsection-title'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subheadline'
  | 'meta'
  | 'caption'
  | 'field-label'
  | 'control';

export type Ui44TextTone =
  | 'primary'
  | 'secondary'
  | 'placeholder'
  | 'disabled'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'inherit';

type Ui44TextElement = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'strong' | 'label' | 'div' | 'code';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Ui44Text({
  as = 'span',
  variant = 'body',
  tone = 'primary',
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: Ui44TextElement;
  variant?: Ui44TextVariant;
  tone?: Ui44TextTone;
  children: ReactNode;
}) {
  return createElement(
    as,
    {
      ...props,
      className: joinClasses('ui44-type', `ui44-type-${variant}`, `ui44-tone-${tone}`, className),
    },
    children,
  );
}

export const ui44TypeSpecimens: Array<{
  variant: Ui44TextVariant;
  label: string;
  desktop: string;
  mobile: string;
  sample: string;
}> = [
  { variant: 'page-title', label: 'Page title', desktop: '26 / 32 · 700', mobile: '34 / 41 · 700', sample: 'Library' },
  { variant: 'section-title', label: 'Section title', desktop: '22 / 26 · 700', mobile: '28 / 34 · 700', sample: 'New in Music' },
  { variant: 'subsection-title', label: 'Subsection title', desktop: '17 / 22 · 700', mobile: '22 / 28 · 700', sample: 'Tracklist' },
  { variant: 'headline', label: 'Headline', desktop: '13 / 16 · 600', mobile: '17 / 22 · 600', sample: 'Here comes the feeling' },
  { variant: 'body', label: 'Body', desktop: '13 / 18 · 400', mobile: '17 / 24 · 400', sample: 'Primary descriptions and readable multiline content.' },
  { variant: 'callout', label: 'Callout', desktop: '12 / 15 · 500', mobile: '16 / 21 · 400', sample: 'Supporting information and menu content' },
  { variant: 'subheadline', label: 'Subheadline', desktop: '11 / 14 · 400', mobile: '15 / 20 · 400', sample: 'Secondary row information' },
  { variant: 'meta', label: 'Meta', desktop: '10 / 13 · 400', mobile: '13 / 18 · 400', sample: 'Jan 1, 2026 · 1:45' },
  { variant: 'caption', label: 'Caption', desktop: '10 / 13 · 500', mobile: '12 / 16 · 400', sample: 'Compact annotation' },
  { variant: 'field-label', label: 'Field label', desktop: '12 / 15 · 600', mobile: '15 / 20 · 600', sample: 'Release title' },
  { variant: 'control', label: 'Control', desktop: '13 / 16 · 600', mobile: '17 / 22 · 600', sample: 'Continue' },
];
