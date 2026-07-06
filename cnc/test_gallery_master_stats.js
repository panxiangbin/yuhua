global.window = {};
require('./gallery-library-master.js');

const gallery = window.CNC_GALLERY_MASTER || [];
console.log('Total images:', gallery.length);

let mappedCount = 0;
const categoryCount = {};
const categoryImages = {};

gallery.forEach(img => {
  if (img.mappedCount > 0 || (img.mappedEntries && img.mappedEntries.length > 0)) {
    mappedCount++;
  }
  
  const cat = img.category || '其他';
  categoryCount[cat] = (categoryCount[cat] || 0) + (img.mappedCount || 0);
  if (!categoryImages[cat]) categoryImages[cat] = [];
  categoryImages[cat].push(img);
});

console.log('Images with mappedCount > 0:', mappedCount);
console.log('Category distribution of mapped counts:', categoryCount);

// Let's sort images in each category by mappedCount to find Top 3
Object.keys(categoryImages).forEach(cat => {
  const imgs = categoryImages[cat];
  imgs.sort((a, b) => (b.mappedCount || 0) - (a.mappedCount || 0));
  console.log(`Category: ${cat}`);
  console.log('  Top 3:', imgs.slice(0, 3).map(img => `${img.id} (${img.mappedCount})`));
});
