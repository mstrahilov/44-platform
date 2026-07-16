'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Ui44TextInput } from '@/components/ui44/Inputs';

type ButtonVariant = 'default' | 'destructive' | 'unavailable';

export function Ui44Button({
  variant = 'default',
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const unavailable = variant === 'unavailable';
  return <button
    className={`ui44-button ui44-button-${variant} ${className}`.trim()}
    disabled={disabled || unavailable}
    {...props}
  />;
}

type SymbolKind = 'add' | 'filter' | 'search' | 'notifications' | 'back' | 'more' | 'cart';

function SymbolIcon({ kind }: { kind: SymbolKind }) {
  if (kind === 'add') return <span className="ui44-symbol-plus" aria-hidden="true">+</span>;
  if (kind === 'filter') return <svg className="ui44-symbol-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
  if (kind === 'search') return <svg className="ui44-symbol-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></svg>;
  if (kind === 'notifications') return <svg className="ui44-symbol-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>;
  if (kind === 'back') return <svg className="ui44-symbol-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>;
  if (kind === 'cart') return <svg className="ui44-symbol-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L20 8H6" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></svg>;
  return <svg className="ui44-symbol-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);
  return ref;
}

export function Ui44MenuSymbol({
  kind,
  label,
  items = ['Item A', 'Item B', 'Item C'],
  align = 'right',
}: {
  kind: Exclude<SymbolKind, 'search' | 'back'>;
  label: string;
  items?: string[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const close = () => setOpen(false);
  const ref = useOutsideClose(open, close);
  const filterActive = kind === 'filter' && selected !== null;

  return <div className="ui44-symbol-action" ref={ref}>
    <button
      type="button"
      className={`ui44-symbol-button${filterActive ? ' ui44-symbol-button-active' : ''}`}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={() => setOpen(value => !value)}
    >
      <SymbolIcon kind={kind} />
    </button>
    {open ? <div className={`ui44-panel ui44-panel-paper ui44-symbol-menu ui44-symbol-menu-${align}`} role="menu" aria-label={`${label} options`}>
      {items.map(item => <button
        type="button"
        className="ui44-symbol-menu-item"
        role="menuitem"
        key={item}
        onClick={() => { setSelected(item); setOpen(false); }}
      >
        <span>{item}</span>
      </button>)}
    </div> : null}
  </div>;
}

export function Ui44SearchSymbol() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useOutsideClose(open, close);
  return <div className="ui44-search-action" ref={ref}>
    {open ? <div className="ui44-search-open">
      <span className="ui44-search-open-icon"><SymbolIcon kind="search" /></span>
      <Ui44TextInput autoFocus aria-label="Search" placeholder="Search" />
    </div> : <button type="button" className="ui44-symbol-button" aria-label="Search" aria-expanded="false" onClick={() => setOpen(true)}><SymbolIcon kind="search" /></button>}
  </div>;
}

export function Ui44BackSymbol() {
  const [pressed, setPressed] = useState(false);
  return <button
    type="button"
    className={`ui44-symbol-button${pressed ? ' ui44-symbol-button-pressed' : ''}`}
    aria-label="Back"
    onClick={() => {
      setPressed(true);
      window.setTimeout(() => setPressed(false), 180);
    }}
  ><SymbolIcon kind="back" /></button>;
}

export function Ui44CartSymbol() {
  return <button type="button" className="ui44-symbol-button" aria-label="Cart"><SymbolIcon kind="cart" /></button>;
}

export function Ui44SectionArrow({
  label = 'View more',
  href,
  onClick,
}: {
  label?: string;
  href?: string;
  onClick?: () => void;
}) {
  const icon = <svg className="ui44-section-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
  if (href) return <Link href={href} className="ui44-section-arrow" aria-label={label}>{icon}</Link>;
  return <button type="button" className="ui44-section-arrow" aria-label={label} onClick={onClick}>
    {icon}
  </button>;
}

export function Ui44ControlExample({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ui44-symbol-audit-item"><span>{label}</span>{children}</div>;
}
