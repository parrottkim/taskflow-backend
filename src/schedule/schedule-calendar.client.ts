import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { join } from 'path';
import config from '@/config/config';
import { ScheduleCalendarEventPayload } from './schedule-calendar.types';

@Injectable()
export class ScheduleCalendarClient {
  private readonly client: calendar_v3.Calendar;
  private readonly calendarId: string;

  constructor(
    @Inject(config.KEY)
    configService: ConfigType<typeof config>,
  ) {
    const auth = new google.auth.GoogleAuth({
      keyFile: join(process.cwd(), configService.calendar.credentialsPath),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendarId = configService.calendar.scheduleCalendarId;
    this.client = google.calendar({ version: 'v3', auth });
  }

  async createEvent(eventId: string, payload: ScheduleCalendarEventPayload) {
    try {
      await this.client.events.insert({
        calendarId: this.calendarId,
        requestBody: { ...payload, id: eventId },
      });
    } catch (error) {
      if (this.getErrorCode(error) !== 409) throw error;
    }
  }

  async updateEvent(eventId: string, payload: ScheduleCalendarEventPayload) {
    try {
      await this.client.events.update({
        calendarId: this.calendarId,
        eventId,
        requestBody: payload,
      });
    } catch (error) {
      if (this.getErrorCode(error) !== 404) throw error;

      try {
        await this.client.events.insert({
          calendarId: this.calendarId,
          requestBody: { ...payload, id: eventId },
        });
      } catch (insertError) {
        if (this.getErrorCode(insertError) !== 409) throw insertError;

        await this.client.events.update({
          calendarId: this.calendarId,
          eventId,
          requestBody: payload,
        });
      }
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.client.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (error) {
      const code = this.getErrorCode(error);
      if (code !== 404 && code !== 410) throw error;
    }
  }

  private getErrorCode(error: unknown) {
    const code = (error as { code?: number | string })?.code;
    return typeof code === 'string' ? Number(code) : code;
  }
}
