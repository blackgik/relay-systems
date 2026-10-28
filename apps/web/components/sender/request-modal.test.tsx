import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BoardItem } from '@/lib/dashboard-types';
import { RequestModal } from './request-modal';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: jest.fn() };
});
jest.mock('@/ui/elements/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() }, ToastContainer: () => null }));

import { api } from '@/lib/api';
const mockApi = api as jest.MockedFunction<typeof api>;

const trip: BoardItem = {
  tripId: 'trip_1',
  handle: 'willow-raven-90',
  tier: 'T1',
  rating: 4.5,
  verified: true,
  travelVerified: true,
  isMine: false,
  mode: 'ROAD',
  flightNumber: null,
  originCity: 'Awka',
  destCity: 'Abuja',
  departAt: '2099-01-05T08:00:00.000Z',
  arriveAt: '2099-01-05T16:00:00.000Z',
  phase: 'ACCEPTING',
  progress: 0,
  capacityKg: 35,
  remainingKg: 12,
  bookedKg: 23,
  packagesBooked: 2,
  packagesOnHand: 0,
  kgOnHand: 0,
  pricePerKg: 200_000,
  currency: 'NGN',
  categories: ['fabric', 'documents'],
  international: false,
  requestBy: '2099-01-03T08:00:00.000Z',
  bookable: true,
};

const submitButton = () => screen.getByRole('button', { name: /push request to @willow-raven-90/i });
const weightInput = () => document.querySelector<HTMLInputElement>('#request-weight')!;

function renderModal(props: Partial<React.ComponentProps<typeof RequestModal>> = {}) {
  return render(<RequestModal trip={trip} token="tok" senderTier="T2" onClose={jest.fn()} {...props} />);
}

beforeEach(() => mockApi.mockReset());

describe('RequestModal', () => {
  it('shows the courier price and a live estimate for the entered weight', () => {
    renderModal();
    fireEvent.change(weightInput(), { target: { value: '2.5' } });
    expect(screen.getByText(/Estimated total: NGN 5,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Up to 12 kg fits in this bag/)).toBeInTheDocument();
  });

  it('blocks weights that do not fit the bag', () => {
    renderModal();
    fireEvent.change(weightInput(), { target: { value: '13' } });
    expect(screen.getByText('Only 12 kg left in this bag.')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('asks unverified senders to verify before requesting', () => {
    renderModal({ senderTier: 'T0' });
    expect(screen.getByText(/Verify your identity \(Tier 1\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify now' })).toHaveAttribute('href', '/onboarding');
    expect(submitButton()).toBeDisabled();
  });

  it('requires Tier 2 for international trips', () => {
    renderModal({ senderTier: 'T1', trip: { ...trip, international: true, tier: 'T2' } });
    expect(screen.getByText(/International trips need you to be Tier 2/)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('creates the shipment then pushes the request to the chosen trip', async () => {
    mockApi
      .mockResolvedValueOnce({ id: 'shp_1' } as never)
      .mockResolvedValueOnce({ id: 'shp_1', status: 'AWAITING_APPROVAL' } as never);
    const onSent = jest.fn();
    renderModal({ onSent });

    fireEvent.change(weightInput(), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('Receiver name'), { target: { value: 'Ngozi' } });
    fireEvent.change(screen.getByLabelText('Receiver phone'), { target: { value: '+2348012345678' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSent).toHaveBeenCalledWith('shp_1'));
    expect(mockApi).toHaveBeenNthCalledWith(
      1,
      '/shipments',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ originCity: 'Awka', destCity: 'Abuja', weightKg: 2.5, currency: 'NGN', category: 'fabric' }),
      })
    );
    expect(mockApi).toHaveBeenNthCalledWith(
      2,
      '/shipments/shp_1/select-route',
      expect.objectContaining({ method: 'POST', body: { tripIds: ['trip_1'] } })
    );
    expect(await screen.findByText('Your request is with @willow-raven-90')).toBeInTheDocument();
  });

  it('shows the API reason when a request is refused', async () => {
    const { ApiError } = jest.requireActual('@/lib/api');
    mockApi
      .mockResolvedValueOnce({ id: 'shp_2' } as never)
      .mockRejectedValueOnce(new ApiError(400, 'Trip trip_1 is past its request window', {}));
    renderModal();
    fireEvent.change(screen.getByLabelText('Receiver name'), { target: { value: 'Ngozi' } });
    fireEvent.change(screen.getByLabelText('Receiver phone'), { target: { value: '+2348012345678' } });
    fireEvent.click(submitButton());
    expect(await screen.findByText('Trip trip_1 is past its request window')).toBeInTheDocument();
  });
});
