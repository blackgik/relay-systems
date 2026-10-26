import { maskContactDetails } from './mask';

describe('maskContactDetails', () => {
  it('masks international phone numbers', () => {
    expect(maskContactDetails('call me on +234 800 123 4567')).toBe('call me on [hidden]');
  });

  it('masks local phone formats', () => {
    expect(maskContactDetails('my number is 0803-123-4567 ok')).toBe(
      'my number is [hidden] ok'
    );
  });

  it('masks emails', () => {
    expect(maskContactDetails('write to ada@example.com please')).toBe(
      'write to [hidden] please'
    );
  });

  it('leaves ordinary text alone', () => {
    expect(maskContactDetails('see you at the park by 5')).toBe('see you at the park by 5');
  });
});
