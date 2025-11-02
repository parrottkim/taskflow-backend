import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    postgresql: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
    jwt: {
      jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
      jwtRefreshSecret:
        process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      refreshTokenExpiration:
        (process.env.REFRESH_TOKEN_EXPIRATION as string) || '7d',
      accessTokenExpiration:
        (process.env.ACCESS_TOKEN_EXPIRATION as string) || '1h',
    },
    googleCalendar: {
      credentialsPath: process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH,
      scheduleCalendarId: process.env.GOOGLE_SCHEDULE_CALENDAR_ID,
      vacationCalendarId: process.env.GOOGLE_VACATION_CALENDAR_ID,
    },
    sftp: {
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT, 10) || 22,
      username: process.env.SFTP_USERNAME,
      privateKeyPath: process.env.SFTP_PRIVATE_KEY_PATH,
      passphrase: process.env.SFTP_PASSPHRASE,
      url: process.env.SFTP_URL,
      path: process.env.SFTP_PATH,
    },
    exchange: {
      key: process.env.EXCHANGE_API_KEY,
    },
  };
});
