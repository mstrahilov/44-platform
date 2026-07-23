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
          'Redesigned the primary mobile navigation around Home, Library, Radio, Community, and Account.',
          'Unified mobile and desktop presentation so page titles, tabs, shelves, cards, and actions follow the same layout rules.',
          'Added this public release-notes archive for meaningful 44OS updates.',
        ],
      },
      {
        title: 'Top Bar and Search',
        items: [
          'Added a route-aware mobile top bar with the 44OS mark on primary pages and a consistent Back action on detail pages.',
          'Limited global Search to the sections where it is useful and removed duplicate page-level search controls.',
          'Added live suggestions for both people and Items. Selecting an exact result opens it directly; broader queries continue to the complete results page.',
          'Matched the Search, Back, Filter, and contextual action controls in size, material, border treatment, and alignment.',
        ],
      },
      {
        title: 'Discover',
        items: [
          'Added Featured, Music, Books, Games, Merch, and Sample Packs tabs in one consistent order on mobile and desktop.',
          'Moved Recently Added to the first shelf and expanded it to include eligible Items from every category.',
          'Added dedicated New in Music, New in Books, New in Games, New in Merch, and New in Sample Packs shelves.',
          'Updated horizontal shelves to show up to eight Items while preserving the same card sizing and alignment as catalog grids.',
          'Made filters category-aware and removed the Filter action from Featured, where it did not provide a useful choice.',
        ],
      },
      {
        title: 'Community',
        items: [
          'Added General, Update, Question, Collaboration, Showcase, and Assistance post types as filters over one shared Community feed.',
          'Rebuilt mobile posts as full-width rows and retained rounded cards on desktop, using the same metadata and action layout at every size.',
          'Added long-post expansion in the feed while keeping the complete post visible on its conversation page.',
          'Added post editing for authors and Copy Link and Report actions for other members.',
          'Removed public reaction totals while preserving the ability to react to a post or reply.',
        ],
      },
      {
        title: 'Composer and References',
        items: [
          'Replaced separate posting flows with one composer and a single-select post-type control.',
          'Added inline @ suggestions for people and published Items using the same search and selection behavior.',
          'Linked people references to public profiles and Item references to public Item pages.',
          'Added a Community section to public Item pages for posts that reference that work; Library remains private to the member.',
        ],
      },
      {
        title: 'Conversations',
        items: [
          'Rebuilt conversation pages around the same post component and spacing rules used in the main Community feed.',
          'Added one reply composer for replies to the original post and replies to other members.',
          'Kept replies to replies inline with one level of visual indentation instead of opening another nested page.',
          'Added dividers, stable action placement, and consistent reply-card geometry across desktop and mobile.',
        ],
      },
      {
        title: 'Account and Studio',
        items: [
          'Added a dedicated Account destination with role-aware access to Profile, Notifications, Messages, Orders, Studio, Team, Support, and Settings.',
          'Updated the desktop account menu to match the same hierarchy without duplicating Notifications, Support, or Settings already present in the desktop shell.',
          'Separated Studio creation into Music, Books, Games, and Sample Packs.',
          'Added a private Unity WebGL package-submission workflow. Game builds require 44OS review and isolated hosting before publication.',
          'Published MASK by ØLSTEN as the first desktop-only Unity WebGL Item, with free Library access and an isolated launch runtime.',
        ],
      },
      {
        title: 'Item Pages',
        items: [
          'Renamed Similar Items to More from the Creator and adopted the same eight-card shelf used in Discover.',
          'Added referenced Community posts below Reviews on public Item pages.',
          'Prepared published desktop games to open in a focused launch window while mobile members receive a desktop-app notice.',
        ],
      },
      {
        title: 'Fixes and Polish',
        items: [
          'Fixed mobile page titles wrapping incorrectly at narrow viewport widths.',
          'Fixed shelf card alignment, missing section arrows, tab spacing, and action-button alignment across Discover and Community.',
          'Fixed the reply composer disappearing when replying to another member on mobile.',
          'Fixed reply bodies and actions using different alignment rules from root posts.',
          'Removed desktop-only hover and highlight treatments from touch interactions.',
          'Improved account labels, icon consistency, menu density, and notification-page spacing.',
        ],
      },
    ],
  },
];
