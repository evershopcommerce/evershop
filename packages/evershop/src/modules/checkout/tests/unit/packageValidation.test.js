process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { validatePackagePayload } from '../../services/package/packageManager.js';

describe('validatePackagePayload', () => {
  const valid = { name: 'Small Box', length: 20, width: 15, height: 10 };

  it('accepts a valid create payload (weight/tare optional)', () => {
    expect(() => validatePackagePayload(valid)).not.toThrow();
  });

  it('accepts height 0 — a flat envelope', () => {
    expect(() =>
      validatePackagePayload({ ...valid, height: 0 })
    ).not.toThrow();
  });

  it('rejects a missing name on create', () => {
    expect(() =>
      validatePackagePayload({ length: 10, width: 10, height: 10 })
    ).toThrow(/name is required/i);
  });

  it('rejects zero/negative length and width', () => {
    expect(() => validatePackagePayload({ ...valid, length: 0 })).toThrow(
      /length must be greater than 0/i
    );
    expect(() => validatePackagePayload({ ...valid, width: -2 })).toThrow(
      /width must be greater than 0/i
    );
  });

  it('rejects negative height and negative tare weight', () => {
    expect(() => validatePackagePayload({ ...valid, height: -1 })).toThrow(
      /height must be 0/i
    );
    expect(() => validatePackagePayload({ ...valid, weight: -0.5 })).toThrow(
      /weight must be 0 or greater/i
    );
  });

  it('rejects non-numeric dimensions', () => {
    expect(() =>
      validatePackagePayload({ ...valid, length: 'abc' })
    ).toThrow();
  });

  it('partial mode (update) allows omitted fields but validates present ones', () => {
    expect(() => validatePackagePayload({ name: 'Renamed' }, true)).not.toThrow();
    expect(() => validatePackagePayload({}, true)).not.toThrow();
    expect(() => validatePackagePayload({ length: 0 }, true)).toThrow(
      /length must be greater than 0/i
    );
    expect(() => validatePackagePayload({ name: '   ' }, true)).toThrow(
      /name is required/i
    );
  });
});
