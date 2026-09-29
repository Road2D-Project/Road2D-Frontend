const https = require('https');
const fs = require('fs');

const urls = [
  'https://cdn.myanimelist.net/images/characters/16/512998.jpg',
  'https://cdn.myanimelist.net/images/characters/11/308347.jpg',
  'https://cdn.myanimelist.net/images/characters/4/308335.jpg',
  'https://cdn.myanimelist.net/images/characters/3/146129.jpg',
  'https://cdn.myanimelist.net/images/characters/14/146141.jpg',
  'https://cdn.myanimelist.net/images/characters/12/238943.jpg',
  'https://cdn.myanimelist.net/images/characters/15/146211.jpg',
  'https://cdn.myanimelist.net/images/characters/5/146209.jpg',
  'https://cdn.myanimelist.net/images/characters/6/146131.jpg',
  'https://cdn.myanimelist.net/images/characters/12/268105.jpg'
];

async function downloadBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(`data:image/jpeg;base64,${buffer.toString('base64')}`);
      });
    }).on('error', reject);
  });
}

async function run() {
  const result = [];
  for (const url of urls) {
    try {
      const b64 = await downloadBase64(url);
      result.push(b64);
      console.log('Downloaded', url);
    } catch (e) {
      console.error(e);
      result.push('');
    }
  }
  fs.writeFileSync('src/data/avatarsBase64.json', JSON.stringify(result, null, 2));
}

run();
