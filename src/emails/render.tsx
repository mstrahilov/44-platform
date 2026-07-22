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

async function adminSignup(payload: EmailTemplatePayloads['admin_signup_notification']): Promise<RenderedEmail> {
  const title = payload.creatorRequested ? 'New Creator access request.' : 'New member joined 44OS.';
  const preview = payload.creatorRequested
    ? `${payload.displayName} requested Creator access.`
    : `${payload.displayName} created a member account.`;
  return {
    subject: payload.creatorRequested ? `Creator access requested — ${payload.displayName}` : `New 44OS member — ${payload.displayName}`,
    preview,
    html: await document(<EmailFrame preview={preview}><Heading>{title}</Heading><Paragraph subtle>{payload.creatorRequested ? 'The account remains a member until you review and approve the request in Admin.' : 'A new member account was created on 44OS.'}</Paragraph><DetailTable rows={[{ label: 'Name', value: payload.displayName }, { label: 'Username', value: `@${payload.username}` }, { label: 'Email', value: payload.email }, ...(payload.countryCode ? [{ label: 'Country', value: payload.countryCode }] : []), { label: 'Joined', value: payload.signedUpAt }, { label: 'Creator request', value: payload.creatorRequested ? 'Pending review' : 'No' }]} /><Button href={payload.adminUrl}>{payload.creatorRequested ? 'Review Creator request' : 'View member'}</Button></EmailFrame>),
    text: `${title}\n\nName: ${payload.displayName}\nUsername: @${payload.username}\nEmail: ${payload.email}${payload.countryCode ? `\nCountry: ${payload.countryCode}` : ''}\nJoined: ${payload.signedUpAt}\nCreator request: ${payload.creatorRequested ? 'Pending review' : 'No'}\n\nOpen Admin: ${payload.adminUrl}`,
  };
}

async function adminRelease(payload: EmailTemplatePayloads['admin_release_notification']): Promise<RenderedEmail> {
  const preview = `${payload.creatorName} published ${payload.title}.`;
  return {
    subject: `New release published — ${payload.title}`,
    preview,
    html: await document(<EmailFrame preview={preview}><Heading>New release published.</Heading><Paragraph subtle>A Creator published new Music on 44OS.</Paragraph><DetailTable rows={[{ label: 'Release', value: payload.title }, { label: 'Creator', value: payload.creatorName }, ...(payload.creatorEmail ? [{ label: 'Creator email', value: payload.creatorEmail }] : []), { label: 'Type', value: payload.itemType }, { label: 'Published', value: payload.publishedAt }]} /><Button href={payload.adminUrl}>Open release in Admin</Button></EmailFrame>),
    text: `New release published\n\nRelease: ${payload.title}\nCreator: ${payload.creatorName}${payload.creatorEmail ? `\nCreator email: ${payload.creatorEmail}` : ''}\nType: ${payload.itemType}\nPublished: ${payload.publishedAt}\n\nOpen Admin: ${payload.adminUrl}`,
  };
}

async function creatorAccessGranted(payload: EmailTemplatePayloads['creator_access_granted']): Promise<RenderedEmail> {
  const preview = 'Your 44OS Creator access is ready.';
  return {
    subject: 'You are now a Creator on 44OS',
    preview,
    html: await document(<EmailFrame preview={preview}><Heading>You are now a Creator, {payload.displayName}.</Heading><Paragraph subtle>Your account can now publish music, books, sample packs, and updates. Open Studio whenever you are ready to add your first release.</Paragraph><Button href={payload.studioUrl}>Open Studio</Button><Paragraph subtle>If you have questions about publishing, reply to this email and Support will help.</Paragraph></EmailFrame>),
    text: `You are now a Creator, ${payload.displayName}.\n\nYour account can now publish music, books, sample packs, and updates. Open Studio whenever you are ready to add your first release.\n\nOpen Studio: ${payload.studioUrl}\n\nIf you have questions about publishing, reply to this email and Support will help.`,
  };
}

async function teamAccessGranted(payload: EmailTemplatePayloads['team_access_granted']): Promise<RenderedEmail> {
  const preview = 'Your private forty four Team workspace is ready.';
  return {
    subject: 'You now have access to the forty four Team workspace',
    preview,
    html: await document(<EmailFrame preview={preview}><Heading>Welcome to the Team workspace, {payload.displayName}.</Heading><Paragraph subtle>You can now open the current forty four Brand Guide, download approved brand assets, and browse the published Creator and release directories. Your existing 44OS account role has not changed.</Paragraph><Button href={payload.teamUrl}>Open Team</Button><Paragraph subtle>Keep Team materials private. If this access looks unexpected, reply to this email so Support can help.</Paragraph></EmailFrame>),
    text: `Welcome to the Team workspace, ${payload.displayName}.\n\nYou can now open the current forty four Brand Guide, download approved brand assets, and browse the published Creator and release directories. Your existing 44OS account role has not changed.\n\nOpen Team: ${payload.teamUrl}\n\nKeep Team materials private. If this access looks unexpected, reply to this email so Support can help.`,
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
    case 'admin_signup_notification': return adminSignup(payload as EmailTemplatePayloads['admin_signup_notification']);
    case 'admin_release_notification': return adminRelease(payload as EmailTemplatePayloads['admin_release_notification']);
    case 'creator_access_granted': return creatorAccessGranted(payload as EmailTemplatePayloads['creator_access_granted']);
    case 'team_access_granted': return teamAccessGranted(payload as EmailTemplatePayloads['team_access_granted']);
    case 'purchase_confirmation': return purchase(payload as EmailTemplatePayloads['purchase_confirmation']);
    case 'refund_cancellation': return refund(payload as EmailTemplatePayloads['refund_cancellation']);
    case 'fulfillment_tracking': return fulfillment(payload as EmailTemplatePayloads['fulfillment_tracking']);
    case 'support_acknowledgement': return support(payload as EmailTemplatePayloads['support_acknowledgement']);
  }
}
