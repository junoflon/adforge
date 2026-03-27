# AdForge

## Overview
광고 소재 분석 도구. Foreplay API를 통해 광고 데이터를 검색하고 분석하는 SPA.

## Architecture
- **server.js** — Express 서버. Foreplay API 프록시(`/api/foreplay-proxy`), 정적 파일 서빙, SPA 폴백
- **public/index.html** — 단일 HTML SPA (Tailwind CSS, Alpine.js 등 CDN 사용)
- **public/js/** — 모듈별 JS 파일 (brands.js, generation.js, tts.js 등)
- **public/prompt-script.txt** — 대본 생성용 프롬프트 템플릿

## Development
```bash
npm install
cp .env.example .env   # FOREPLAY_API_KEY 설정
npm run dev             # localhost:3000 (--watch 모드)
```

## Deployment
Railway에 배포. GitHub main 브랜치 auto-deploy 연결.
- 환경변수: `FOREPLAY_API_KEY`, `PORT`
- 헬스체크: `GET /health`

## 작업 규칙
- **자동 배포**: 코드 수정 완료 시 별도 요청 없이 `git commit` → `git push origin main`으로 Railway 배포까지 진행
- **캐시 버스터**: public/js 파일 수정 시 index.html의 해당 `<script>` 태그에 `?v=N` 쿼리 파라미터 업데이트
- **보안**: API 키, 시크릿은 절대 코드에 하드코딩하지 않음. `.env`와 환경변수만 사용
- **한국어 소통**: 사용자와 한국어로 소통. 코드 주석/변수명은 영어 가능