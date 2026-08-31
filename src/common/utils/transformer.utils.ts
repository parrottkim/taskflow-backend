export class DecimalColumnTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

export class DateColumnTransformer {
  to(data?: Date | null): string | null | undefined {
    if (data === undefined) {
      return undefined;
    }
    if (data === null) {
      return null;
    }

    return data.toISOString().slice(0, 10);
  }

  from(data?: string | null): Date | null | undefined {
    if (data === undefined) {
      return undefined;
    }
    if (data === null) {
      return null;
    }

    return new Date(`${data}T00:00:00.000Z`);
  }
}
