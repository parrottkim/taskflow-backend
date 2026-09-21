export type ScheduleCalendarEventPayload = {
  summary: string;
  description: string;
  location: string;
  colorId: string;
  start: { date: string };
  end: { date: string };
  extendedProperties: {
    shared: {
      categoryId: string;
      owner: string;
    };
  };
};
