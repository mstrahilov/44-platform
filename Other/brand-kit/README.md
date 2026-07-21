# 44 Brand Kit

This source folder supports the private, versioned Team Brand Kit. It is not a public download directory.

The current kit is provisional. The 44 marks and 44OS icons can be used for local review, but they must not be described as final masters until the owner approves the source artwork.

## Names

- Parent company: `44`
- Operator reference: `forty four`
- Product: `44OS`

## Included source material

- Editorial palette and typography tokens in CSS and JSON.
- Editable SVG templates for 4:5 feed, square feed, and 9:16 Story or Reel work.
- Logo-use and prohibited-use notes.

The packaging script adds the current black and white 44 SVGs, 44OS raster icons, self-hosted Inter variable font files, the Inter SIL Open Font License, and a SHA-256 manifest.

Build a local review archive with:

`node scripts/build-team-brand-kit.mjs --provisional-local`

Do not upload or mark an archive current until the owner has approved the logo masters and kit contents.
