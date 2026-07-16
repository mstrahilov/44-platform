import type { HTMLAttributes, ReactNode } from 'react';
import { Ui44Text } from '@/components/ui44/Typography';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Ui44PageHeader({
  title,
  action,
  className = '',
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return <header className={joinClasses('ui44-page-header', className)}>
    <div className="ui44-page-header-copy">
      <Ui44Text as="h1" variant="page-title">{title}</Ui44Text>
    </div>
    {action ? <div className="ui44-page-header-action">{action}</div> : null}
  </header>;
}

export type Ui44FieldSpan = 'short' | 'medium' | 'wide' | 'full';

export function Ui44FormGrid({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClasses('ui44-form-grid', className)} {...props}>{children}</div>;
}

export function Ui44FormField({
  label,
  span = 'full',
  help,
  children,
  className = '',
}: {
  label: ReactNode;
  span?: Ui44FieldSpan;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <label className={joinClasses('ui44-form-field', `ui44-form-field-${span}`, className)}>
    <Ui44Text variant="field-label" tone="primary">{label}</Ui44Text>
    {children}
    {help ? <Ui44Text variant="meta" tone="secondary">{help}</Ui44Text> : null}
  </label>;
}

export function Ui44IdentityAvatar({
  src,
  name,
  size = 'inline',
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: 'inline' | 'hero';
  className?: string;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '44';
  return <span className={joinClasses('ui44-identity-avatar', `ui44-identity-avatar-${size}`, className)} aria-hidden="true">
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" />
    ) : <span>{initials}</span>}
  </span>;
}
