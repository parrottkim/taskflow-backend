import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

console.log('=========================================');
console.log('TypeORM Target DB:');
console.log('HOST:', process.env.POSTGRES_HOST);
console.log('PORT:', process.env.POSTGRES_PORT);
console.log('DB NAME:', process.env.POSTGRES_DB);
console.log('USER:', process.env.POSTGRES_USER);
console.log('=========================================');

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  // 엔티티 경로는 컴파일된 .js 파일을 참조하도록 설정
  // CI/CD 환경에서는 빌드된 결과물 (일반적으로 dist)을 기준으로 해야 합니다.
  entities: ['dist/**/*.entity.js'],

  // 마이그레이션 파일의 경로 (컴파일된 .js 파일 경로)
  migrations: ['dist/migrations/*.js'],

  // 마이그레이션 실행 후 동기화 상태를 저장할 테이블명 (선택적)
  migrationsTableName: 'migrations',

  // naming strategy는 AppModule에서 사용한 것을 동일하게 적용
  namingStrategy: new SnakeNamingStrategy(),
});
