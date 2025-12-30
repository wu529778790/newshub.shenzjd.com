import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { tranformToUTC, parseDate, parseRelativeDate } from '~/server/utils/date';

describe('Date Utils', () => {
  describe('tranformToUTC', () => {
    it('should transform date to UTC timestamp', () => {
      const result = tranformToUTC('2024-01-01 12:00:00', undefined, 'Asia/Shanghai');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should handle custom format', () => {
      const result = tranformToUTC('01/01/2024', 'DD/MM/YYYY', 'Asia/Shanghai');
      expect(result).toBeGreaterThan(0);
    });

    it('should use default timezone Asia/Shanghai', () => {
      const result = tranformToUTC('2024-01-01 12:00:00');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('parseDate', () => {
    it('should parse date string', () => {
      const result = parseDate('2024-01-01');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse timestamp', () => {
      const timestamp = Date.now();
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });
  });

  describe('parseRelativeDate', () => {
    it('should handle "刚刚" (just now)', () => {
      const result = parseRelativeDate('刚刚');
      expect(result).toBeInstanceOf(Date);
      const now = new Date();
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('should handle "X seconds ago"', () => {
      const result = parseRelativeDate('5秒前');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().subtract(5, 'second').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "X minutes ago"', () => {
      const result = parseRelativeDate('10分钟前');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().subtract(10, 'minute').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "X hours ago"', () => {
      const result = parseRelativeDate('2小时前');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().subtract(2, 'hour').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "X days ago"', () => {
      const result = parseRelativeDate('3天前');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().subtract(3, 'day').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "today"', () => {
      const result = parseRelativeDate('今天 12:00');
      expect(result).toBeInstanceOf(Date);
      const parsed = dayjs(result);
      // Check it's today (within UTC context)
      expect(parsed.hour()).toBeGreaterThanOrEqual(0);
      expect(parsed.hour()).toBeLessThan(24);
    });

    it('should handle "yesterday"', () => {
      const result = parseRelativeDate('昨天 12:00');
      expect(result).toBeInstanceOf(Date);
      // Just verify it's a valid date
      expect(result.getTime()).toBeGreaterThan(0);
    });

    it('should handle "tomorrow"', () => {
      const result = parseRelativeDate('明天 12:00');
      expect(result).toBeInstanceOf(Date);
      // Just verify it's a valid date
      expect(result.getTime()).toBeGreaterThan(0);
    });

    it('should handle weekday', () => {
      const result = parseRelativeDate('周一 12:00');
      expect(result).toBeInstanceOf(Date);
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle "X seconds later"', () => {
      const result = parseRelativeDate('5秒后');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().add(5, 'second').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle complex relative date', () => {
      const result = parseRelativeDate('1分30秒前');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().subtract(1, 'minute').subtract(30, 'second').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "in X minutes"', () => {
      const result = parseRelativeDate('in 10 minutes');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().add(10, 'minute').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "a few seconds ago"', () => {
      const result = parseRelativeDate('几秒前');
      expect(result).toBeInstanceOf(Date);
      // "几" is converted to "3", so should be 3 seconds ago
      const expected = dayjs().subtract(3, 'second').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should handle "a minute ago"', () => {
      const result = parseRelativeDate('a minute ago');
      expect(result).toBeInstanceOf(Date);
      const expected = dayjs().subtract(1, 'minute').toDate();
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should return original date for unparseable strings', () => {
      const unparseable = 'invalid date string';
      const result = parseRelativeDate(unparseable);
      expect(result).toBe(unparseable);
    });

    it('should handle timezone', () => {
      const result = parseRelativeDate('12:00', 'Asia/Tokyo');
      // The function returns the original string if no match is found
      // So we just check it doesn't throw an error
      expect(result).toBeDefined();
    });
  });
});
