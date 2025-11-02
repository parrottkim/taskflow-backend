# ----------------------------------------------------------------------
# 1. 빌더 스테이지 (Builder Stage)
# 모든 종속성(개발용 포함)을 설치하고 NestJS 애플리케이션을 빌드합니다.
# ----------------------------------------------------------------------
FROM node:23.4.0-alpine as builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 lock 파일을 복사합니다.
COPY package*.json ./

# 모든 종속성(개발 종속성 포함)을 설치합니다.
# NestJS 'build' 스크립트(nest build)는 devDependencies에 의존합니다.
RUN npm ci

# 나머지 소스 코드를 복사합니다.
COPY . .

# 애플리케이션 빌드 (dist 폴더 생성)
# 'build' 스크립트는 'nest build'입니다.
RUN npm run build 

# ----------------------------------------------------------------------
# 2. 운영 스테이지 (Production Stage)
# ----------------------------------------------------------------------
FROM node:23.4.0-alpine as production

# 빌드 아규먼트 수신
ARG NODE_ENV=prod
ENV NODE_ENV=${NODE_ENV}

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 lock 파일을 복사합니다.
COPY package*.json ./

# 환경에 따라 설치 분기
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --omit=dev; else npm ci; fi

# 빌더 스테이지에서 빌드된 결과물(dist 폴더) 복사
COPY --from=builder /app/dist ./dist

# 애플리케이션 시작 명령
CMD ["node", "dist/src/main.js"]