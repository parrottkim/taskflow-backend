export interface JusoApiAddress {
  zipNo?: string;
  roadAddr?: string;
  roadAddrPart1?: string;
  emdNm?: string;
  bdNm?: string;
  jibunAddr?: string;
}

export interface JusoApiResponse {
  results: {
    common: {
      totalCount?: number | string;
    };
    juso?: JusoApiAddress[];
  };
}
