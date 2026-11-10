// 성수 4개 행정동(성수1가1동·성수1가2동·성수2가1동·성수2가3동)의 건물을 브이월드 GIS건물통합정보(LT_C_BLDGINFO)에서 내려받는다.
// 사용: node scripts/download_buildings.mjs   (상위 폴더 또는 이 폴더의 .env 에 V-WORLD_KEY 필요)
// 출력:
//   data/seongsu_dong.geojson        행정동 경계 4개 (vuski/admdongkor)
//   data/seongsu_buildings.geojson   건물 폴리곤 + 속성(사용승인일·승인연도·용도·층수·소속 행정동)
import fs from 'node:fs/promises';
import path from 'node:path';
import { projectDir, getFeatures } from './vworld.mjs';

const DATA = path.join(projectDir, 'data');
await fs.mkdir(DATA, { recursive: true });

const DONG_URL = 'https://raw.githubusercontent.com/vuski/admdongkor/master/ver20261001/HangJeongDong_ver20261001.geojson';
const DONG_NAMES = ['성수1가1동', '성수1가2동', '성수2가1동', '성수2가3동'];

// 1) 행정동 경계
const dongFile = path.join(DATA, 'seongsu_dong.geojson');
let dongs = JSON.parse(await fs.readFile(dongFile, 'utf8').catch(() => 'null'));
if (!dongs) {
  console.log('행정동 경계 내려받는 중…');
  const all = await (await fetch(DONG_URL)).json();
  const feats = all.features.filter((f) => f.properties.adm_nm?.startsWith('서울특별시 성동구') && DONG_NAMES.some((n) => f.properties.adm_nm.endsWith(n)));
  dongs = {
    type: 'FeatureCollection',
    source: '행정동 경계: vuski/admdongkor ver20261001 (통계청 행정구역 경계 기반)',
    features: feats.map((f) => ({ type: 'Feature', properties: { adm_cd: f.properties.adm_cd2 ?? f.properties.adm_cd, adm_nm: f.properties.adm_nm.split(' ').pop() }, geometry: f.geometry })),
  };
  await fs.writeFile(dongFile, JSON.stringify(dongs), 'utf8');
}
if (dongs.features.length !== 4) throw new Error('행정동 4개를 찾지 못했습니다: ' + dongs.features.map((f) => f.properties.adm_nm));
console.log('행정동:', dongs.features.map((f) => f.properties.adm_nm).join(', '));

// 점-폴리곤 판정
const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const inGeom = (x, y, g) => polys(g).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
const dongOf = (x, y) => dongs.features.find((f) => inGeom(x, y, f.geometry))?.properties.adm_nm;

// 경계상자 (약간 여유)
const pts = dongs.features.flatMap((f) => polys(f.geometry).flatMap((p) => p[0]));
const B = [Math.min(...pts.map((p) => p[0])) - 0.001, Math.min(...pts.map((p) => p[1])) - 0.001, Math.max(...pts.map((p) => p[0])) + 0.001, Math.max(...pts.map((p) => p[1])) + 0.001];
console.log('경계상자', B.map((v) => v.toFixed(4)).join(','));

// 넓이 가중 중심점(외곽 링 기준, 가장 큰 조각)
function centroid(g) {
  let best = null, bestA = -1;
  for (const p of polys(g)) {
    const r = p[0]; let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = a ? [cx / (3 * a), cy / (3 * a)] : r[0]; }
  }
  return best;
}
const round = (g) => ({ type: g.type, coordinates: JSON.parse(JSON.stringify(g.coordinates), (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)) });

// 2) 건물: 경계상자를 N×N 칸으로 나눠 페이지 조회
const N = 4, seen = new Set(), out = [];
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const box = [B[0] + ((B[2] - B[0]) * i) / N, B[1] + ((B[3] - B[1]) * j) / N, B[0] + ((B[2] - B[0]) * (i + 1)) / N, B[1] + ((B[3] - B[1]) * (j + 1)) / N];
  let kept = 0, stale = 0;
  for (let page = 1; page <= 200; page++) {
    const fs_ = await getFeatures({ data: 'LT_C_BLDGINFO', geomFilter: `BOX(${box.join(',')})`, size: '1000', page: String(page) });
    let fresh = 0;
    for (const f of fs_) {
      if (!f.geometry) continue;
      const [x, y] = centroid(f.geometry);
      if (x < box[0] || x >= box[2] || y < box[1] || y >= box[3]) continue; // 칸 경계 건물은 중심점이 있는 칸에서만
      const id = f.id ?? `${x.toFixed(7)},${y.toFixed(7)}`;
      if (seen.has(id)) continue; seen.add(id); fresh++;
      const dong = dongOf(x, y); if (!dong) continue;
      const p = f.properties ?? {};
      const day = String(p.useapr_day ?? '').replace(/\D/g, '');
      const year = /^(1[89]|20)\d\d/.test(day) ? Number(day.slice(0, 4)) : null;
      out.push({
        type: 'Feature',
        properties: {
          dong, useapr_day: day || null, year,
          usability: p.usability || null, bld_nm: p.bld_nm || null, dong_nm: p.dong_nm || null,
          grnd_flr: Number(p.grnd_flr) || 0, ugrnd_flr: Number(p.ugrnd_flr) || 0, height: Number(p.height) || 0,
          totalarea: Number(p.totalarea) || 0, archarea: Number(p.archarea) || 0, strct_cd: p.strct_cd || null,
        },
        geometry: round(f.geometry),
      });
      kept++;
    }
    stale = fresh ? 0 : stale + 1;
    if (fs_.length < 1000 || stale >= 5) break;
  }
  console.log(`칸 ${i},${j}: ${kept.toLocaleString()}건 (누적 ${out.length.toLocaleString()})`);
}

await fs.writeFile(path.join(DATA, 'seongsu_buildings.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  source: '국토교통부·브이월드 GIS건물통합정보 (LT_C_BLDGINFO), 내려받은 날 ' + new Date().toISOString().slice(0, 10),
  features: out,
}), 'utf8');

const byDong = Object.fromEntries(DONG_NAMES.map((n) => [n, out.filter((f) => f.properties.dong === n).length]));
console.log('완료', out.length, byDong, '승인연도 없음', out.filter((f) => !f.properties.year).length);
