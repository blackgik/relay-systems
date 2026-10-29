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
  excludedItems: [],
  excludedFeePerKg: null,
  journeyStage: 'NOT_STARTED',
  requestBy: '2099-01-03T08:00:00.000Z',
  bookable: true,
};

const submitButton = () => screen.getByRole('button', { name: /push request to @willow-raven-90/i });
const weightInput = () => document.querySelector<HTMLInputElement>('#request-weight')!;

function renderModal(props: Partial<React.ComponentProps<typeof RequestModal>> = {}) {
  return render(<RequestModal trip={trip} token="tok" senderTier="T2" onClose={jest.fn()} {...props} />);
}

const STATEMENT = {
  version: '2026-10.1',
  hash: 'abc',
  senderClauses: ['The goods are lawfully mine to send.'],
  courierClauses: ['Stealing this package is a crime.'],
  signAs: 'Ada Okafor',
};

/** Routes each API path to a reply; the statement is always available. */
function routeApi(routes: Record<string, () => Promise<unknown>>) {
  mockApi.mockImplementation(((path: string) => {
    if (path === '/attestations/statement') return Promise.resolve(STATEMENT);
    const hit = Object.keys(routes).find((k) => path === k);
    return hit ? routes[hit]() : Promise.reject(new Error(`unexpected ${path}`));
  }) as never);
}

async function fillAndReview() {
  fireEvent.change(weightInput(), { target: { value: '2.5' } });
  fireEvent.change(screen.getByLabelText('Receiver name'), { target: { value: 'Ngozi' } });
  fireEvent.change(screen.getByLabelText('Receiver phone'), { target: { value: '+2348012345678' } });
  fireEvent.click(submitButton());
  await screen.findByText('You are legally responsible for this package');
}

const signButton = () => screen.getByRole('button', { name: /sign & confirm request/i });

async function sign(name = 'Ada Okafor') {
  await screen.findByText('The goods are lawfully mine to send.');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(document.querySelector<HTMLInputElement>('#declaration-signature')!, { target: { value: name } });
}

beforeEach(() => {
  mockApi.mockReset();
  routeApi({});
});

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

  it('asks for the signed declaration before anything is created', async () => {
    renderModal();
    await fillAndReview();
    expect(mockApi).not.toHaveBeenCalledWith('/shipments', expect.anything());
    await sign('Chika Eze');
    expect(screen.getByText('Type your name as verified on Relay: Ada Okafor')).toBeInTheDocument();
    expect(signButton()).toBeDisabled();
    fireEvent.change(document.querySelector<HTMLInputElement>('#declaration-signature')!, { target: { value: 'okafor ada' } });
    expect(signButton()).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(signButton()).toBeDisabled();
  });

  it('creates the shipment then pushes the signed request to the chosen trip', async () => {
    routeApi({
      '/shipments': () => Promise.resolve({ id: 'shp_1' }),
      '/shipments/shp_1/select-route': () => Promise.resolve({ id: 'shp_1', status: 'AWAITING_APPROVAL' }),
    });
    const onSent = jest.fn();
    renderModal({ onSent });

    await fillAndReview();
    await sign();
    fireEvent.click(signButton());

    await waitFor(() => expect(onSent).toHaveBeenCalledWith('shp_1'));
    expect(mockApi).toHaveBeenCalledWith(
      '/shipments',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ originCity: 'Awka', destCity: 'Abuja', weightKg: 2.5, currency: 'NGN', category: 'fabric' }),
      })
    );
    expect(mockApi).toHaveBeenCalledWith(
      '/shipments/shp_1/select-route',
      expect.objectContaining({
        method: 'POST',
        body: { tripIds: ['trip_1'], attestation: { accepted: true, signedName: 'Ada Okafor', statementVersion: '2026-10.1' } },
      })
    );
    expect(await screen.findByText('Your request is with @willow-raven-90')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view signed declaration/i })).toHaveAttribute('href', '/declarations/shp_1');
  });

  it('shows the API reason when a request is refused', async () => {
    const { ApiError } = jest.requireActual('@/lib/api');
    routeApi({
      '/shipments': () => Promise.resolve({ id: 'shp_2' }),
      '/shipments/shp_2/select-route': () => Promise.reject(new ApiError(400, 'Trip trip_1 is past its request window', {})),
    });
    renderModal();
    await fillAndReview();
    await sign();
    fireEvent.click(signButton());
    expect(await screen.findByText('Trip trip_1 is past its request window')).toBeInTheDocument();
  });
});
