export const EMAIL_TEMPLATE_VERSIONS = {
  welcome: 1,
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

