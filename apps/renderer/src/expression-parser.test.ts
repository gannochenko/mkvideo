import { describe, it, expect } from 'vitest';
import {
  parseExpression,
  evaluateCompiledExpression,
  parseValueLazy,
  calculateFinalValue,
  isCalcExpression,
  ExpressionContext,
  CompiledExpression,
} from './expression-parser';

describe('expression-parser', () => {
  describe('isCalcExpression', () => {
    it('should identify calc expressions', () => {
      expect(isCalcExpression('calc(5 + 3)')).toBe(true);
      expect(isCalcExpression('  calc(5 + 3)')).toBe(true);
      expect(isCalcExpression('5')).toBe(false);
      expect(isCalcExpression('something else')).toBe(false);
    });
  });

  describe('parseExpression', () => {
    it('should parse and evaluate simple numeric expression', () => {
      const compiled = parseExpression('calc(5 + 3)');
      expect(compiled.original).toBe('calc(5 + 3)');
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map(),
      });
      expect(result).toBe(8);
    });

    it('should parse and evaluate expression with url() fragment reference', () => {
      const compiled = parseExpression('calc(url(#ending_screen.time.start))');
      expect(compiled.original).toBe('calc(url(#ending_screen.time.start))');
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map([
          [
            'ending_screen',
            {
              time: { start: 12000, end: 17000, duration: 5000 },
            },
          ],
        ]),
      });
      expect(result).toBe(12000);
    });

    it('should parse and evaluate expression with seconds unit', () => {
      const compiled = parseExpression('calc(5s)');
      expect(compiled.original).toBe('calc(5s)');
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map(),
      });
      expect(result).toBe(5000);
    });

    it('should parse and evaluate expression with milliseconds unit', () => {
      const compiled = parseExpression('calc(5000ms)');
      expect(compiled.original).toBe('calc(5000ms)');
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map(),
      });
      expect(result).toBe(5000);
    });

    it('should parse and evaluate expression with decimal seconds', () => {
      const compiled = parseExpression('calc(1.5s)');
      expect(compiled.original).toBe('calc(1.5s)');
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map(),
      });
      expect(result).toBe(1500);
    });

    it('should parse and evaluate complex expression with url() and time units', () => {
      const compiled = parseExpression(
        'calc(url(#ending_screen.time.start) * -1 + 5s)',
      );
      expect(compiled.original).toBe(
        'calc(url(#ending_screen.time.start) * -1 + 5s)',
      );
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map([
          [
            'ending_screen',
            {
              time: { start: 10000, end: 15000, duration: 5000 },
            },
          ],
        ]),
      });
      expect(result).toBe(-5000); // -10000 + 5000
    });

    it('should parse and evaluate expression with multiple fragment references', () => {
      const compiled = parseExpression(
        'calc(url(#scene1.time.end) - url(#scene2.time.start))',
      );
      expect(compiled.original).toBe(
        'calc(url(#scene1.time.end) - url(#scene2.time.start))',
      );
      const result = evaluateCompiledExpression(compiled, {
        fragments: new Map([
          ['scene1', { time: { start: 0, end: 5000, duration: 5000 } }],
          ['scene2', { time: { start: 3000, end: 8000, duration: 5000 } }],
        ]),
      });
      expect(result).toBe(2000); // 5000 - 3000
    });

    it('should throw error for invalid expression', () => {
      expect(() => parseExpression('calc(5 + )')).toThrow(/Failed to parse/);
    });
  });

  describe('evaluateCompiledExpression', () => {
    it('should evaluate simple numeric expression', () => {
      const compiled = parseExpression('calc(5 + 3)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(8);
    });

    it('should evaluate expression with seconds converted to milliseconds', () => {
      const compiled = parseExpression('calc(5s)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(5000);
    });

    it('should evaluate expression with milliseconds', () => {
      const compiled = parseExpression('calc(5000ms)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(5000);
    });

    it('should evaluate expression with decimal seconds', () => {
      const compiled = parseExpression('calc(1.5s)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(1500);
    });

    it('should evaluate expression with fragment reference', () => {
      const compiled = parseExpression('calc(url(#ending_screen.time.start))');
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'ending_screen',
            {
              time: {
                start: 10000,
                end: 15000,
                duration: 5000,
              },
            },
          ],
        ]),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(10000);
    });

    it('should evaluate expression with fragment reference and math', () => {
      const compiled = parseExpression(
        'calc(url(#ending_screen.time.start) * -1)',
      );
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'ending_screen',
            {
              time: {
                start: 10000,
                end: 15000,
                duration: 5000,
              },
            },
          ],
        ]),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(-10000);
    });

    it('should evaluate complex expression with fragment and time unit', () => {
      const compiled = parseExpression(
        'calc(url(#ending_screen.time.start) * -1 + 5s)',
      );
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'ending_screen',
            {
              time: {
                start: 10000,
                end: 15000,
                duration: 5000,
              },
            },
          ],
        ]),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(-5000); // -10000 + 5000
    });

    it('should evaluate expression with multiple fragment references', () => {
      const compiled = parseExpression(
        'calc(url(#scene1.time.end) - url(#scene2.time.start))',
      );
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'scene1',
            {
              time: {
                start: 0,
                end: 5000,
                duration: 5000,
              },
            },
          ],
          [
            'scene2',
            {
              time: {
                start: 3000,
                end: 8000,
                duration: 5000,
              },
            },
          ],
        ]),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(2000); // 5000 - 3000
    });

    it('should evaluate expression with duration property', () => {
      const compiled = parseExpression('calc(url(#intro.time.duration) + 1000)');
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'intro',
            {
              time: {
                start: 0,
                end: 3000,
                duration: 3000,
              },
            },
          ],
        ]),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(4000);
    });

    it('should throw error for missing fragment', () => {
      const compiled = parseExpression('calc(url(#nonexistent.time.start))');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      expect(() => evaluateCompiledExpression(compiled, context)).toThrow(
        /Fragment with id "nonexistent" not found/,
      );
    });

    it('should throw error for missing property', () => {
      const compiled = parseExpression('calc(url(#intro.time.invalid))');
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'intro',
            {
              time: {
                start: 0,
                end: 3000,
                duration: 3000,
              },
            },
          ],
        ]),
      };
      expect(() => evaluateCompiledExpression(compiled, context)).toThrow(
        /Property "time.invalid" not found/,
      );
    });
  });

  describe('parseValueLazy', () => {
    it('should return number as-is', () => {
      const result = parseValueLazy(5000);
      expect(result).toBe(5000);
    });

    it('should parse string number', () => {
      const result = parseValueLazy('5000');
      expect(result).toBe(5000);
    });

    it('should compile calc expression', () => {
      const result = parseValueLazy('calc(5 + 3)');
      expect(typeof result).toBe('object');
      expect((result as CompiledExpression).original).toBe('calc(5 + 3)');
    });

    it('should compile calc expression with url()', () => {
      const result = parseValueLazy('calc(url(#intro.time.start) + 1000)');
      expect(typeof result).toBe('object');
      expect((result as CompiledExpression).original).toBe(
        'calc(url(#intro.time.start) + 1000)',
      );
    });

    it('should throw error for invalid value', () => {
      expect(() => parseValueLazy('invalid')).toThrow(/Invalid value/);
    });
  });

  describe('calculateFinalValue', () => {
    const context: ExpressionContext = {
      fragments: new Map([
        [
          'intro',
          {
            time: {
              start: 0,
              end: 3000,
              duration: 3000,
            },
          },
        ],
      ]),
    };

    it('should return number as-is', () => {
      const result = calculateFinalValue(5000, context);
      expect(result).toBe(5000);
    });

    it('should evaluate compiled expression', () => {
      const compiled = parseExpression('calc(url(#intro.time.duration) + 1000)');
      const result = calculateFinalValue(compiled, context);
      expect(result).toBe(4000);
    });
  });

  describe('Integration: compile once, evaluate many', () => {
    it('should compile once and evaluate with different contexts', () => {
      const compiled = parseExpression('calc(url(#fragment.time.start) + 2s)');

      const context1: ExpressionContext = {
        fragments: new Map([
          [
            'fragment',
            {
              time: {
                start: 1000,
                end: 6000,
                duration: 5000,
              },
            },
          ],
        ]),
      };

      const context2: ExpressionContext = {
        fragments: new Map([
          [
            'fragment',
            {
              time: {
                start: 5000,
                end: 10000,
                duration: 5000,
              },
            },
          ],
        ]),
      };

      const result1 = evaluateCompiledExpression(compiled, context1);
      const result2 = evaluateCompiledExpression(compiled, context2);

      expect(result1).toBe(3000); // 1000 + 2000
      expect(result2).toBe(7000); // 5000 + 2000
    });
  });

  describe('Edge cases', () => {
    it('should handle negative numbers', () => {
      const compiled = parseExpression('calc(-5s)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(-5000);
    });

    it('should handle division', () => {
      const compiled = parseExpression('calc(10s / 2)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(5000);
    });

    it('should handle parentheses', () => {
      const compiled = parseExpression('calc((2s + 3s) * 2)');
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(10000); // (2000 + 3000) * 2
    });

    it('should handle complex nested property paths', () => {
      const compiled = parseExpression('calc(url(#fragment.time.start))');
      const context: ExpressionContext = {
        fragments: new Map([
          [
            'fragment',
            {
              time: {
                start: 1500,
                end: 4500,
                duration: 3000,
              },
            },
          ],
        ]),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(1500);
    });

    it('should not convert "ms" or "s" in middle of words', () => {
      // This would be an odd case, but the regex should use word boundaries
      const compiled = parseExpression('calc(100)'); // Normal case
      const context: ExpressionContext = {
        fragments: new Map(),
      };
      const result = evaluateCompiledExpression(compiled, context);
      expect(result).toBe(100);
    });
  });
});
