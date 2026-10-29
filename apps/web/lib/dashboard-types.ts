// Response shapes for the dashboard, courier board and public profiles.
// Public shapes carry a handle only — never a user id or real name.

export type Tier = 'T0' | 'T1' | 'T2';
export type TripPhase = 'ACCEPTING' | 'DEPARTING_SOON' | 'IN_TRANSIT' | 'ARRIVED' | 'CANCELLED';

export interface BoardItem {
  tripId: string;
  handle: string | null;
  tier: Tier;
  rating: number;
  verified: boolean;
  travelVerified: boolean;
  isMine: boolean;
  mode: 'ROAD' | 'AIR' | 'RAIL' | string;
  flightNumber: string | null;
  originCity: string;
  destCity: string;
  departAt: string;
  arriveAt: string;
  phase: TripPhase;
  progress: number;
  capacityKg: number;
  remainingKg: number;
  bookedKg: number;
  packagesBooked: number;
  packagesOnHand: number;
  kgOnHand: number;
  pricePerKg: number;
  currency: string;
  categories: string[];
  international: boolean;
  excludedItems: string[];
  excludedFeePerKg: number | null;
  journeyStage: string;
  /** Requests close this long before departure (the courier's answer window). */
  requestBy: string;
  /** Open, has space, and still inside the request window — a request can succeed. */
  bookable: boolean;
}

export interface MonthPoint {
  month: string;
  earned: number;
  spent: number;
  net: number;
}

export interface DashboardSummary {
  me: { handle: string; tier: Tier; rating: number; memberSince: string };
  currency: string;
  balance: number;
  sender: {
    sent: number;
    sentThisMonth: number;
    inTransit: number;
    delivered: number;
    needsAction: number;
    kgSent: number;
    recent: {
      id: string;
      originCity: string;
      destCity: string;
      category: string;
      weightKg: number;
      status: string;
      totalPrice: number | null;
      currency: string;
      createdAt: string;
      legs: number;
      couriers: { handle: string | null; mode: string; status: string }[];
      progress: number;
    }[];
  };
  courier: {
    carried: number;
    carriedThisMonth: number;
    onHand: number;
    kgOnHand: number;
    kgCarried: number;
    pendingRequests: number;
    routesTaken: number;
    tripsTaken: number;
    trips: BoardItem[];
  };
  money: {
    earned: number;
    spent: number;
    refunds: number;
    net: number;
    earnedChange: number | null;
    series: MonthPoint[];
    projection: {
      committed: number;
      openCapacity: number;
      fillRate: number;
      fillRateIsDefault: boolean;
      estimate: number;
    };
  };
  activity: { weeks: { weekStart: string; sent: number; delivered: number }[] };
}

export interface TopCourier {
  rank: number;
  handle: string;
  tier: Tier;
  rating: number;
  deliveries: number;
  kgCarried: number;
  routes: number;
  completionRate: number | null;
  modes: string[];
  activeTrip: { originCity: string; destCity: string; phase: TripPhase } | null;
}

export interface PublicProfile {
  handle: string;
  tier: Tier;
  verified: boolean;
  rating: number;
  memberSince: string;
  isMe: boolean;
  courier: {
    deliveries: number;
    kgCarried: number;
    completionRate: number | null;
    tripsTaken: number;
    routes: { originCity: string; destCity: string; trips: number; modes: string[] }[];
    monthly: { month: string; count: number }[];
    activeTrips: BoardItem[];
  };
  sender: {
    sent: number;
    delivered: number;
    inTransit: number;
    corridors: number;
    categories: { category: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
}

export interface Notification {
  id: string;
  kind: 'REQUEST' | 'SHIPMENT' | 'PAYOUT' | 'KYC';
  tone: 'info' | 'success' | 'warning' | 'danger';
  /** Waiting on you: a request to answer, a shipment to pay, reroute or follow up. */
  actionable?: boolean;
  title: string;
  body: string;
  href: string;
  at: string;
}
