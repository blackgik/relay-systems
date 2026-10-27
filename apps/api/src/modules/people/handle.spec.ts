import { generateHandle, handleProblem, HANDLE_PATTERN } from './handle';

describe('handles', () => {
  it('generates valid word handles', () => {
    for (let i = 0; i < 50; i++) expect(generateHandle()).toMatch(HANDLE_PATTERN);
  });

  it('accepts a neutral pseudonym', () => {
    expect(handleProblem('night-owl-7', 'Ada Okafor')).toBeNull();
  });

  it('rejects handles that reveal the real name', () => {
    expect(handleProblem('ada-okafor', 'Ada Okafor')).toMatch(/real name/);
    expect(handleProblem('okafor99', 'Ada Okafor')).toMatch(/real name/);
    expect(handleProblem('o-k-a-f-o-r', 'Ada Okafor')).toMatch(/real name/);
  });

  it('rejects bad shapes and reserved words', () => {
    expect(handleProblem('Ab', 'X Y')).toMatch(/3–20/);
    expect(handleProblem('9lives', 'X Y')).toMatch(/3–20/);
    expect(handleProblem('fox--hawk', 'X Y')).toMatch(/Dashes/);
    expect(handleProblem('relay-help', 'X Y')).toMatch(/reserved/);
  });
});
