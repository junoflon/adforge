# AdForge

## Overview
광고 소재 분석 도구. Foreplay API를 통해 광고 데이터를 검색하고 분석하는 SPA.

## Architecture
- **server.js** — Express 서버. Foreplay API 프록시(`/api/foreplay-proxy`), 정적 파일 서빙, SPA 폴백
- **public/index.html** — 단일 HTML SPA (Tailwind CSS, Alpine.js 등 CDN 사용)

## Development
```bash
npm install
cp .env.example .env   # FOREPLAY_API_KEY 설정
npm run dev             # localhost:3000 (--watch 모드)
```

## Deployment
Railway에 배포. `railway.json` 설정 포함.
- 환경변수: `FOREPLAY_API_KEY`, `PORT`
- 헬스체크: `GET /health`