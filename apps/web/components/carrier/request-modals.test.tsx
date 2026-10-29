import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { RejectRequestModal } from './reject-request-modal';
import { AcceptRequestModal } from './accept-request-modal';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: jest.fn().mockResolvedValue({
      version: 'v1',
      hash: 'h',
      senderClauses: [],
      courierClauses: ['Stealing this package is a crime.'],
      signAs: 'Chika Eze',
    }),
  };
});

const leg = {
  id: 'leg_1',
  fee: 500000,
  currency: 'NGN',
  trip: { originCity: 'Awka', destCity: 'Abuja', departAt: '2099-01-05T08:00:00.000Z', excludedItems: ['liquids'] },
  shipment: { weightKg: 2.5, category: 'fabric', sender: { handle: 'harbor-heron-21' } },
};

describe('RejectRequestModal', () => {
  it('sends the chosen reason with an optional note', () => {
    const onReject = jest.fn();
    render(<RejectRequestModal leg={leg} busy={false} onClose={jest.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByLabelText('The timing no longer works'));
    fireEvent.change(screen.getByLabelText('Add a note (optional)'), { target: { value: 'Trip moved to Friday' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline with this reason' }));
    expect(onReject).toHaveBeenCalledWith('leg_1', 'The timing no longer works — Trip moved to Friday');
  });

  it('needs your own words when the reason is "Other"', () => {
    const onReject = jest.fn();
    render(<RejectRequestModal leg={leg} busy={false} onClose={jest.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByLabelText('Other'));
    const submit = screen.getByRole('button', { name: 'Decline with this reason' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Your reason'), { target: { value: 'I only carry sealed retail boxes' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onReject).toHaveBeenCalledWith('leg_1', 'I only carry sealed retail boxes');
  });
});

describe('AcceptRequestModal', () => {
  it('shows the undertaking and only accepts once it is ticked', async () => {
    const onAccept = jest.fn();
    render(<AcceptRequestModal leg={leg} token="tok" busy={false} onClose={jest.fn()} onAccept={onAccept} />);
    expect(await screen.findByText('Stealing this package is a crime.')).toBeInTheDocument();
    expect(screen.getByText(/Your cannot-carry list: liquids/)).toBeInTheDocument();
    const accept = screen.getByRole('button', { name: 'Accept & unlock identity' });
    expect(accept).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(accept);
    expect(onAccept).toHaveBeenCalledWith('leg_1');
  });
});
