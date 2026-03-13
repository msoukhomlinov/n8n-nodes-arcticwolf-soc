import type { IDataObject } from 'n8n-workflow';

export function resolveDateRange(
  preset: string,
  customFrom?: string,
  customTo?: string,
): { after?: string; before?: string } {
  if (!preset || preset === 'custom') {
    return {
      after: customFrom || undefined,
      before: customTo || undefined,
    };
  }

  const now = new Date();

  function utcDayStart(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function utcDayEnd(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  }

  function daysAgo(n: number): Date {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - n);
    return d;
  }

  const todayStart = utcDayStart(now);
  const todayEnd = utcDayEnd(now);

  switch (preset) {
    case 'today':
      return { after: todayStart.toISOString(), before: todayEnd.toISOString() };

    case 'yesterday': {
      const yest = daysAgo(1);
      return { after: utcDayStart(yest).toISOString(), before: utcDayEnd(yest).toISOString() };
    }

    case 'last24h':
      // Rolling 24-hour window — intentionally time-based, no calendar-day snapping, no `before`
      return { after: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() };

    case 'last3d':
      return { after: utcDayStart(daysAgo(2)).toISOString(), before: todayEnd.toISOString() };

    case 'last7d':
      return { after: utcDayStart(daysAgo(6)).toISOString(), before: todayEnd.toISOString() };

    case 'last14d':
      return { after: utcDayStart(daysAgo(13)).toISOString(), before: todayEnd.toISOString() };

    case 'last30d':
      return { after: utcDayStart(daysAgo(29)).toISOString(), before: todayEnd.toISOString() };

    case 'last60d':
      return { after: utcDayStart(daysAgo(59)).toISOString(), before: todayEnd.toISOString() };

    case 'last90d':
      return { after: utcDayStart(daysAgo(89)).toISOString(), before: todayEnd.toISOString() };

    case 'thisWeek': {
      const dayOfWeek = now.getUTCDay(); // 0=Sunday
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      return {
        after: utcDayStart(daysAgo(daysToMonday)).toISOString(),
        before: todayEnd.toISOString(),
      };
    }

    case 'lastWeek': {
      const dayOfWeek = now.getUTCDay();
      const daysToThisMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const daysToLastMonday = daysToThisMonday + 7;
      const lastMonday = daysAgo(daysToLastMonday);
      const lastSunday = daysAgo(daysToLastMonday - 6);
      return {
        after: utcDayStart(lastMonday).toISOString(),
        before: utcDayEnd(lastSunday).toISOString(),
      };
    }

    case 'thisMonth': {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { after: monthStart.toISOString(), before: todayEnd.toISOString() };
    }

    case 'lastMonth': {
      const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const month = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
      const lastMonthStart = new Date(Date.UTC(year, month, 1));
      const lastMonthEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999),
      );
      return { after: lastMonthStart.toISOString(), before: lastMonthEnd.toISOString() };
    }

    case 'last6m': {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()));
      return { after: utcDayStart(d).toISOString(), before: todayEnd.toISOString() };
    }

    case 'last12m': {
      const d = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
      return { after: utcDayStart(d).toISOString(), before: todayEnd.toISOString() };
    }

    default:
      return {};
  }
}

export interface ListTicketsParams {
  status?: string[];
  priority?: string;
  type?: string;
  assigneeByEmail?: string;
  assigneeByFirstName?: string;
  assigneeByLastName?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export function buildListTicketsQs(opts: ListTicketsParams): IDataObject {
  const qs: IDataObject = {
    limit: opts.limit ?? 20,
    offset: opts.offset ?? 0,
  };
  if (opts.status && opts.status.length > 0) qs['status'] = opts.status.join(',');
  if (opts.priority) qs['priority'] = opts.priority;
  if (opts.type) qs['type'] = opts.type;
  if (opts.assigneeByEmail) qs['assigneeByEmail'] = opts.assigneeByEmail;
  if (opts.assigneeByFirstName) qs['assigneeByFirstName'] = opts.assigneeByFirstName;
  if (opts.assigneeByLastName) qs['assigneeByLastName'] = opts.assigneeByLastName;
  if (opts.updatedAfter) qs['updatedAfter'] = opts.updatedAfter;
  if (opts.updatedBefore) qs['updatedBefore'] = opts.updatedBefore;
  if (opts.createdAfter) qs['createdAfter'] = opts.createdAfter;
  if (opts.createdBefore) qs['createdBefore'] = opts.createdBefore;
  return qs;
}
