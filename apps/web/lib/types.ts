export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  kycTier: 'T0' | 'T1' | 'T2';
  rating: number;
  strikes: number;
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
  trip: Trip & { carrier?: { id: string; fullName: string; rating: number; kycTier: string } };
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
