# Seongsu

**성수동 건축물 사용승인연도 지도** — 서울 성동구 성수1가1동·성수1가2동·성수2가1동·성수2가3동의 건물을 사용승인연도 구간별로 색칠한 지도입니다. 배경지도와 건물 정보 모두 브이월드를 사용합니다.

- 지도: [index.html](index.html)
- 건물 6,239동 (성수1가1동 1,210 · 성수1가2동 1,343 · 성수2가1동 1,900 · 성수2가3동 1,786)
- 색 구간: 1969년 이전 / 1970년대 / 1980년대 / 1990년대 / 2000년 이후 / 승인일 정보 없음
- 행정동 필터, 구간 켜기·끄기, 10년 단위 막대그래프, 행정동별 표, 배경지도 전환(흰지도·기본·야간·영상)

> 성수2가에는 '성수2가2동'이라는 행정동이 없습니다(성수2가1동·성수2가3동). 네 행정동을 합친 범위는 법정동 성수동1가·성수동2가와 같습니다.

## 자료
- 건물: 국토교통부·브이월드 GIS건물통합정보 `LT_C_BLDGINFO` (사용승인일 `useapr_day`, 주용도, 층수, 연면적)
- 행정동 경계: [vuski/admdongkor](https://github.com/vuski/admdongkor) ver20261001
- 배경지도: 브이월드 WMTS (`white`, `Base`, `midnight`, `Satellite`+`Hybrid`)

### 자료의 한계
- 원자료의 사용승인일은 1923–2018년 범위로, 2019년 이후 준공 건물은 반영되지 않았을 수 있습니다.
- 1,529동(24.5%)은 사용승인일이 비어 있어 '승인일 정보 없음'으로 표시합니다.
- 건물의 소속 행정동은 건물 폴리곤의 중심점 기준입니다.

## 브이월드 인증키
배경지도 키는 저장소에 커밋하지 않습니다(`vworld_key.js`는 `.gitignore` 대상).
- 로컬: 상위 폴더(또는 이 폴더)의 `.env`에 `V-WORLD_KEY=...`를 두고 `node scripts/make_key_js.mjs` 실행 → `vworld_key.js` 생성
- 그 밖의 환경(GitHub Pages 등): 주소 뒤에 `?key=인증키`를 붙여 열면 브라우저에 기억됩니다. 브이월드 인증키의 서비스 URL에 해당 도메인을 등록해야 타일이 내려옵니다.

## 다시 만들기
```
node scripts/download_buildings.mjs   # 브이월드에서 건물·경계 수집 → data/*.geojson
node scripts/build_data.mjs           # 지도용 data/seongsu_data.js 생성
node scripts/make_key_js.mjs          # 로컬 배경지도 키 파일 생성
python -m http.server 8000            # http://localhost:8000 에서 확인
```
