import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';

type TextButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  href?: never;
};

type TextLinkProps = Omit<ComponentProps<typeof Link>, 'children'> & {
  children: ReactNode;
};

/** The single text action control, rendered as a button or link as needed. */
export function OS44Button(props: TextButtonProps | TextLinkProps) {
  if ('href' in props && props.href !== undefined) {
    const { className = '', ...linkProps } = props as TextLinkProps;
    return <Link className={`ui44-action-button ${className}`.trim()} {...linkProps} />;
  }

  const { className = '', type = 'button', ...buttonProps } = props as TextButtonProps;
  return <button type={type} className={`ui44-action-button ${className}`.trim()} {...buttonProps} />;
}
