export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type OnboardingStep = 'PERSONAL' | 'IDENTITY' | 'DOCUMENTS' | 'BANK' | 'REVIEW';
export type BvnMatch = 'PENDING' | 'VERIFIED' | 'FAILED' | 'UNAVAILABLE';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  emailVerifiedAt: string | null;
  handle: string | null;
  kycTier: 'T0' | 'T1' | 'T2';
  rating: number;
  strikes: number;
  onboarding: { status: OnboardingStatus; step: OnboardingStep; bvnMatch: BvnMatch | null };
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  step: OnboardingStep;
  kycTier: User['kycTier'];
  reviewNote: string | null;
  needsPhone: boolean;
  personal: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    city: string;
    state: string;
  } | null;
  identity: { ninLast4: string; bvnLast4: string } | null;
  documents: { idType: string; idNumberLast4: string; hasIdDocument: boolean; hasSelfie: boolean } | null;
  bank: {
    bankName: string;
    accountLast4: string;
    accountName: string;
    nameMatches: boolean;
    bvnMatch: BvnMatch;
  } | null;
}

export interface Trip {
  id: string;
  carrierId: string;
  originCity: string;
  destCity: string;
  departAt: string;
  arriveAt: string;
  mode: string;
  flightNumber?: string | null;
  capacityKg: number;
  remainingKg: number;
  pricePerKg: number;
  currency: string;
  categories: string[];
  international: boolean;
  travelVerified: boolean;
  status: string;
  /** Present on GET /trips responses (public listing). Handle only, never a name or id. */
  carrier?: { handle: string | null; kycTier: 'T0' | 'T1' | 'T2'; rating: number };
  /** Present on GET /trips responses: accepted/in-custody packages on this trip. */
  _count?: { legs: number };
}

export interface Leg {
  id: string;
  shipmentId: string;
  tripId: string;
  sequence: number;
  fee: number;
  currency: string;
  acceptDeadline: string;
  status: string;
  trip: Trip & { carrier?: { id: string; handle: string | null; rating: number; kycTier: string } };
}

export interface Shipment {
  id: string;
  senderId: string;
  receiverName: string;
  receiverPhone: string;
  originCity: string;
  destCity: string;
  category: string;
  weightKg: number;
  declaredValue: number;
  currency: string;
  photos: string[];
  status: string;
  totalPrice?: number | null;
  legs: Leg[];
}

export interface RouteLegOption {
  trip: Trip;
  fee: number;
  acceptDeadline: string;
}

export interface RouteOption {
  legs: RouteLegOption[];
  totalPrice: number;
  currency: string;
  departAt: string;
  arriveAt: string;
}

export interface Conversation {
  id: string;
  shipmentId?: string | null;
  legId?: string | null;
  members: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
