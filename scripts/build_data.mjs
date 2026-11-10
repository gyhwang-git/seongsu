// data/*.geojson → 지도 페이지가 읽는 data/seongsu_data.js (file:// 로 열어도 동작하도록 스크립트로 감쌈)
// 사용: node scripts/build_data.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (f) => JSON.parse(await fs.readFile(path.join(projectDir, 'data', f), 'utf8'));
const bldg = await read('seongsu_buildings.geojson');
const dong = await read('seongsu_dong.geojson');

// 페이지에서 쓰는 속성만 짧은 키로 남긴다
const features = bldg.features.map((f) => {
  const p = f.properties;
  return { type: 'Feature', properties: { d: p.dong, y: p.year, day: p.useapr_day, u: p.usability, n: p.bld_nm || p.dong_nm || null, f: p.grnd_flr, b: p.ugrnd_flr, a: Math.round(p.totalarea) }, geometry: f.geometry };
});

const js = `// 자동 생성: node scripts/build_data.mjs\nwindow.SEONGSU = ${JSON.stringify({ source: bldg.source, dong, buildings: { type: 'FeatureCollection', features } })};\n`;
await fs.writeFile(path.join(projectDir, 'data', 'seongsu_data.js'), js, 'utf8');
console.log('data/seongsu_data.js', (js.length / 1e6).toFixed(2) + 'MB', features.length + '동');
