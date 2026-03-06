import { resolveDateRange } from './params.js';

// Pin to 2025-03-05T14:30:00.000Z (Wednesday, UTC)
const FIXED_NOW = new Date('2025-03-05T14:30:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('resolveDateRange', () => {
  describe('empty / custom presets', () => {
    it('returns empty object for empty preset', () => {
      expect(resolveDateRange('')).toEqual({});
    });

    it('returns empty object for unrecognised preset', () => {
      expect(resolveDateRange('unknown')).toEqual({});
    });

    it('custom with both values passes them through unchanged', () => {
      expect(resolveDateRange('custom', '2025-01-01T00:00:00.000Z', '2025-01-31T23:59:59.999Z')).toEqual({
        after: '2025-01-01T00:00:00.000Z',
        before: '2025-01-31T23:59:59.999Z',
      });
    });

    it('custom with only from sets only after', () => {
      expect(resolveDateRange('custom', '2025-01-01T00:00:00.000Z', '')).toEqual({
        after: '2025-01-01T00:00:00.000Z',
        before: undefined,
      });
    });

    it('custom with no values returns empty-ish object', () => {
      expect(resolveDateRange('custom')).toEqual({ after: undefined, before: undefined });
    });
  });

  describe('today', () => {
    it('returns UTC midnight start and end of today', () => {
      const result = resolveDateRange('today');
      expect(result.after).toBe('2025-03-05T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('yesterday', () => {
    it('returns UTC start and end of the previous day', () => {
      const result = resolveDateRange('yesterday');
      expect(result.after).toBe('2025-03-04T00:00:00.000Z');
      expect(result.before).toBe('2025-03-04T23:59:59.999Z');
    });
  });

  describe('last24h', () => {
    it('returns exactly 24h ago as after with no before', () => {
      const result = resolveDateRange('last24h');
      expect(result.after).toBe('2025-03-04T14:30:00.000Z');
      expect(result.before).toBeUndefined();
    });
  });

  describe('last3d', () => {
    it('returns start of 2 days ago through end of today', () => {
      // 2 days ago from 2025-03-05 = 2025-03-03
      const result = resolveDateRange('last3d');
      expect(result.after).toBe('2025-03-03T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('last7d', () => {
    it('returns start of 6 days ago through end of today', () => {
      // 6 days ago from 2025-03-05 = 2025-02-27
      const result = resolveDateRange('last7d');
      expect(result.after).toBe('2025-02-27T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('thisWeek', () => {
    it('returns most recent Monday through end of today', () => {
      // 2025-03-05 is Wednesday (UTC day=3), so Monday = 2 days ago = 2025-03-03
      const result = resolveDateRange('thisWeek');
      expect(result.after).toBe('2025-03-03T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('lastWeek', () => {
    it('returns previous Monday through previous Sunday', () => {
      // 2025-03-05 is Wednesday (day=3), daysToThisMonday=2, daysToLastMonday=9
      // lastMonday = 2025-02-24, lastSunday = daysAgo(9-6=3) = 2025-03-02
      const result = resolveDateRange('lastWeek');
      expect(result.after).toBe('2025-02-24T00:00:00.000Z');
      expect(result.before).toBe('2025-03-02T23:59:59.999Z');
    });
  });

  describe('thisMonth', () => {
    it('returns first day of current UTC month through end of today', () => {
      const result = resolveDateRange('thisMonth');
      expect(result.after).toBe('2025-03-01T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('lastMonth', () => {
    it('returns first and last day of previous month', () => {
      // Current month = March (index 2), last month = February
      // February 2025: starts 2025-02-01, ends 2025-02-28 (not leap-year month end)
      const result = resolveDateRange('lastMonth');
      expect(result.after).toBe('2025-02-01T00:00:00.000Z');
      expect(result.before).toBe('2025-02-28T23:59:59.999Z');
    });
  });

  describe('lastMonth at year boundary', () => {
    it('returns December of previous year when current month is January', () => {
      jest.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
      const result = resolveDateRange('lastMonth');
      expect(result.after).toBe('2024-12-01T00:00:00.000Z');
      expect(result.before).toBe('2024-12-31T23:59:59.999Z');
    });
  });

  describe('last30d', () => {
    it('returns start of 29 days ago through end of today', () => {
      // 29 days before 2025-03-05 = 2025-02-04
      const result = resolveDateRange('last30d');
      expect(result.after).toBe('2025-02-04T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('last6m', () => {
    it('returns same date 6 months ago through end of today', () => {
      // 6 months before 2025-03 = 2024-09, same day (5)
      const result = resolveDateRange('last6m');
      expect(result.after).toBe('2024-09-05T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('last12m', () => {
    it('returns same date 12 months ago through end of today', () => {
      // 1 year before 2025-03-05 = 2024-03-05
      const result = resolveDateRange('last12m');
      expect(result.after).toBe('2024-03-05T00:00:00.000Z');
      expect(result.before).toBe('2025-03-05T23:59:59.999Z');
    });
  });

  describe('thisWeek when today is Sunday', () => {
    it('returns Monday 6 days ago through end of today', () => {
      // 2025-03-09 is a Sunday
      jest.setSystemTime(new Date('2025-03-09T10:00:00.000Z'));
      const result = resolveDateRange('thisWeek');
      // Monday = 6 days ago = 2025-03-03
      expect(result.after).toBe('2025-03-03T00:00:00.000Z');
      expect(result.before).toBe('2025-03-09T23:59:59.999Z');
    });
  });

  describe('thisWeek when today is Monday', () => {
    it('returns start of today (Monday) through end of today', () => {
      // 2025-03-03 is a Monday
      jest.setSystemTime(new Date('2025-03-03T08:00:00.000Z'));
      const result = resolveDateRange('thisWeek');
      expect(result.after).toBe('2025-03-03T00:00:00.000Z');
      expect(result.before).toBe('2025-03-03T23:59:59.999Z');
    });
  });
});
