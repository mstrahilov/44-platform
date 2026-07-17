import type { CSSProperties, ReactNode } from 'react';

const ink = '#151515';
const muted = '#5f5f5a';

export function EmailFrame({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element -- this renders an email document, not a Next page */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#f4f4f2', color: ink, colorScheme: 'light', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0 }}>{preview}</div>
        <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" style={{ backgroundColor: '#f4f4f2' }}>
          <tbody><tr><td align="center" style={{ padding: '32px 16px' }}>
            <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" style={{ maxWidth: 600, backgroundColor: '#ffffff', border: '1px solid #deded9' }}>
              <tbody>
                <tr><td style={{ padding: '28px 32px 12px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>44OS</td></tr>
                <tr><td style={{ padding: '12px 32px 32px' }}>{children}</td></tr>
                <tr><td style={{ padding: '20px 32px', borderTop: '1px solid #e8e8e3', color: '#74746e', fontSize: 12, lineHeight: 1.5 }}>
                  Sent by 44OS. Need help? Reply to this email or visit 44OS Support.
                </td></tr>
              </tbody>
            </table>
          </td></tr></tbody>
        </table>
      </body>
    </html>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <h1 style={{ margin: '0 0 12px', color: ink, fontSize: 26, lineHeight: 1.25, letterSpacing: '-0.4px' }}>{children}</h1>;
}

export function Paragraph({ children, subtle = false }: { children: ReactNode; subtle?: boolean }) {
  return <p style={{ margin: '0 0 20px', color: subtle ? muted : ink, fontSize: 16, lineHeight: 1.6 }}>{children}</p>;
}

export function Button({ href, children }: { href: string; children: ReactNode }) {
  let safeHref: string;
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== 'https:') throw new Error('Email actions require HTTPS.');
    safeHref = parsed.toString();
  } catch {
    throw new Error('Email actions require a valid HTTPS URL.');
  }
  return <a href={safeHref} style={{ display: 'inline-block', margin: '4px 0 24px', padding: '13px 20px', backgroundColor: ink, color: '#ffffff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>{children}</a>;
}

export function DetailTable({ rows }: { rows: Array<{ label: string; value: ReactNode; strong?: boolean }> }) {
  return <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" style={{ margin: '4px 0 24px', borderTop: '1px solid #e8e8e3' }}><tbody>
    {rows.map(row => <tr key={row.label}>
      <td style={cellStyle}>{row.label}</td>
      <td align="right" style={{ ...cellStyle, color: ink, fontWeight: row.strong ? 700 : 400 }}>{row.value}</td>
    </tr>)}
  </tbody></table>;
}

const cellStyle: CSSProperties = { padding: '12px 0', borderBottom: '1px solid #e8e8e3', color: muted, fontSize: 14, lineHeight: 1.45, verticalAlign: 'top' };
