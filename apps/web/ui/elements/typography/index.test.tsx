import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Typography } from '.';

describe('Typography', () => {
  it('renders typography text', () => {
    const text = 'test-text';
    const testId = 'typography';

    const { queryByTestId } = render(
      <Typography data-testid={testId}>{text}</Typography>
    );

    const element = queryByTestId(testId);

    expect(element).toBeTruthy();
    expect(element?.textContent).toContain(text);
  });
});
