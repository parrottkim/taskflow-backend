export interface ExchangeRateApiItem {
  result: number | string;
  cur_unit: string;
  kftc_deal_bas_r?: string;
}

export type ExchangeRateApiResponse = ExchangeRateApiItem[];
