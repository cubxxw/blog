// Artwork, mount and close-view camera share one metre-scale anchor.
export const JIANGNAN_ARTWORK = Object.freeze({
  id: 'paul-klee-main-path-and-byways-1929',
  title: '主路与支路', englishTitle: 'Main Path and Byways',
  artist: 'Paul Klee', year: 1929,
  image: '/images/space/art/paul-klee-main-path-and-byways-1929.jpg',
  source: 'https://geheimnis-der-bilder.zdf.de/museum-ludwig/paul-klee-hauptweg-und-nebenwege.html',
  position: Object.freeze([3.15, 1.62, -1.10]),
  width: .70, height: .83, imageWidth: .54, imageHeight: .67, border: .015
});

export function jiangnanArtworkView(aspect = 1) {
  const distance = 1.73, safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  // Widen the vertical lens on narrow screens without entering the desk or chair.
  const fov = Math.max(42, 2 * Math.atan(JIANGNAN_ARTWORK.width / (2 * distance * safeAspect * .76)) * 180 / Math.PI);
  return {position: [JIANGNAN_ARTWORK.position[0] - distance, 1.72, JIANGNAN_ARTWORK.position[2]],
    target: [JIANGNAN_ARTWORK.position[0], 1.72, JIANGNAN_ARTWORK.position[2]], fov};
}
