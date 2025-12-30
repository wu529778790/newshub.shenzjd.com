import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validate,
  safeParse,
  validateArray,
  Validator,
  Validators,
  Sanitizer,
  sanitizeData
} from '~/server/utils/validator';

describe('Validator Utils', () => {
  describe('validate', () => {
    it('should validate data successfully', () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const result = validate(schema, { name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John');
        expect(result.data.age).toBe(30);
      }
    });

    it('should return errors for invalid data', () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const result = validate(schema, { name: 'John', age: 'invalid' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should support strict mode', () => {
      const schema = z.object({ name: z.string() });
      const result = validate(schema, { name: 'John', extra: 'field' }, { strict: true });

      expect(result.success).toBe(false);
    });
  });

  describe('safeParse', () => {
    it('should return parsed data when valid', () => {
      const schema = z.object({ name: z.string() });
      const result = safeParse(schema, { name: 'John' }, { name: 'default' });

      expect(result).toEqual({ name: 'John' });
    });

    it('should return default value when invalid', () => {
      const schema = z.object({ name: z.string() });
      const result = safeParse(schema, { name: 123 }, { name: 'default' });

      expect(result).toEqual({ name: 'default' });
    });
  });

  describe('validateArray', () => {
    it('should validate array elements', () => {
      const schema = z.object({ id: z.number(), name: z.string() });
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 'invalid', name: 'Item 3' },
      ];

      const result = validateArray(schema, data);

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
    });

    it('should skip invalid items when skipInvalid is true', () => {
      const schema = z.object({ id: z.number() });
      const data = [{ id: 1 }, { id: 'invalid' }];

      const result = validateArray(schema, data, { skipInvalid: true });

      expect(result.valid.length).toBe(1);
      expect(result.invalid.length).toBe(0);
    });
  });

  describe('Validator class', () => {
    it('should validate with sourceId', () => {
      const validator = new Validator('test-source');
      const schema = z.object({ name: z.string() });
      const result = validator.validate(schema, { name: 'John' });

      expect(result.success).toBe(true);
    });

    it('should safeParse with sourceId', () => {
      const validator = new Validator('test-source');
      const schema = z.object({ name: z.string() });
      const result = validator.safeParse(schema, { name: 'John' }, { name: 'default' });

      expect(result).toEqual({ name: 'John' });
    });

    it('should validateArray with sourceId', () => {
      const validator = new Validator('test-source');
      const schema = z.object({ id: z.number() });
      const result = validator.validateArray(schema, [{ id: 1 }, { id: 'invalid' }]);

      expect(result.valid.length).toBe(1);
    });

    it('should transform data', () => {
      const validator = new Validator('test-source');
      const schema = z.object({ name: z.string() });
      const result = validator.transform(schema, { name: 'John' }, (data) => data.name.toUpperCase());

      expect(result).toBe('JOHN');
    });

    it('should return null for invalid transform', () => {
      const validator = new Validator('test-source');
      const schema = z.object({ name: z.string() });
      const result = validator.transform(schema, { name: 123 }, (data) => data.name.toUpperCase());

      expect(result).toBeNull();
    });
  });

  describe('Validators', () => {
    it('should have url validator', () => {
      const result = Validators.url.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('should have nonEmptyString validator', () => {
      expect(Validators.nonEmptyString.safeParse('').success).toBe(false);
      expect(Validators.nonEmptyString.safeParse('hello').success).toBe(true);
    });

    it('should have positiveInt validator', () => {
      expect(Validators.positiveInt.safeParse(5).success).toBe(true);
      expect(Validators.positiveInt.safeParse(-1).success).toBe(false);
      expect(Validators.positiveInt.safeParse(0).success).toBe(false);
    });

    it('should have newsItems validator', () => {
      const validItems = [
        { id: '1', title: 'Test', url: 'https://example.com' },
        { id: 2, title: 'Test 2', url: 'https://example.com/2' },
      ];
      expect(Validators.newsItems.safeParse(validItems).success).toBe(true);
    });
  });

  describe('Sanitizer', () => {
    it('should sanitize string', () => {
      expect(Sanitizer.string(' hello ')).toBe('hello');
      expect(Sanitizer.string(123)).toBe('123');
      expect(Sanitizer.string(null, 'default')).toBe('default');
    });

    it('should sanitize number', () => {
      expect(Sanitizer.number('123')).toBe(123);
      expect(Sanitizer.number('invalid')).toBe(0);
      expect(Sanitizer.number('invalid', 999)).toBe(999);
    });

    it('should sanitize boolean', () => {
      expect(Sanitizer.boolean('true')).toBe(true);
      expect(Sanitizer.boolean('1')).toBe(true);
      expect(Sanitizer.boolean('false')).toBe(false);
      expect(Sanitizer.boolean(0)).toBe(false);
      expect(Sanitizer.boolean(1)).toBe(true);
    });

    it('should sanitize url', () => {
      expect(Sanitizer.url('https://example.com')).toBe('https://example.com');
      expect(Sanitizer.url('invalid')).toBe('');
      expect(Sanitizer.url('invalid', 'https://fallback.com')).toBe('https://fallback.com');
    });

    it('should sanitize array', () => {
      expect(Sanitizer.array([1, 2, 3])).toEqual([1, 2, 3]);
      expect(Sanitizer.array('not-array')).toEqual([]);
    });

    it('should sanitize object', () => {
      expect(Sanitizer.object({ a: 1 })).toEqual({ a: 1 });
      expect(Sanitizer.object(null)).toEqual({});
    });

    it('should sanitize date', () => {
      const timestamp = Date.now();
      expect(Sanitizer.date(timestamp)).toBe(timestamp);
      expect(Sanitizer.date('2024-01-01')).toBeGreaterThan(0);
      expect(Sanitizer.date('invalid')).toBeGreaterThan(0); // defaults to now
    });

    it('should sanitize extra fields', () => {
      const extra = {
        icon: 'https://example.com/icon.png',
        date: '2024-01-01',
        rank: '5',
        score: '100',
        other: 'value',
      };

      const result = Sanitizer.extra(extra);

      expect(result.icon).toEqual({ url: 'https://example.com/icon.png', scale: 1 });
      expect(result.date).toBeGreaterThan(0);
      expect(result.rank).toBe(5);
      expect(result.score).toBe(100);
      expect(result.other).toBe('value');
    });
  });

  describe('sanitizeData', () => {
    it('should return null for invalid data', () => {
      const schema = z.object({ name: z.string() });
      const result = sanitizeData(schema, null);
      expect(result).toBeNull();
    });

    it('should clean array data', () => {
      const schema = z.object({ id: z.number() });
      const data = [{ id: 1 }, { id: 'invalid' }, { id: 3 }];
      const result = sanitizeData(schema, data);

      expect(result).toEqual([{ id: 1 }, { id: 3 }]);
    });

    it('should fix missing optional fields', () => {
      const schema = z.object({
        name: z.string(),
        optional: z.string().optional()
      });
      const data = { name: 'test' };
      const result = sanitizeData(schema, data);

      expect(result).toEqual({ name: 'test' });
    });
  });
});
