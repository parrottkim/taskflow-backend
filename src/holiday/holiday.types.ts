export interface HolidayApiItem {
  dateKind: string;
  dateName: string;
  isHoliday: string;
  locdate: number | string;
  seq: number | string;
}

export interface HolidayApiResponse {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?:
        | ''
        | {
            item?: HolidayApiItem | HolidayApiItem[];
          };
      totalCount?: number | string;
    };
  };
}
