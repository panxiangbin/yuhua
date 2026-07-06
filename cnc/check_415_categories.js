global.window = {};

require('./gallery-library-master.js');
require('./knowledge-core-01.js');
require('./knowledge-core-02.js');
require('./knowledge-core-03.js');
require('./data.js');
require('./kb-extra.js');

const kb = [
  ...window.CNC_KB_CORE_CHUNK_01,
  ...window.CNC_KB_CORE_CHUNK_02,
  ...window.CNC_KB_CORE_CHUNK_03,
  ...window.CNC_DATA,
  ...window.CNC_KB_EXTRA
];

const gallery = window.CNC_GALLERY_MASTER || [];

const allEntries = new Set();
gallery.forEach(img => {
  if (img.mappedEntries) {
    img.mappedEntries.forEach(e => allEntries.add(e));
  }
});

console.log('Unique entries:', allEntries.size);

const categoryCounts = {};
allEntries.forEach(entryKey => {
  // Find in kb
  const entry = kb.find(e => e.id === entryKey || e.title === entryKey);
  const cat = entry ? entry.category : 'not_found';
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
});

console.log('Categories of the 415 unique entries:', categoryCounts);
