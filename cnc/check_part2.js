global.window = {};
require('./featured-images-part2.js');

const keys = Object.keys(window.CNC_FEATURED_IMAGES_PART2 || window.CNC_FEATURED_IMAGES || {});
console.log('Keys in featured-images-part2.js:', keys.length);
console.log('Variables defined on window:', Object.keys(window));
if (keys.length > 0) {
  console.log('Sample key:', keys[0]);
}
