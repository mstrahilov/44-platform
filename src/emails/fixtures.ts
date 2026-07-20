import type { EmailTemplateKey, EmailTemplatePayloads } from './contracts';

export const EMAIL_PREVIEW_FIXTURES: { [K in EmailTemplateKey]: EmailTemplatePayloads[K] } = {
  welcome: { displayName: 'Miro', libraryUrl: 'https://44os.com/library' },
  admin_signup_notification: {
    displayName: 'Koukla', username: 'koukla', email: 'koukla@example.com', countryCode: 'US',
    creatorRequested: true, signedUpAt: 'July 20, 2026 at 1:44 PM CDT',
    adminUrl: 'https://44os.com/admin/people/00000000-0000-4000-8000-000000000044',
  },
  admin_release_notification: {
    title: 'Flippin Out', creatorName: 'Koukla', creatorEmail: 'koukla@example.com', itemType: 'Single',
    publishedAt: 'July 20, 2026 at 2:04 PM CDT',
    adminUrl: 'https://44os.com/admin/content/00000000-0000-4000-8000-000000000044',
  },
  creator_access_granted: {
    displayName: 'Miro', studioUrl: 'https://44os.com/studio',
  },
  purchase_confirmation: {
    orderReference: '44-8F2A19', purchasedAt: 'July 16, 2026 at 2:44 PM CDT',
    lines: [{ title: '44 Hoodie', detail: 'Black / Large', quantity: 1, amount: '$88.00' }, { title: 'ØLSTEN — North Star', quantity: 1, amount: '$12.00' }],
    subtotal: '$100.00', shipping: '$8.00', tax: '$8.91', total: '$116.91', ordersUrl: 'https://44os.com/orders',
  },
  refund_cancellation: { orderReference: '44-8F2A19', outcome: 'refunded', amount: '$116.91', detail: 'The refund was recorded by the payment provider. Your bank may take several business days to post it.', ordersUrl: 'https://44os.com/orders' },
  fulfillment_tracking: { orderReference: '44-8F2A19', status: 'shipped', detail: 'Your 44 Hoodie is on the way.', trackingUrl: 'https://example.com/tracking', trackingNumber: '9400 1000 0000 0000', ordersUrl: 'https://44os.com/orders' },
  support_acknowledgement: { caseReference: 'SUP-44A19C', subject: 'Download does not begin', receivedAt: 'July 16, 2026 at 3:12 PM CDT', supportUrl: 'https://44os.com/support' },
};
