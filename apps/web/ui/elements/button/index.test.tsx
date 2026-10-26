import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Button } from '.';

describe('Button', () => {
  it('renders button label', () => {
    const label = 'test-label';
    const { queryByText } = render(<Button label={label} />);

    expect(queryByText(label)).toBeTruthy();
  });
});
