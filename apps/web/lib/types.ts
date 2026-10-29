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
  journeyStage?: string;
  excludedItems?: string[];
  excludedFeePerKg?: number | null;
  /** Present on GET /trips?mine=true: what this trip carried and earned. */
  stats?: {
    packagesCarried: number;
    kgCarried: number;
    earned: number;
    bookedFees: number;
    delivered: number;
    /** Average sender rating of deliveries on this trip; null until one is rated. */
    rating: number | null;
    ratings: number;
  };
  /** Present on GET /trips?mine=true: packages in the bag and requests waiting on it. */
  packages?: TripPackage[];
  /** Present on GET /trips responses (public listing). Handle only, never a name or id. */
  carrier?: { handle: string | null; kycTier: 'T0' | 'T1' | 'T2'; rating: number };
  /** Present on GET /trips responses: accepted/in-custody packages on this trip. */
  _count?: { legs: number };
}

export interface TripPackage {
  legId: string;
  shipmentId: string;
  status: string;
  category: string;
  weightKg: number;
  fee: number;
  rating: number | null;
  /** Declaration reference; the A4 lives at /declarations/{shipmentId}. */
  declaration: string | null;
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
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  senderRating?: number | null;
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
  attestation?: { reference: string; signedAt: string } | null;
}

/** GET /attestations/statement: the wording a sender signs. */
export interface DeclarationStatement {
  version: string;
  hash: string;
  senderClauses: string[];
  courierClauses: string[];
}

/** GET /attestations/:shipmentId — the A4 declaration, for its sender and couriers only. */
export interface Declaration {
  reference: string;
  viewerRole: 'SENDER' | 'COURIER';
  signedAt: string;
  signedName: string;
  statementVersion: string;
  statementHash: string;
  statementCurrent: boolean;
  senderClauses: string[];
  courierClauses: string[];
  shipment: {
    id: string;
    originCity: string;
    destCity: string;
    category: string;
    weightKg: number;
    declaredValue: number;
    currency: string;
    sealId: string | null;
    status: string;
    createdAt: string;
  };
  sender: { fullName: string; handle: string | null; tier: string };
  couriers: {
    fullName: string;
    handle: string | null;
    tier: string;
    sequence: number;
    originCity: string;
    destCity: string;
    departAt: string;
    mode: string;
    reference: string | null;
    acknowledged: boolean;
  }[];
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

/** A rating and comment one side left about the other after a leg ended or was terminated. */
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  outcome: 'DELIVERED' | 'TERMINATED';
  createdAt: string;
  /** Author's username only. */
  author: string | null;
  route: string;
  mode: string;
}

/** The real person behind a handle, shown to the other side once a leg is accepted. Never BVN/NIN. */
export interface RevealedIdentity {
  handle: string | null;
  tier: string;
  kycVerified: boolean;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  bank: { bankName: string; accountName: string; accountLast4: string; nameMatches: boolean } | null;
}

/** GET /legs/:id/sender — what a courier sees about a sender. */
export interface SenderDossier {
  handle: string | null;
  tier: string;
  memberSince: string;
  history: { sent: number; delivered: number; cancelled: number; disputes: number };
  rating: number | null;
  count: number;
  reviews: Review[];
  unlocked: boolean;
  identity: RevealedIdentity | null;
  canReview: boolean;
  myReview: { rating: number; comment: string | null } | null;
}

/** GET /shipments/:id/couriers — what a sender sees about each courier. */
export interface CourierOnShipment {
  legId: string;
  sequence: number;
  status: string;
  route: string;
  handle: string | null;
  tier: string;
  rating: number | null;
  count: number;
  unlocked: boolean;
  identity: RevealedIdentity | null;
  outcome: 'DELIVERED' | 'TERMINATED' | null;
  myReview: { rating: number; comment: string | null } | null;
}
