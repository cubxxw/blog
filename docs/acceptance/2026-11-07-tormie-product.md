# Tormie in the blog product catalog

Date: November 7, 2026, Asia/Singapore. Owner request: add Tormie to the product section of cubxxw.com.

The shared bilingual catalog now includes Tormie after Leafhour. Its status is TestFlight beta, as clarified by the owner and described on the live product website. The card links to the public website; the product directory also offers its clearly synthetic on-page demonstration. Originals, transcripts and interpretations remain distinct in the copy. An application is not an immediate invitation, and no public App Store release is claimed.

The source repository is currently private, so no inaccessible source link is published. The two existing static card renderers now conditionally show source links when present; public-source products retain their original destinations. The existing OS renderer already handles a missing source URL. Homepage layout, capri’s featured status, BEAR OS as the default and the bidirectional Product Lab switch are preserved.

The image is a fresh browser capture of the real https://tormie.com/ homepage, not generated artwork standing in for a screenshot. Its JPEG is about 84 KB and the homepage continues to generate responsive WebP variants through the existing image pipeline. The same source capture serves both locales, with localized alt text.

## Source verification

- Hugo 0.145.0 extended production build passed for both languages.
- Product integration checks passed across Projects, homepage and About in both languages; the real image is present and below the existing 180 KB limit.
- Type checking passed; OS project-index tests passed 4/4; whitespace checks passed.
- Browser inspection confirmed nine homepage products, loaded Tormie imagery, the TestFlight label, the correct public destination and no Tormie GitHub link. English and Chinese entries were read back. The existing dark-theme toggle and an actual 351 CSS-pixel narrow layout retained the card without horizontal overflow.
- Independent read-only review found no P1/P2. Two stale Product Lab heading sentinels were reconciled to headings already present in the unchanged HEAD template; the current layout/title was not rewritten to satisfy the check.

Publication follows the existing Netlify Git production builder after the source reaches main. This source-validation record is not itself proof of an online deployment; verify the published revision and live bilingual routes separately. No new article, newsletter message, product-account operation or source-repository visibility change is included.
