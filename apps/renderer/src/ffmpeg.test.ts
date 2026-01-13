import { describe, it, expect } from 'vitest';
import { makeConcat, makeXFade, type Label } from './ffmpeg';

describe('makeConcat', () => {
  describe('basic functionality', () => {
    it('should create concat filter for 2 segments with 1 video and 1 audio each (n=2:v=1:a=1)', () => {
      const inputs: Label[] = [
        { tag: '0:v', isAudio: false },
        { tag: '0:a', isAudio: true },
        { tag: '1:v', isAudio: false },
        { tag: '1:a', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.inputs).toEqual(inputs);
      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe('[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]');
    });

    it('should create concat filter for 3 segments with 1 video and 1 audio each (n=3:v=1:a=1)', () => {
      const inputs: Label[] = [
        { tag: '0:v', isAudio: false },
        { tag: '0:a', isAudio: true },
        { tag: '1:v', isAudio: false },
        { tag: '1:a', isAudio: true },
        { tag: '2:v', isAudio: false },
        { tag: '2:a', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe(
        '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]',
      );
    });

    it('should create concat filter for video only (n=2:v=1:a=0)', () => {
      const inputs: Label[] = [
        { tag: '0:v', isAudio: false },
        { tag: '1:v', isAudio: false },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([{ tag: 'v', isAudio: false }]);
      expect(filter.render()).toBe('[0:v][1:v]concat=n=2:v=1:a=0[v]');
    });

    it('should create concat filter for audio only (n=2:v=0:a=1)', () => {
      const inputs: Label[] = [
        { tag: '0:a', isAudio: true },
        { tag: '1:a', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([{ tag: 'a', isAudio: true }]);
      expect(filter.render()).toBe('[0:a][1:a]concat=n=2:v=0:a=1[a]');
    });

    it('should create concat filter for 3 video-only segments (n=3:v=1:a=0)', () => {
      const inputs: Label[] = [
        { tag: 'v1', isAudio: false },
        { tag: 'v2', isAudio: false },
        { tag: 'v3', isAudio: false },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([{ tag: 'v', isAudio: false }]);
      expect(filter.render()).toBe('[v1][v2][v3]concat=n=3:v=1:a=0[v]');
    });
  });

  describe('multiple streams per segment', () => {
    it('should handle 2 video streams and 1 audio stream per segment (n=2:v=2:a=1)', () => {
      const inputs: Label[] = [
        { tag: '0:v:0', isAudio: false },
        { tag: '0:v:1', isAudio: false },
        { tag: '0:a', isAudio: true },
        { tag: '1:v:0', isAudio: false },
        { tag: '1:v:1', isAudio: false },
        { tag: '1:a', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v0', isAudio: false },
        { tag: 'v1', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe(
        '[0:v:0][0:v:1][0:a][1:v:0][1:v:1][1:a]concat=n=2:v=2:a=1[v0][v1][a]',
      );
    });

    it('should handle 1 video and 2 audio streams per segment (n=2:v=1:a=2)', () => {
      const inputs: Label[] = [
        { tag: '0:v', isAudio: false },
        { tag: '0:a:0', isAudio: true },
        { tag: '0:a:1', isAudio: true },
        { tag: '1:v', isAudio: false },
        { tag: '1:a:0', isAudio: true },
        { tag: '1:a:1', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a0', isAudio: true },
        { tag: 'a1', isAudio: true },
      ]);
      expect(filter.render()).toBe(
        '[0:v][0:a:0][0:a:1][1:v][1:a:0][1:a:1]concat=n=2:v=1:a=2[v][a0][a1]',
      );
    });

    it('should handle multiple video streams only (n=6:v=1:a=0)', () => {
      const inputs: Label[] = [
        { tag: 'v1a', isAudio: false },
        { tag: 'v1b', isAudio: false },
        { tag: 'v1c', isAudio: false },
        { tag: 'v2a', isAudio: false },
        { tag: 'v2b', isAudio: false },
        { tag: 'v2c', isAudio: false },
      ];

      const filter = makeConcat(inputs);

      // Algorithm prefers maximum n (most segments), so n=6, v=1, a=0
      expect(filter.outputs).toEqual([{ tag: 'v', isAudio: false }]);
      expect(filter.render()).toBe(
        '[v1a][v1b][v1c][v2a][v2b][v2c]concat=n=6:v=1:a=0[v]',
      );
    });
  });

  describe('edge cases and validation', () => {
    it('should throw error for empty inputs', () => {
      const inputs: Label[] = [];

      expect(() => makeConcat(inputs)).toThrow(
        'makeConcat: inputs cannot be empty',
      );
    });
  });

  describe('single segment cases', () => {
    it('should handle single segment with video and audio (n=1:v=1:a=1)', () => {
      const inputs: Label[] = [
        { tag: '0:v', isAudio: false },
        { tag: '0:a', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe('[0:v][0:a]concat=n=1:v=1:a=1[v][a]');
    });

    it('should handle single segment with video only (n=1:v=1:a=0)', () => {
      const inputs: Label[] = [{ tag: '0:v', isAudio: false }];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([{ tag: 'v', isAudio: false }]);
      expect(filter.render()).toBe('[0:v]concat=n=1:v=1:a=0[v]');
    });

    it('should handle single segment with audio only (n=1:v=0:a=1)', () => {
      const inputs: Label[] = [{ tag: '0:a', isAudio: true }];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([{ tag: 'a', isAudio: true }]);
      expect(filter.render()).toBe('[0:a]concat=n=1:v=0:a=1[a]');
    });
  });

  describe('large segment counts', () => {
    it('should handle 5 segments with video and audio (n=5:v=1:a=1)', () => {
      const inputs: Label[] = [
        { tag: '0:v', isAudio: false },
        { tag: '0:a', isAudio: true },
        { tag: '1:v', isAudio: false },
        { tag: '1:a', isAudio: true },
        { tag: '2:v', isAudio: false },
        { tag: '2:a', isAudio: true },
        { tag: '3:v', isAudio: false },
        { tag: '3:a', isAudio: true },
        { tag: '4:v', isAudio: false },
        { tag: '4:a', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe(
        '[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]concat=n=5:v=1:a=1[v][a]',
      );
    });

    it('should handle 10 video-only segments (n=10:v=1:a=0)', () => {
      const inputs: Label[] = Array.from({ length: 10 }, (_, i) => ({
        tag: `${i}:v`,
        isAudio: false,
      }));

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([{ tag: 'v', isAudio: false }]);
      const expectedInputs =
        '[0:v][1:v][2:v][3:v][4:v][5:v][6:v][7:v][8:v][9:v]';
      expect(filter.render()).toBe(`${expectedInputs}concat=n=10:v=1:a=0[v]`);
    });
  });

  describe('custom tag names', () => {
    it('should work with arbitrary tag names', () => {
      const inputs: Label[] = [
        { tag: 'segment1_video', isAudio: false },
        { tag: 'segment1_audio', isAudio: true },
        { tag: 'segment2_video', isAudio: false },
        { tag: 'segment2_audio', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe(
        '[segment1_video][segment1_audio][segment2_video][segment2_audio]concat=n=2:v=1:a=1[v][a]',
      );
    });

    it('should work with numeric tags', () => {
      const inputs: Label[] = [
        { tag: 'v1', isAudio: false },
        { tag: 'a1', isAudio: true },
        { tag: 'v2', isAudio: false },
        { tag: 'a2', isAudio: true },
      ];

      const filter = makeConcat(inputs);

      expect(filter.outputs).toEqual([
        { tag: 'v', isAudio: false },
        { tag: 'a', isAudio: true },
      ]);
      expect(filter.render()).toBe('[v1][a1][v2][a2]concat=n=2:v=1:a=1[v][a]');
    });
  });
});

describe('makeXFade', () => {
  describe('basic functionality', () => {
    it('should create xfade filter with default transition (fade)', () => {
      const input1: Label = { tag: '0:v', isAudio: false };
      const input2: Label = { tag: '1:v', isAudio: false };

      const filter = makeXFade(input1, input2, {
        duration: 1.5,
        offset: 5.0,
      });

      expect(filter.inputs).toEqual([input1, input2]);
      expect(filter.outputs).toEqual([{ tag: 'xfade', isAudio: false }]);
      expect(filter.render()).toBe(
        '[0:v][1:v]xfade=transition=fade:duration=1.5:offset=5[xfade]',
      );
    });

    it('should create xfade filter with custom transition', () => {
      const input1: Label = { tag: 'v1', isAudio: false };
      const input2: Label = { tag: 'v2', isAudio: false };

      const filter = makeXFade(input1, input2, {
        duration: 2.0,
        offset: 10.0,
        transition: 'wipeleft',
      });

      expect(filter.outputs).toEqual([{ tag: 'xfade', isAudio: false }]);
      expect(filter.render()).toBe(
        '[v1][v2]xfade=transition=wipeleft:duration=2:offset=10[xfade]',
      );
    });

    it('should handle various transition types', () => {
      const input1: Label = { tag: 'in1', isAudio: false };
      const input2: Label = { tag: 'in2', isAudio: false };

      const transitions = ['dissolve', 'circleopen', 'slidedown'];

      transitions.forEach((transition) => {
        const filter = makeXFade(input1, input2, {
          duration: 1.0,
          offset: 3.0,
          transition,
        });

        expect(filter.render()).toContain(`transition=${transition}`);
      });
    });
  });

  describe('validation', () => {
    it('should throw error if input1 is audio', () => {
      const input1: Label = { tag: '0:a', isAudio: true };
      const input2: Label = { tag: '1:v', isAudio: false };

      expect(() =>
        makeXFade(input1, input2, { duration: 1.0, offset: 5.0 }),
      ).toThrow('makeXFade: input1 must be video, got audio (tag: 0:a)');
    });

    it('should throw error if input2 is audio', () => {
      const input1: Label = { tag: '0:v', isAudio: false };
      const input2: Label = { tag: '1:a', isAudio: true };

      expect(() =>
        makeXFade(input1, input2, { duration: 1.0, offset: 5.0 }),
      ).toThrow('makeXFade: input2 must be video, got audio (tag: 1:a)');
    });

    it('should throw error if both inputs are audio', () => {
      const input1: Label = { tag: '0:a', isAudio: true };
      const input2: Label = { tag: '1:a', isAudio: true };

      expect(() =>
        makeXFade(input1, input2, { duration: 1.0, offset: 5.0 }),
      ).toThrow('makeXFade: input1 must be video, got audio');
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      const input1: Label = { tag: 'v1', isAudio: false };
      const input2: Label = { tag: 'v2', isAudio: false };

      const filter = makeXFade(input1, input2, {
        duration: 0,
        offset: 5.0,
      });

      expect(filter.render()).toBe(
        '[v1][v2]xfade=transition=fade:duration=0:offset=5[xfade]',
      );
    });

    it('should handle fractional values', () => {
      const input1: Label = { tag: 'v1', isAudio: false };
      const input2: Label = { tag: 'v2', isAudio: false };

      const filter = makeXFade(input1, input2, {
        duration: 0.25,
        offset: 3.75,
      });

      expect(filter.render()).toBe(
        '[v1][v2]xfade=transition=fade:duration=0.25:offset=3.75[xfade]',
      );
    });
  });
});
