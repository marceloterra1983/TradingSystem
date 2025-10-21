declare module 'cron-validator' {
  export function isValidCron(expression: string, options?: { seconds?: boolean }): boolean;
}

declare module 'cronstrue' {
  interface CronstrueOptions {
    locale?: string;
    use24HourTimeFormat?: boolean;
  }

  interface Cronstrue {
    toString(expression: string, options?: CronstrueOptions): string;
  }

  const cron: Cronstrue;
  export default cron;
}

declare module 'cron-parser' {
  interface CronParserOptions {
    currentDate?: Date;
    tz?: string;
  }

  interface CronDate {
    toDate(): Date;
  }

  interface CronExpression {
    next(): CronDate;
  }

  export function parseExpression(expression: string, options?: CronParserOptions): CronExpression;
}
