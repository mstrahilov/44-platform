export type PublicReleaseSection = {
  title: string;
  items: readonly string[];
};

export type PublicRelease = {
  version: string;
  slug: string;
  publishedAt: string;
  sections: readonly PublicReleaseSection[];
};

/**
 * Public, editorial release history. Add the newest release first and reserve
 * entries for meaningful product milestones rather than individual fixes.
 */
export const PUBLIC_RELEASES: readonly PublicRelease[] = [
  {
    version: '1.1',
    slug: '1-1',
    publishedAt: '2026-07-23',
    sections: [
      {
        title: 'General',
        items: [
          '44OS 1.1 introduces a redesigned mobile experience that makes it easier to move between Home, Library, Radio, Community, and Account.',
          'A more consistent layout keeps titles, tabs, shelves, cards, and actions familiar across mobile and desktop.',
          'Release Notes now provide a simple place to see what is new in meaningful 44OS updates.',
        ],
      },
      {
        title: 'Top Bar and Search',
        items: [
          'A new top bar keeps the 44OS mark close at hand on main pages and gives detail pages a clear way back.',
          'Search now appears where it is most useful, including Home, Community, and Library.',
          'Suggestions appear as you type for people and Items, helping you open the right page more quickly.',
          'Broader searches can still be explored on the complete Search page.',
        ],
      },
      {
        title: 'Discover',
        items: [
          'Featured, Music, Books, Games, Merch, and Sample Packs tabs make it easier to explore every kind of work on 44OS.',
          'Recently Added now brings together the newest work from every category.',
          'New in Music, Books, Games, Merch, and Sample Packs shelves help you find recent releases at a glance.',
          'Each shelf now includes up to eight Items and can be explored with a simple horizontal swipe or scroll.',
          'Filters adapt to the category you are viewing and stay out of the way on Featured.',
        ],
      },
      {
        title: 'Library',
        items: [
          'The All view now organizes your collection into Music, Books, Games, and Sample Packs, making each kind of Item easier to find.',
          'Choosing a Library filter shows only that type of content for a simpler, more focused view.',
          'Games you add to your Library now appear alongside the rest of your collection and are ready to launch from their Library page.',
        ],
      },
      {
        title: 'Community',
        items: [
          'Posts can now be organized as General, Updates, Questions, Collaborations, Showcases, or Assistance, while everyone continues to share one Community feed.',
          'A refreshed design gives posts more room on mobile while keeping familiar rounded cards on desktop.',
          'Longer posts can expand in the feed, with the complete message always available on its conversation page.',
          'Authors can edit their posts, while other members can copy a link or report a concern from the post menu.',
          'Reaction totals are now private, so appreciation can be shared without turning Community into a popularity contest.',
        ],
      },
      {
        title: 'Composer and References',
        items: [
          'One composer now handles every kind of Community post, with a simple choice for the type of post you want to share.',
          'Type @ to find and mention people or published Items without leaving your message.',
          'Selecting a mention opens the corresponding profile or Item page.',
          'Item pages can now show Community posts about that work, while Library remains a private space for each member.',
        ],
      },
      {
        title: 'Conversations',
        items: [
          'Conversation pages now share the same clear design as the main Community feed.',
          'The same reply box works whether you are responding to the original post or another member.',
          'Replies stay within the conversation, with simple indentation that keeps discussions easy to follow.',
          'Clearer spacing and action placement make conversations easier to read on desktop and mobile.',
        ],
      },
      {
        title: 'Account and Studio',
        items: [
          'A dedicated Account page brings Profile, Notifications, Messages, Orders, Studio, Team, Support, and Settings together in one place.',
          'The desktop account menu now follows the same organization while keeping frequently used controls close at hand.',
          'Studio now separates new projects into Music, Books, Games, and Sample Packs.',
          'Game submissions can now be reviewed privately before they are published.',
          'MASK by ØLSTEN is now available as the first desktop-only game on 44OS and can be added to your Library for free.',
        ],
      },
      {
        title: 'Item Pages',
        items: [
          'More from the Creator makes it easier to discover other work from the same creator.',
          'Community posts that mention an Item can now appear below its reviews.',
          'Desktop games open in a focused new window, while members on mobile receive a clear message that a desktop is required.',
        ],
      },
      {
        title: 'Under the Hood',
        items: [
          'Improved title sizing on smaller screens and refined spacing throughout Discover and Community.',
          'Improved shelf alignment, section navigation, tabs, and action controls across screen sizes.',
          'Fixed an issue that could hide the reply box when responding to another member on mobile.',
          'Improved visual consistency between posts and replies.',
          'Removed desktop-style hover effects from touch controls for a more natural mobile experience.',
          'Improved account labels, icons, menu spacing, and notification presentation.',
          'Includes additional reliability, performance, and security improvements throughout 44OS.',
        ],
      },
    ],
  },
];
