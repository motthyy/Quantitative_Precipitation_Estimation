import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatTime, toDateTimeLocal } from '../src/utils/date';

describe('JST date formatting', () => {
  it('formats timestamps in JST regardless of the runtime timezone', () => {
    const timestamp = '2018-07-07T10:00:00Z';

    expect(formatDateTime(timestamp)).toBe('2018/07/07 19:00');
    expect(formatDate(timestamp)).toBe('2018/07/07');
    expect(formatTime(timestamp)).toBe('19:00');
    expect(toDateTimeLocal(timestamp)).toBe('2018-07-07T19:00');
  });
});
