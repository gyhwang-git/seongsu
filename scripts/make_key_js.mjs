// .env 의 V-WORLD_KEY 로 브라우저용 vworld_key.js 를 만든다(.gitignore 대상, 커밋 금지).
// 사용: node scripts/make_key_js.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { projectDir, loadKey } from './vworld.mjs';

const key = await loadKey();
await fs.writeFile(path.join(projectDir, 'vworld_key.js'), `window.VWORLD_KEY = ${JSON.stringify(key)};\n`, 'utf8');
console.log('vworld_key.js 생성 완료');

// 배경지도 타일 확인(성수동 부근 z15)
for (const [layer, ext] of [['Base', 'png'], ['white', 'png'], ['gray', 'png'], ['midnight', 'png'], ['Satellite', 'jpeg']]) {
  const r = await fetch(`https://api.vworld.kr/req/wmts/1.0.0/${key}/${layer}/15/12697/27946.${ext}`, { headers: { Referer: 'http://localhost:8000/' } });
  const type = r.headers.get('content-type') || '';
  const body = await r.arrayBuffer();
  console.log(layer, r.status, type, type.includes('xml') ? Buffer.from(body).toString('utf8').replaceAll(key, '***').slice(0, 200) : body.byteLength + 'B');
}
