import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Input } from '.';

describe('Input', () => {
  it('renders Input label', () => {
    const label = 'test-label';
    const { queryByText } = render(<Input name="input_field" label={label} />);

    expect(queryByText(label)).toBeTruthy();
  });
});
