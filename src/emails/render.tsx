import { render } from '@react-email/render';
import { Button, DetailTable, EmailFrame, Heading, Paragraph } from './EmailFrame';
import type { EmailTemplateKey, EmailTemplatePayloads, RenderedEmail } from './contracts';

async function document(element: React.ReactElement) {
  return render(element);
}

async function welcome(payload: EmailTemplatePayloads['welcome']): Promise<RenderedEmail> {
  const greeting = payload.displayName ? `Welcome, ${payload.displayName}.` : 'Welcome to 44.';
  const preview = 'Your 44OS account is ready.';
  return {
    subject: 'Welcome to 44', preview,
    html: await document(<EmailFrame preview={preview}><Heading>{greeting}</Heading><Paragraph subtle>Your account is ready. Browse independent work, build your Library, join Community, and return as releases evolve.</Paragraph><Button href={payload.libraryUrl}>Open 44OS</Button><Paragraph subtle>If you did not create this account, reply to this email so Support can help.</Paragraph></EmailFrame>),
    text: `${greeting}\n\nYour account is ready. Browse independent work, build your Library, join Community, and return as releases evolve.\n\nOpen 44OS: ${payload.libraryUrl}\n\nIf you did not create this account, reply to this email so Support can help.`,
  };
}

async function purchase(payload: EmailTemplatePayloads['purchase_confirmation']): Promise<RenderedEmail> {
  const preview = `Payment confirmed for order ${payload.orderReference}.`;
  const itemRows = payload.lines.map(line => ({ label: `${line.quantity} × ${line.title}${line.detail ? ` — ${line.detail}` : ''}`, value: line.amount }));
  const totals = [
    ...itemRows,
    { label: 'Subtotal', value: payload.subtotal },
    ...(payload.shipping ? [{ label: 'Shipping', value: payload.shipping }] : []),
    ...(payload.tax ? [{ label: 'Tax', value: payload.tax }] : []),
    { label: 'Total', value: payload.total, strong: true },
  ];
  const textLines = payload.lines.map(line => `${line.quantity} × ${line.title}${line.detail ? ` — ${line.detail}` : ''}: ${line.amount}`).join('\n');
  return {
    subject: `Your 44OS receipt — ${payload.orderReference}`, preview,
    html: await document(<EmailFrame preview={preview}><Heading>Purchase confirmed.</Heading><Paragraph subtle>Thanks for supporting independent work. Your payment was verified and your order is now recorded in 44OS.</Paragraph><DetailTable rows={[{ label: 'Order', value: payload.orderReference }, { label: 'Purchased', value: payload.purchasedAt }, ...totals]} /><Button href={payload.ordersUrl}>View order</Button></EmailFrame>),
    text: `Purchase confirmed\n\nOrder: ${payload.orderReference}\nPurchased: ${payload.purchasedAt}\n\n${textLines}\nSubtotal: ${payload.subtotal}${payload.shipping ? `\nShipping: ${payload.shipping}` : ''}${payload.tax ? `\nTax: ${payload.tax}` : ''}\nTotal: ${payload.total}\n\nView order: ${payload.ordersUrl}`,
  };
}

async function refund(payload: EmailTemplatePayloads['refund_cancellation']): Promise<RenderedEmail> {
  const title = payload.outcome === 'partially_refunded' ? 'Partial refund confirmed.' : payload.outcome === 'refunded' ? 'Refund confirmed.' : 'Order canceled.';
  const preview = `${title} Order ${payload.orderReference}.`;
  return {
    subject: `${title.replace('.', '')} — ${payload.orderReference}`, preview,
    html: await document(<EmailFrame preview={preview}><Heading>{title}</Heading><Paragraph subtle>{payload.detail}</Paragraph><DetailTable rows={[{ label: 'Order', value: payload.orderReference }, ...(payload.amount ? [{ label: 'Amount', value: payload.amount, strong: true }] : [])]} /><Button href={payload.ordersUrl}>View order</Button><Paragraph subtle>Questions about this change can be sent by replying to this email.</Paragraph></EmailFrame>),
    text: `${title}\n\nOrder: ${payload.orderReference}${payload.amount ? `\nAmount: ${payload.amount}` : ''}\n\n${payload.detail}\n\nView order: ${payload.ordersUrl}\n\nQuestions about this change can be sent by replying to this email.`,
  };
}

async function fulfillment(payload: EmailTemplatePayloads['fulfillment_tracking']): Promise<RenderedEmail> {
  const titles = { in_production: 'Your order is in production.', shipped: 'Your order has shipped.', delivered: 'Your order was delivered.', canceled: 'Fulfillment was canceled.' } as const;
  const title = titles[payload.status];
  const preview = `${title} Order ${payload.orderReference}.`;
  return {
    subject: `${title.replace('.', '')} — ${payload.orderReference}`, preview,
    html: await document(<EmailFrame preview={preview}><Heading>{title}</Heading><Paragraph subtle>{payload.detail}</Paragraph><DetailTable rows={[{ label: 'Order', value: payload.orderReference }, ...(payload.trackingNumber ? [{ label: 'Tracking', value: payload.trackingNumber }] : [])]} /><Button href={payload.trackingUrl ?? payload.ordersUrl}>{payload.trackingUrl ? 'Track shipment' : 'View order'}</Button></EmailFrame>),
    text: `${title}\n\nOrder: ${payload.orderReference}${payload.trackingNumber ? `\nTracking: ${payload.trackingNumber}` : ''}\n\n${payload.detail}\n\n${payload.trackingUrl ? `Track shipment: ${payload.trackingUrl}` : `View order: ${payload.ordersUrl}`}`,
  };
}

async function support(payload: EmailTemplatePayloads['support_acknowledgement']): Promise<RenderedEmail> {
  const preview = `Support case ${payload.caseReference} is recorded.`;
  return {
    subject: `We received your support request — ${payload.caseReference}`, preview,
    html: await document(<EmailFrame preview={preview}><Heading>We received your request.</Heading><Paragraph subtle>Your case is recorded for the Support team. A human reply will come from support@44os.com.</Paragraph><DetailTable rows={[{ label: 'Case', value: payload.caseReference }, { label: 'Subject', value: payload.subject }, { label: 'Received', value: payload.receivedAt }]} /><Button href={payload.supportUrl}>Open Support</Button><Paragraph subtle>Reply to this email to add context through the monitored Support mailbox.</Paragraph></EmailFrame>),
    text: `We received your request\n\nCase: ${payload.caseReference}\nSubject: ${payload.subject}\nReceived: ${payload.receivedAt}\n\nA human reply will come from support@44os.com.\n\nOpen Support: ${payload.supportUrl}\n\nReply to this email to add context through the monitored Support mailbox.`,
  };
}

export async function renderEmail<K extends EmailTemplateKey>(template: K, payload: EmailTemplatePayloads[K]): Promise<RenderedEmail> {
  switch (template) {
    case 'welcome': return welcome(payload as EmailTemplatePayloads['welcome']);
    case 'purchase_confirmation': return purchase(payload as EmailTemplatePayloads['purchase_confirmation']);
    case 'refund_cancellation': return refund(payload as EmailTemplatePayloads['refund_cancellation']);
    case 'fulfillment_tracking': return fulfillment(payload as EmailTemplatePayloads['fulfillment_tracking']);
    case 'support_acknowledgement': return support(payload as EmailTemplatePayloads['support_acknowledgement']);
  }
}
