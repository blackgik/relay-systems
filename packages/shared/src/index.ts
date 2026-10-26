export const RELAY_VERSION = "0.1.0";

// Mirrors the Prisma enums until generated types are shared.
export enum KycTier {
	T0 = "T0",
	T1 = "T1",
	T2 = "T2"
}

export enum ShipmentStatus {
	DRAFT = "DRAFT",
	ROUTED = "ROUTED",
	AWAITING_APPROVAL = "AWAITING_APPROVAL",
	REROUTING = "REROUTING",
	APPROVED = "APPROVED",
	FUNDED = "FUNDED",
	IN_TRANSIT = "IN_TRANSIT",
	DELIVERED = "DELIVERED",
	DISPUTED = "DISPUTED",
	COMPLETED = "COMPLETED",
	REFUNDED = "REFUNDED",
	CANCELLED = "CANCELLED"
}

export enum LegStatus {
	PROPOSED = "PROPOSED",
	ACCEPTED = "ACCEPTED",
	REJECTED = "REJECTED",
	EXPIRED = "EXPIRED",
	AWAITING_PICKUP = "AWAITING_PICKUP",
	IN_CUSTODY = "IN_CUSTODY",
	HANDED_OFF = "HANDED_OFF",
	SETTLED = "SETTLED",
	NO_SHOW = "NO_SHOW",
	LOST = "LOST",
	DISPUTED = "DISPUTED"
}

export enum CustodyType {
	PICKUP = "PICKUP",
	TRANSFER = "TRANSFER",
	HUB_DROP = "HUB_DROP",
	DELIVERY = "DELIVERY"
}

// Policy defaults from the spec: 48h verification window, 12h transfer
// buffer, max 3 legs, 70/30 hybrid leg payout.
export const ACCEPT_DEADLINE_HOURS = 48;
export const TRANSFER_BUFFER_HOURS = 12;
export const MAX_LEGS = 3;
export const LEG_RELEASE_SPLIT = 0.7;
// Money policy in basis points for exact minor-unit math.
export const FIRST_RELEASE_BPS = 7000;
export const PLATFORM_FEE_BPS = 500;
export const INSURANCE_RATE_BPS = 200;
