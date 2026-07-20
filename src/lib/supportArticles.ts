export type SupportArticleSection = {
  heading: string;
  paragraphs?: string[];
  steps?: string[];
  bullets?: string[];
};

export type SupportArticle = {
  slug: string;
  title: string;
  description: string;
  category: SupportCategoryId;
  keywords: string[];
  sections: SupportArticleSection[];
  actions?: Array<{ label: string; href: string }>;
  popular?: boolean;
};

export type SupportCategoryId =
  | 'getting-started'
  | 'account-profile'
  | 'browse-library'
  | 'orders-payments'
  | 'merch-shipping'
  | 'community-messages'
  | 'creators-studio'
  | 'safety-policies';

export const SUPPORT_CATEGORIES: Array<{
  id: SupportCategoryId;
  title: string;
  description: string;
}> = [
  { id: 'getting-started', title: 'Getting started', description: 'Learn what 44OS is and find your way around.' },
  { id: 'account-profile', title: 'Account & profile', description: 'Sign up, sign in, recover access, and manage your identity.' },
  { id: 'browse-library', title: 'Browse, Library & playback', description: 'Discover, save, play, read, and download creative work.' },
  { id: 'orders-payments', title: 'Orders, payments & refunds', description: 'Understand checkout, receipts, downloads, and refunds.' },
  { id: 'merch-shipping', title: 'Merch & shipping', description: 'Physical products, delivery, tracking, returns, and order issues.' },
  { id: 'community-messages', title: 'Community & messages', description: 'Posts, questions, collaboration, profiles, follows, and Inbox.' },
  { id: 'creators-studio', title: 'Creators & Studio', description: 'Creator access, publishing, pricing, sales, and catalog management.' },
  { id: 'safety-policies', title: 'Safety, privacy & policies', description: 'Security, reporting, copyright, privacy requests, and support.' },
];

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    slug: 'what-is-44os',
    title: 'What is 44OS?',
    description: 'An introduction to the independent creative platform and what you can do here.',
    category: 'getting-started',
    keywords: ['about', '44', 'platform', 'music', 'books', 'sample packs', 'merch', 'artists', 'fans'],
    popular: true,
    sections: [
      { heading: 'A home for independent creative work', paragraphs: ['44OS brings discovery, ownership, listening, reading, community, and creator publishing into one platform. Members can discover Music, Books, Sample Packs, and 44-owned Merch while connecting directly with creators.'] },
      { heading: 'What Members can do', bullets: ['Create a public Member account without an invitation.', 'Browse published Items and creator profiles.', 'Save free Items or buy eligible paid Items.', 'Use Library to play, read, download, and revisit acquired work.', 'Post in Community, ask questions, find collaborators, follow people, and use Inbox.'] },
      { heading: 'What Creators can do', paragraphs: ['Creator access is granted by a 44OS administrator. Approved Creators use Studio to publish and manage supported work, set eligible prices, post updates, list events, and review catalog activity. Creator promotion and paid-selling eligibility are not automatic.'] },
    ],
    actions: [{ label: 'Browse 44OS', href: '/' }, { label: 'Create an account', href: '/login' }],
  },
  {
    slug: 'find-your-way-around',
    title: 'Find your way around 44OS',
    description: 'A quick guide to Home, Browse, Library, Radio, Community, Search, and account tools.',
    category: 'getting-started',
    keywords: ['navigation', 'dock', 'home', 'browse', 'store', 'library', 'radio', 'community', 'search', 'settings'],
    sections: [
      { heading: 'Main destinations', bullets: ['Home highlights new and featured work.', 'Browse contains Music, Books, Sample Packs, and Merch.', 'Library contains work you saved, added, or purchased.', 'Radio plays the shared 44 Radio stream.', 'Community contains posts, questions, and collaboration.', 'Search finds Items, creators, posts, and help articles.'] },
      { heading: 'Account destinations', paragraphs: ['Open your avatar menu for Profile, Inbox, Orders, Settings, and—if your account is approved—Studio. On mobile, the fixed Dock keeps the most-used destinations within reach.'] },
      { heading: 'Change appearance', paragraphs: ['Signed-in Members can open Settings and use Appearance to choose a theme and accent color.'] },
    ],
    actions: [{ label: 'Open Settings', href: '/settings' }],
  },
  {
    slug: 'create-an-account',
    title: 'Create and confirm your account',
    description: 'How public Member signup and email confirmation work.',
    category: 'account-profile',
    keywords: ['signup', 'sign up', 'register', 'invite', 'confirmation', 'verify email', 'resend'],
    popular: true,
    sections: [
      { heading: 'Anyone can become a Member', paragraphs: ['44OS Member signup is public and does not require an invitation. Creator access is a separate administrator-approved role.'] },
      { heading: 'Create your account', steps: ['Open Log In and choose the account-creation option.', 'Enter an email address you control and create a password.', 'Open the newest confirmation email from 44OS and follow its link.', 'Return to 44OS and sign in.'] },
      { heading: 'If the email does not arrive', bullets: ['Check spam, junk, and any forwarding mailbox.', 'Confirm that the address was typed correctly.', 'Request one resend and use the newest email.', 'Allow a few minutes before making repeated requests.'] },
    ],
    actions: [{ label: 'Open Log In', href: '/login' }],
  },
  {
    slug: 'sign-in-help',
    title: 'Trouble signing in',
    description: 'Steps for expired links, forgotten passwords, and unexpected sign-outs.',
    category: 'account-profile',
    keywords: ['login', 'log in', 'signed out', 'magic link', 'password', 'expired link', 'session'],
    popular: true,
    sections: [
      { heading: 'Try these first', steps: ['Confirm you are using the email connected to your account.', 'Use the newest email link if you requested more than one.', 'Refresh the page, then try signing in again.', 'If needed, open a private window to separate account issues from browser state.'] },
      { heading: 'Why a session may disappear', paragraphs: ['Private browsing, clearing browser data, blocking necessary storage, or opening an email link in a different browser can create a separate session. Sign in again in the browser you want to keep using.'] },
      { heading: 'Protect your account', paragraphs: ['Never send anyone your password, magic link, confirmation link, or recovery link. 44OS Support will not ask for them.'] },
    ],
    actions: [{ label: 'Reset password', href: '/account/recovery' }, { label: 'Log In', href: '/login' }],
  },
  {
    slug: 'reset-or-change-password',
    title: 'Reset or change your password',
    description: 'Use a secure recovery link or update your password while signed in.',
    category: 'account-profile',
    keywords: ['forgot password', 'reset', 'recovery', 'change password', 'security'],
    sections: [
      { heading: 'If you cannot sign in', steps: ['Open Reset Password.', 'Enter your account email.', 'Open the newest recovery email.', 'Choose a new password with at least eight characters.'] },
      { heading: 'If you are already signed in', paragraphs: ['Open Settings, then Account, to change your password. Use a strong password that you do not reuse elsewhere.'] },
      { heading: 'Recovery safety', paragraphs: ['A recovery session is temporary. If you did not request it, do not use the link; change your password from a trusted session and contact Support if you suspect unauthorized access.'] },
    ],
    actions: [{ label: 'Reset password', href: '/account/recovery' }, { label: 'Open Settings', href: '/settings#account' }],
  },
  {
    slug: 'edit-profile-and-email',
    title: 'Edit your profile or email',
    description: 'Update your public identity and securely change your login email.',
    category: 'account-profile',
    keywords: ['profile', 'avatar', 'bio', 'username', 'display name', 'email change', 'secure email'],
    sections: [
      { heading: 'Public profile', paragraphs: ['Your display name, username, avatar, bio, and approved links help people recognize you. Open your own Profile and choose Edit Profile to update available fields.'] },
      { heading: 'Change your login email', paragraphs: ['Email changes are security-sensitive. Open Settings and follow the email-change flow. You may need to confirm the change from both the old and new addresses before it becomes active.'] },
      { heading: 'Username and links', paragraphs: ['Choose a username you are comfortable displaying publicly. Creator external links accept only supported, validated destinations and appear only after they are saved successfully.'] },
    ],
    actions: [{ label: 'Open Profile', href: '/profile' }, { label: 'Open Settings', href: '/settings' }],
  },
  {
    slug: 'browse-and-search',
    title: 'Browse and search for work',
    description: 'Find Music, Books, Sample Packs, Merch, creators, posts, and answers.',
    category: 'browse-library',
    keywords: ['discover', 'search', 'filter', 'music', 'books', 'samples', 'merch', 'creators', 'posts'],
    sections: [
      { heading: 'Browse by format', paragraphs: ['Use Browse to explore published Music, Books, Sample Packs, and 44-owned Merch. Filters narrow the current catalog without changing an Item’s publication or availability.'] },
      { heading: 'Search across 44OS', paragraphs: ['Desktop Search opens from the top bar. Mobile Search is in the Dock. Search results can include Items, creators, Community posts, and Support articles.'] },
      { heading: 'If an Item is missing', paragraphs: ['An Item may be in draft, archived, temporarily unavailable, or removed from public sale. Existing purchase history and eligible Library access are preserved separately from public Store visibility.'] },
    ],
    actions: [{ label: 'Browse Items', href: '/store' }, { label: 'Search 44OS', href: '/search' }],
  },
  {
    slug: 'add-items-to-library',
    title: 'Add Items to your Library',
    description: 'The difference between saving free work and acquiring a paid Item.',
    category: 'browse-library',
    keywords: ['save', 'add', 'library', 'free', 'owned', 'purchase', 'remove', 'restore'],
    popular: true,
    sections: [
      { heading: 'Your Library is a durable record', paragraphs: ['Library contains work you saved, added, or purchased. A free acquisition can unlock supported playback, reading, or downloads; a paid acquisition is added only after verified payment.'] },
      { heading: 'Remove and re-add', paragraphs: ['Removing an Item hides it from your active Library view. Re-adding it should restore the existing relationship instead of creating duplicate purchase or entitlement history.'] },
      { heading: 'Store visibility is separate', paragraphs: ['A creator or administrator can remove an Item from public sale while preserving buyer history. Access still depends on the Item, your current entitlement, and any refund, reversal, dispute, or legal restriction.'] },
    ],
    actions: [{ label: 'Open Library', href: '/library' }],
  },
  {
    slug: 'play-music-and-radio',
    title: 'Play Music and listen to 44 Radio',
    description: 'How on-demand playback and the shared Radio stream differ.',
    category: 'browse-library',
    keywords: ['play', 'audio', 'music', 'player', 'radio', 'now playing', 'queue', 'sound'],
    sections: [
      { heading: 'On-demand Music', paragraphs: ['Use Play on a supported Music Item to start the shared 44OS player. The player continues across normal page navigation and shows the current track and creator.'] },
      { heading: '44 Radio', paragraphs: ['Radio is a shared live station. Listeners join the same playlist position rather than starting the current track from the beginning. Stream and Stop control the Radio session.'] },
      { heading: 'Playback troubleshooting', bullets: ['Confirm the device is not muted and another app is not taking audio control.', 'Tap Play again after the browser requires a user gesture.', 'Refresh after a network interruption.', 'If one track fails repeatedly, include the Item URL, track name, device, and browser when contacting Support.'] },
    ],
    actions: [{ label: 'Open Radio', href: '/radio' }, { label: 'Browse Music', href: '/store/music' }],
  },
  {
    slug: 'read-books-and-use-bookmarks',
    title: 'Read Books and use bookmarks',
    description: 'Book samples, Library reading, progress, appearance, and bookmarks.',
    category: 'browse-library',
    keywords: ['book', 'reader', 'pdf', 'sample', 'bookmark', 'reading progress', 'pages'],
    sections: [
      { heading: 'Samples and full Books', paragraphs: ['A Store Book may include a limited public PDF sample. The protected full PDF is available through Library only when your account has active read access.'] },
      { heading: 'Reading tools', paragraphs: ['The reader supports page navigation, zoom, scrolling, appearance controls, and bookmarks. Reading progress and bookmarks synchronize to your account where supported.'] },
      { heading: 'Download access', paragraphs: ['If a paid or free Book includes a downloadable file and your account has an active download entitlement, Download appears beside Read in Library. A refund or reversal removes purchase-only download access.'] },
    ],
    actions: [{ label: 'Browse Books', href: '/store/books' }, { label: 'Open Library', href: '/library' }],
  },
  {
    slug: 'download-sample-packs-and-files',
    title: 'Download Sample Packs and other files',
    description: 'Where protected downloads appear and why a Download action may be missing.',
    category: 'browse-library',
    keywords: ['download', 'zip', 'sample pack', 'audio file', 'book file', 'music file', 'missing button'],
    sections: [
      { heading: 'Where to download', paragraphs: ['Open the acquired Item in Library. Sample Packs use a primary Download action. Eligible Music and Books show Download beside Play or Read and may list individual files below. Orders can also link you to the downloadable Library Item.'] },
      { heading: 'Why Download may not appear', bullets: ['The Item does not include a downloadable file.', 'Payment has not been verified.', 'The entitlement was refunded, reversed, revoked, or disputed.', 'You are signed into a different account.', 'The creator offers streaming, reading, or previews without a full download.'] },
      { heading: 'Protected links', paragraphs: ['44OS creates short-lived authorized links for private files. Do not share them. If a link expires, return to Library and request the file again.'] },
    ],
    actions: [{ label: 'Open Library', href: '/library' }, { label: 'Open Orders', href: '/orders' }],
  },
  {
    slug: 'what-happens-when-you-order',
    title: 'What happens when you place an order?',
    description: 'From Cart and Stripe Checkout to verified Orders, Library access, and receipts.',
    category: 'orders-payments',
    keywords: ['order', 'checkout', 'cart', 'stripe', 'payment', 'receipt', 'pending', 'complete'],
    popular: true,
    sections: [
      { heading: 'Before payment', paragraphs: ['Cart shows the selected Item or offer. Checkout confirms current availability, price, tax, shipping where applicable, and the policy version you accept. Paid checkout requires a signed-in account so 44OS can attach the order and access to the correct Member.'] },
      { heading: 'Payment verification', paragraphs: ['Stripe hosts the card-entry step. Returning to 44OS does not by itself prove payment. 44OS waits for signed provider evidence before marking the order paid or granting purchase access.'] },
      { heading: 'After a verified payment', bullets: ['The order appears in Orders.', 'Eligible digital work appears in Library.', 'Applicable access or download entitlements become active.', 'A purchase confirmation email is queued.', 'Physical merchandise enters the reviewed fulfillment flow.'] },
      { heading: 'If the status is delayed', paragraphs: ['Do not pay again immediately. Refresh Orders after a short wait. If Stripe shows a charge but 44OS still has no order, contact Support with the account email, approximate time, amount, and Item—but never send full card details.'] },
    ],
    actions: [{ label: 'Open Orders', href: '/orders' }, { label: 'Open Cart', href: '/cart' }],
  },
  {
    slug: 'payment-failed-pending-or-duplicated',
    title: 'Payment failed, is pending, or looks duplicated',
    description: 'What to check before retrying and what evidence Support needs.',
    category: 'orders-payments',
    keywords: ['failed card', 'declined', 'pending', 'duplicate', 'charged twice', 'payment issue', 'stripe'],
    sections: [
      { heading: 'Failed or declined', paragraphs: ['Stripe and your card issuer decide whether a payment method is accepted. Confirm billing details, available funds, and any issuer security prompt. 44OS cannot see or change your full card number.'] },
      { heading: 'Pending', paragraphs: ['A payment can take a short time to reach a final provider state. Check Orders before trying again. A browser redirect, screenshot, or email alone is not the platform’s payment authority.'] },
      { heading: 'Possible duplicate', steps: ['Do not place another order.', 'Compare the amount and time in your bank or Stripe receipt.', 'Check whether Orders shows one or more order numbers.', 'Contact Support with the order numbers, amount, time, and last four digits only if needed. Never send the full card number or security code.'] },
    ],
    actions: [{ label: 'Open Orders', href: '/orders' }, { label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20payment%20issue' }],
  },
  {
    slug: 'receipts-taxes-and-order-history',
    title: 'Receipts, taxes, and order history',
    description: 'Where to find authoritative totals and what 44OS preserves.',
    category: 'orders-payments',
    keywords: ['receipt', 'invoice', 'tax', 'total', 'order history', 'email'],
    sections: [
      { heading: 'Orders', paragraphs: ['Orders is the durable purchase-history view for your signed-in account. It shows the order date, status, Items, fulfillment facts where relevant, and authoritative total.'] },
      { heading: 'Receipts and tax', paragraphs: ['Stripe may email a payment receipt. Applicable tax and shipping are disclosed before payment and preserved with the order. Your bank statement description and posting time may differ from the 44OS order display.'] },
      { heading: 'History after a refund', paragraphs: ['Refunding an order does not erase it. 44OS preserves transaction and accepted-terms history while revoking access that depended on the refunded payment.'] },
    ],
    actions: [{ label: 'Open Orders', href: '/orders' }],
  },
  {
    slug: 'request-a-refund-or-cancellation',
    title: 'Request a refund or cancellation',
    description: 'How digital and physical requests are reviewed and what happens to access.',
    category: 'orders-payments',
    keywords: ['refund', 'cancel', 'return', 'money back', 'digital refund', 'reversal'],
    popular: true,
    sections: [
      { heading: 'Contact Support promptly', paragraphs: ['Email support@44os.com with your account email, order number, Item, and reason for the request. Do not send payment-card details. Eligibility depends on the Item, delivery or fulfillment status, purchase terms, circumstances, and applicable law.'] },
      { heading: 'Digital Items', paragraphs: ['Digital access may already have been delivered or used, so cancellation is not guaranteed. If a refund is approved or the payment is reversed, purchase-only download access is revoked while order and Library history remain.'] },
      { heading: 'Physical merchandise', paragraphs: ['Contact Support as soon as possible. Cancellation may no longer be possible after Printful begins production. For incorrect, damaged, defective, missing, or undelivered merchandise, include the order number and clear evidence that helps the fulfillment review.'] },
      { heading: 'Refund timing', paragraphs: ['Approved refunds are returned to the original payment method where possible. Stripe and the card issuer control how long the credit takes to appear. Nothing in this process limits a non-waivable consumer right.'] },
    ],
    actions: [{ label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20refund%20or%20cancellation' }, { label: 'Read Terms', href: '/legal/terms' }],
  },
  {
    slug: 'digital-access-after-refund',
    title: 'What happens to digital access after a refund?',
    description: 'Why the order remains visible while purchase-only access changes.',
    category: 'orders-payments',
    keywords: ['refund download removed', 'revoked', 'entitlement', 'library history', 'order history'],
    sections: [
      { heading: 'Access follows current entitlement state', paragraphs: ['A verified purchase can grant streaming, reading, or download access. A full refund, reversal, dispute, fraud finding, or legal restriction can revoke the access that depended on that payment.'] },
      { heading: 'History remains', paragraphs: ['Orders keeps the refunded transaction. Library may preserve the historical relationship, but purchase-only Download disappears. This prevents a historical receipt from being mistaken for an active entitlement.'] },
      { heading: 'Free access can be separate', paragraphs: ['If the creator also offers a genuinely free save, preview, or file, that separate access may remain. 44OS does not restore a refunded paid entitlement merely to show a button.'] },
    ],
    actions: [{ label: 'Open Orders', href: '/orders' }, { label: 'Open Library', href: '/library' }],
  },
  {
    slug: 'buying-merch',
    title: 'Buying 44OS Merch',
    description: 'Product variants, U.S. checkout, Printful fulfillment, and order status.',
    category: 'merch-shipping',
    keywords: ['merch', 'shirt', 'hoodie', 'hat', 'beanie', 'bag', 'printful', 'size', 'color'],
    sections: [
      { heading: 'Choose carefully', paragraphs: ['Select the available size, color, or other variant before adding Merch to Cart. Review the product presentation and delivery address before payment. Product appearance can vary slightly from on-screen images.'] },
      { heading: 'Launch scope', paragraphs: ['Launch merchandise is sold by forty four, fulfilled by Printful, and limited to supported United States delivery addresses. Creator-owned physical selling is not active in this version.'] },
      { heading: 'Fulfillment truth', paragraphs: ['Payment and fulfillment are separate provider-backed stages. A paid order does not mean the package has shipped. Tracking appears only after Printful supplies it. 44OS does not automatically confirm provider orders through an unreviewed client action.'] },
    ],
    actions: [{ label: 'Browse Merch', href: '/store/merch' }, { label: 'Open Orders', href: '/orders' }],
  },
  {
    slug: 'merch-shipping-and-delivery',
    title: 'Merch shipping and delivery',
    description: 'Current U.S. shipping price, estimate, tracking, and delay choices.',
    category: 'merch-shipping',
    keywords: ['shipping', 'delivery', 'tracking', '5 10 days', '14.99', 'address', 'delay'],
    popular: true,
    sections: [
      { heading: 'Current launch shipping', paragraphs: ['The launch method is Standard Shipping for $14.99 USD to supported United States addresses, with an estimated 5–10 business-day delivery window. Checkout displays the active shipping charge and terms before payment.'] },
      { heading: 'Estimates and tracking', paragraphs: ['Production time, carrier conditions, address issues, and provider availability can affect timing. An order entering fulfillment is not a guarantee of a particular delivery date. Tracking appears in Orders after the provider supplies it.'] },
      { heading: 'If shipment is delayed', paragraphs: ['If 44OS cannot ship within the time represented for the order, you will be notified and offered the choice required by applicable law: agree to the delay or cancel the unshipped order for a prompt full refund.'] },
      { heading: 'Address problems', paragraphs: ['Enter a complete deliverable address. Contact Support immediately if you notice an error; a change may not be possible after production or shipping begins.'] },
    ],
    actions: [{ label: 'Open Orders', href: '/orders' }, { label: 'Read Terms', href: '/legal/terms' }],
  },
  {
    slug: 'damaged-wrong-missing-merch',
    title: 'Merch is damaged, wrong, missing, or undelivered',
    description: 'What to send Support so a physical order can be investigated.',
    category: 'merch-shipping',
    keywords: ['damaged', 'wrong item', 'defective', 'missing package', 'not delivered', 'return'],
    sections: [
      { heading: 'Report the issue', steps: ['Email Support from the address on your 44OS account.', 'Include the 44OS order number and affected Item.', 'Describe what arrived or what the tracking shows.', 'For damage, defects, or the wrong Item, attach clear photos of the product and packaging when available.'] },
      { heading: 'Keep the Item and packaging', paragraphs: ['Do not discard or ship anything until Support gives instructions. The fulfillment provider may need evidence or a specific return process.'] },
      { heading: 'Review and remedy', paragraphs: ['44OS will compare the order, provider, and tracking evidence. The appropriate remedy may be replacement, return instructions, cancellation, or refund depending on the facts and applicable law.'] },
    ],
    actions: [{ label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20merch%20order%20issue' }],
  },
  {
    slug: 'community-posts-questions-collaboration',
    title: 'Posts, Questions, and Collaboration',
    description: 'Choose the right Community space and take part constructively.',
    category: 'community-messages',
    keywords: ['community', 'post', 'question', 'collaboration', 'reply', 'comment', 'like'],
    sections: [
      { heading: 'Community posts', paragraphs: ['Use the main Community feed for general posts from Members and Creators. Open a post to read or add replies, and use Following to narrow the feed where available.'] },
      { heading: 'Questions', paragraphs: ['Use Questions for practical requests where answers can help more than one person. Include enough context for someone to respond without exposing private information.'] },
      { heading: 'Collaboration', paragraphs: ['Use Collaboration to find people for creative work. Be clear about the role, format, timing, location or remote expectations, and whether compensation is involved. 44OS does not verify private arrangements between users.'] },
      { heading: 'Community conduct', paragraphs: ['Do not harass, threaten, impersonate, spam, manipulate engagement, publish unlawful material, or violate another person’s rights. Report serious concerns to Support.'] },
    ],
    actions: [{ label: 'Open Community', href: '/community' }, { label: 'Open Questions', href: '/community/questions' }, { label: 'Open Collaboration', href: '/community/collaboration' }],
  },
  {
    slug: 'follow-creators-and-use-inbox',
    title: 'Follow people and use Inbox',
    description: 'Profiles, follows, direct conversations, and message safety.',
    category: 'community-messages',
    keywords: ['follow', 'creator profile', 'inbox', 'messages', 'conversation', 'dm', 'block'],
    sections: [
      { heading: 'Profiles and follows', paragraphs: ['Creator profiles connect public work, posts, events, and approved external links. Follow people whose work you want to revisit.'] },
      { heading: 'Inbox', paragraphs: ['Open Inbox from the account menu. Choose an existing conversation or start a new message by searching for a display name or username. Conversations are visible only to their participants under the platform’s access rules.'] },
      { heading: 'Message safely', bullets: ['Do not send passwords, recovery links, payment-card details, tax documents, or other sensitive records.', 'Be cautious with off-platform payment or file requests.', 'Keep evidence of harassment, fraud, or threats and report them to Support.', 'For immediate danger, contact the appropriate local authority.'] },
    ],
    actions: [{ label: 'Open Inbox', href: '/inbox' }, { label: 'Open Community', href: '/community' }],
  },
  {
    slug: 'notifications-and-creator-updates',
    title: 'Notifications and Creator Updates',
    description: 'Where account activity and release updates appear.',
    category: 'community-messages',
    keywords: ['notifications', 'bell', 'updates', 'creator updates', 'release notes'],
    sections: [
      { heading: 'Notifications', paragraphs: ['The bell opens account notifications for supported activity. Settings contains available notification preferences. Transactional account, security, purchase, and fulfillment messages may still be necessary even when optional messages are off.'] },
      { heading: 'Creator Updates', paragraphs: ['Creator Updates are release notes or project updates attached to a creator’s work. They help fans understand what changed without altering the permanent Item identity or purchase history.'] },
      { heading: 'Missing activity', paragraphs: ['Refresh the page and confirm you are signed into the correct account. Not every action creates a notification, and email delivery is separate from in-app notifications.'] },
    ],
    actions: [{ label: 'Open Notifications', href: '/notifications' }, { label: 'Open Settings', href: '/settings' }],
  },
  {
    slug: 'become-a-creator',
    title: 'Become a Creator on 44OS',
    description: 'How Creator promotion, eligibility, paperwork, and selling access work.',
    category: 'creators-studio',
    keywords: ['creator account', 'artist', 'promotion', 'approved', 'paperwork', 'tax', 'wise', '30 days'],
    popular: true,
    sections: [
      { heading: 'Creator access is approved', paragraphs: ['Anyone can create a Member account, but only a 44OS administrator can promote a Member to Creator. Promotion is based on direct review and is not available through a public self-approval form.'] },
      { heading: 'Publishing and paid selling are separate', paragraphs: ['Creator tools, publication, paid-sale eligibility, tax review, and payout readiness are distinct controls. An approved Creator may be able to publish while additional seller information is still due.'] },
      { heading: 'Paperwork follow-up', paragraphs: ['44OS handles current Creator documentation one-on-one. If you receive a written deadline, complete the requested documentation within that window. An administrator may manually pause affected paid offers or move Items out of public sale if requirements remain unresolved; approval and reinstatement are also manual.'] },
      { heading: 'Payout information', paragraphs: ['44OS does not ask Creators to store bank-account details in the app. Where approved, a Wise email-to-claim destination and applicable tax information are reviewed separately from the buyer’s Stripe payment.'] },
    ],
    actions: [{ label: 'Open Studio', href: '/studio' }, { label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20Creator%20access' }],
  },
  {
    slug: 'publish-and-manage-items',
    title: 'Publish and manage Items in Studio',
    description: 'Supported formats, drafts, publishing, editing, and archival.',
    category: 'creators-studio',
    keywords: ['studio', 'publish', 'upload', 'music', 'book', 'sample pack', 'draft', 'archive', 'remove'],
    sections: [
      { heading: 'Supported creator formats', paragraphs: ['Approved Creators can manage Music, Books, Sample Packs, Events, and Creator Updates in Studio. Creator Merch and licensed Beats remain outside the active creator-selling scope unless separately approved.'] },
      { heading: 'Prepare the Item', bullets: ['Use accurate title, creator, year, artwork, description where supported, and taxonomy.', 'Upload only files you own or have permission to distribute.', 'For Books, provide the protected full PDF.', 'For Sample Packs, provide the protected ZIP and optional public audio previews.', 'Set only prices and availability you are authorized to offer.'] },
      { heading: 'Save, publish, or remove', paragraphs: ['Publication makes an eligible Item public. Studio forms preserve in-progress values on the current device during common refresh or app-switch interruptions. Remove is archival rather than destructive deletion: Store visibility ends while permanent IDs, buyer history, entitlements, and audit records are preserved as required.'] },
    ],
    actions: [{ label: 'Open Studio', href: '/studio' }],
  },
  {
    slug: 'creator-pricing-sales-and-payouts',
    title: 'Creator pricing, sales, earnings, and payouts',
    description: 'How creator-set prices relate to verified sales and reviewed payouts.',
    category: 'creators-studio',
    keywords: ['price', 'pricing', 'sales', 'sold', 'earnings', 'payout', 'wise', 'stripe', 'fee'],
    sections: [
      { heading: 'Pricing', paragraphs: ['Eligible Creators set prices for supported digital offers in Studio. A visible price does not override seller eligibility, Item publication, active offer state, or platform and provider controls.'] },
      { heading: 'Verified sales', paragraphs: ['A sale counts only after signed Stripe evidence is processed. Browser redirects and client-side success screens are not accounting authority. Refunds and processor fees are recorded as separate ledger facts rather than rewriting the original sale.'] },
      { heading: 'Earnings and payouts', paragraphs: ['Studio can show verified activity and earnings state. Accrued, pending, or under-review amounts are not a promise that a payout has completed. Payout readiness requires separate administrator, tax, and Wise destination review, and approved payouts are recorded independently.'] },
      { heading: 'Questions about a sale', paragraphs: ['Send Support the Item, approximate purchase time, and any visible order or earnings reference. Do not ask the buyer to send card details or attempt to settle a discrepancy outside the platform record.'] },
    ],
    actions: [{ label: 'Open Payouts', href: '/studio/payouts' }, { label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20Creator%20sale' }],
  },
  {
    slug: 'creator-rights-and-copyright',
    title: 'Creator rights and copyright responsibility',
    description: 'What you must own or license before publishing through 44OS.',
    category: 'creators-studio',
    keywords: ['copyright', 'rights', 'license', 'permission', 'samples', 'artwork', 'takedown'],
    sections: [
      { heading: 'Publish only authorized work', paragraphs: ['You must own the submitted work or hold every permission needed to publish, stream, reproduce, display, distribute, sell, and license it through the features you enable. This includes recordings, compositions, writing, artwork, samples, names, and metadata.'] },
      { heading: 'Acknowledgement is not verification', paragraphs: ['44OS records a versioned rights acknowledgement when a Creator publishes. That record does not mean 44OS independently cleared the work.'] },
      { heading: 'Rights reports', paragraphs: ['44OS may hide or restrict reported material while reviewing it, notify the Creator, preserve audit history, and act on repeat infringement. Use the Copyright and Takedowns process for a rights claim.'] },
    ],
    actions: [{ label: 'Copyright & Takedowns', href: '/legal/copyright' }],
  },
  {
    slug: 'events-and-release-updates',
    title: 'Create Events and release updates',
    description: 'Publish accurate event details and keep fans informed about evolving work.',
    category: 'creators-studio',
    keywords: ['event', 'calendar', 'release update', 'creator update', 'timezone', 'ticket'],
    sections: [
      { heading: 'Events', paragraphs: ['Creators can add in-person, online, or hybrid Events with timezone-aware start and optional end times. Required location and destination fields depend on the format. 44OS does not sell or fulfill event tickets.'] },
      { heading: 'Calendar', paragraphs: ['Calendar aggregates approved public Events and supported upcoming release dates from their source records. Adding an Event does not silently publish or change an Item.'] },
      { heading: 'Creator Updates', paragraphs: ['Use an update for release notes, progress, bonus context, or a meaningful change to existing work. Updates should not be used to replace required Item metadata or misrepresent publication and availability.'] },
    ],
    actions: [{ label: 'Open Studio', href: '/studio' }, { label: 'Open Calendar', href: '/calendar' }],
  },
  {
    slug: 'protect-your-account',
    title: 'Protect your account and recognize suspicious requests',
    description: 'Practical security steps for Members and Creators.',
    category: 'safety-policies',
    keywords: ['security', 'hacked', 'phishing', 'scam', 'password', 'suspicious email', 'card'],
    popular: true,
    sections: [
      { heading: 'Keep credentials private', bullets: ['Use a strong, unique password.', 'Never send a password, one-time link, confirmation link, recovery link, or full card details.', 'Review the destination before entering credentials.', 'Sign out of shared devices and protect access to your email account.'] },
      { heading: '44OS and payment details', paragraphs: ['Stripe hosts card entry. 44OS Support does not need your full card number or security code. For a payment investigation, the account email, order number, amount, time, and sometimes the last four digits are enough.'] },
      { heading: 'If you suspect compromise', steps: ['Change your 44OS password from a trusted device.', 'Secure the connected email account.', 'Review Orders, profile changes, and recent activity.', 'Contact Support with a concise timeline.'] },
    ],
    actions: [{ label: 'Reset password', href: '/account/recovery' }, { label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20account%20security' }],
  },
  {
    slug: 'report-content-conduct-or-abuse',
    title: 'Report content, conduct, fraud, or abuse',
    description: 'How to send a useful safety report without exposing sensitive information.',
    category: 'safety-policies',
    keywords: ['report', 'abuse', 'harassment', 'fraud', 'spam', 'threat', 'impersonation', 'moderation'],
    sections: [
      { heading: 'What to include', bullets: ['Your 44OS account email.', 'The exact profile, post, Item, message, or order URL.', 'A factual description and approximate time.', 'Screenshots or other evidence when safe and relevant.'] },
      { heading: 'Do not include', paragraphs: ['Do not email passwords, authentication links, full card information, tax documents, government ID, or unrelated private conversations. Support will request a safer channel if additional sensitive evidence is genuinely needed.'] },
      { heading: 'How 44OS responds', paragraphs: ['44OS may preserve evidence, restrict content or accounts, contact involved users, review provider records, or refer a matter when appropriate. A report does not guarantee a particular outcome or disclosure of another user’s private information.'] },
      { heading: 'Immediate danger', paragraphs: ['If someone is in immediate danger, contact the appropriate local emergency service first. 44OS Support is not an emergency service.'] },
    ],
    actions: [{ label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20safety%20report' }, { label: 'Read Terms', href: '/legal/terms' }],
  },
  {
    slug: 'report-copyright-infringement',
    title: 'Report copyright infringement',
    description: 'Information to include in a copyright notice or creator response.',
    category: 'safety-policies',
    keywords: ['copyright', 'dmca', 'infringement', 'takedown', 'rights holder', 'counter notice'],
    sections: [
      { heading: 'Send a copyright notice', paragraphs: ['Email support@44os.com with the subject “Copyright notice.” Include your contact information, the protected work, the exact 44OS URL or enough information to locate the material, the required good-faith and accuracy statements, your authority to act, and a physical or electronic signature.'] },
      { heading: 'Creator response', paragraphs: ['A Creator may respond through the same monitored address with identification of the material, evidence of ownership, permission, or lawful use, contact information, and any statements or consent required by applicable law.'] },
      { heading: 'Use care', paragraphs: ['False or abusive reports or responses may create legal liability. Read the complete Copyright and Takedowns policy before sending a notice.'] },
    ],
    actions: [{ label: 'Read Copyright policy', href: '/legal/copyright' }, { label: 'Email Copyright notice', href: 'mailto:support@44os.com?subject=Copyright%20notice' }],
  },
  {
    slug: 'privacy-requests-and-account-data',
    title: 'Privacy requests and account data',
    description: 'How to request access, correction, deletion, or another privacy review.',
    category: 'safety-policies',
    keywords: ['privacy', 'data request', 'delete account', 'access data', 'correction', 'personal information'],
    sections: [
      { heading: 'Your choices', paragraphs: ['You can update available profile and preference information in Settings. Depending on where you live, you may also have rights to request access, correction, deletion, portability, restriction, objection, or an appeal.'] },
      { heading: 'Make a request', paragraphs: ['Email support@44os.com from the account address when possible. State the request clearly. 44OS may need to verify identity before disclosing or changing account information.'] },
      { heading: 'Records that may remain', paragraphs: ['Privacy rights can be limited by law and by the need to preserve purchases, entitlements, tax records, security evidence, moderation history, provider facts, accounting records, or legal claims. Read the Privacy Policy for the full explanation.'] },
    ],
    actions: [{ label: 'Read Privacy Policy', href: '/legal/privacy' }, { label: 'Email Privacy request', href: 'mailto:support@44os.com?subject=44OS%20privacy%20request' }],
  },
  {
    slug: 'contact-44os-support',
    title: 'Contact 44OS Support',
    description: 'Send a useful request to the monitored support mailbox.',
    category: 'safety-policies',
    keywords: ['contact', 'help', 'support email', 'customer service', 'case', 'ticket'],
    popular: true,
    sections: [
      { heading: 'Before contacting us', paragraphs: ['Search this Help Center and check the relevant account, Order, Library, or Studio page. If the issue remains, send one concise email to support@44os.com.'] },
      { heading: 'Include useful context', bullets: ['Your 44OS account email.', 'The page URL and affected Item, profile, conversation, or order.', 'What you did, what you expected, and what happened.', 'The approximate time, device, and browser.', 'A screenshot when it does not expose sensitive information.'] },
      { heading: 'Keep sensitive information out of email', paragraphs: ['Never send your password, authentication or recovery links, full payment-card number, card security code, tax documents, or government ID. Support will not ask for those in an ordinary email.'] },
      { heading: 'Current contact channel', paragraphs: ['The monitored mailbox is the active support channel. The in-app support intake and newsletter synchronization controls remain off unless 44OS separately reviews and enables them.'] },
    ],
    actions: [{ label: 'Email Support', href: 'mailto:support@44os.com?subject=44OS%20support%20request' }],
  },
];

export function supportArticleHref(article: Pick<SupportArticle, 'slug'>) {
  return `/support/${article.slug}`;
}

export function getSupportArticle(slug: string) {
  return SUPPORT_ARTICLES.find(article => article.slug === slug) ?? null;
}

export function getSupportCategory(category: SupportCategoryId) {
  return SUPPORT_CATEGORIES.find(entry => entry.id === category) ?? null;
}

export function searchSupportArticles(query: string, limit = SUPPORT_ARTICLES.length) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return SUPPORT_ARTICLES.slice(0, limit);

  return SUPPORT_ARTICLES
    .map(article => {
      const title = article.title.toLowerCase();
      const description = article.description.toLowerCase();
      const category = getSupportCategory(article.category)?.title.toLowerCase() ?? '';
      const keywords = article.keywords.join(' ').toLowerCase();
      const body = article.sections.flatMap(section => [
        section.heading,
        ...(section.paragraphs ?? []),
        ...(section.steps ?? []),
        ...(section.bullets ?? []),
      ]).join(' ').toLowerCase();
      const score = terms.reduce((total, term) => total
        + (title.includes(term) ? 8 : 0)
        + (description.includes(term) ? 5 : 0)
        + (keywords.includes(term) ? 4 : 0)
        + (category.includes(term) ? 2 : 0)
        + (body.includes(term) ? 1 : 0), 0);
      return { article, score, matchesEveryTerm: terms.every(term => `${title} ${description} ${keywords} ${category} ${body}`.includes(term)) };
    })
    .filter(result => result.score > 0 && result.matchesEveryTerm)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .slice(0, limit)
    .map(result => result.article);
}
