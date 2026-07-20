export const EMAIL_TEMPLATE_VERSIONS = {
  welcome: 1,
  admin_signup_notification: 1,
  admin_release_notification: 1,
  creator_access_granted: 1,
  purchase_confirmation: 1,
  refund_cancellation: 1,
  fulfillment_tracking: 1,
  support_acknowledgement: 1,
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATE_VERSIONS;

export type EmailLineItem = {
  title: string;
  detail?: string;
  quantity: number;
  amount: string;
};

export type EmailTemplatePayloads = {
  welcome: {
    displayName?: string;
    libraryUrl: string;
  };
  admin_signup_notification: {
    displayName: string;
    username: string;
    email: string;
    countryCode?: string;
    creatorRequested: boolean;
    signedUpAt: string;
    adminUrl: string;
  };
  admin_release_notification: {
    title: string;
    creatorName: string;
    creatorEmail?: string;
    itemType: string;
    publishedAt: string;
    adminUrl: string;
  };
  creator_access_granted: {
    displayName: string;
    studioUrl: string;
  };
  purchase_confirmation: {
    orderReference: string;
    purchasedAt: string;
    lines: EmailLineItem[];
    subtotal: string;
    shipping?: string;
    tax?: string;
    total: string;
    ordersUrl: string;
  };
  refund_cancellation: {
    orderReference: string;
    outcome: 'refunded' | 'partially_refunded' | 'canceled';
    amount?: string;
    detail: string;
    ordersUrl: string;
  };
  fulfillment_tracking: {
    orderReference: string;
    status: 'in_production' | 'shipped' | 'delivered' | 'canceled';
    detail: string;
    trackingUrl?: string;
    trackingNumber?: string;
    ordersUrl: string;
  };
  support_acknowledgement: {
    caseReference: string;
    subject: string;
    receivedAt: string;
    supportUrl: string;
  };
};

export type RenderedEmail = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};
