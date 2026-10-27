import { namesMatch } from './name-match';

const ada = { firstName: 'Ada', middleName: 'Chioma', lastName: 'Okafor' };

describe('namesMatch', () => {
  it('accepts bank formats with surname first or extra punctuation', () => {
    expect(namesMatch(ada, 'OKAFOR ADA CHIOMA')).toBe(true);
    expect(namesMatch(ada, 'Ada C. Okafor')).toBe(true);
    expect(namesMatch(ada, 'OKAFOR, CHIOMA')).toBe(true);
  });

  it('rejects accounts missing the surname or both given names', () => {
    expect(namesMatch(ada, 'ADA CHIOMA NWOSU')).toBe(false);
    expect(namesMatch(ada, 'OKAFOR EMEKA')).toBe(false);
    expect(namesMatch(ada, 'RELAY VENTURES LTD')).toBe(false);
  });

  it('handles hyphenated surnames', () => {
    expect(namesMatch({ firstName: 'Bola', lastName: 'Ade-Bello' }, 'BELLO BOLA')).toBe(true);
  });
});
