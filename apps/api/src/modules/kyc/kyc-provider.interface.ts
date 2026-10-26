export type KycCheckType = 'NIN' | 'BVN' | 'PASSPORT' | 'LIVENESS' | 'TRAVEL_PROOF';
export type KycCheckStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface KycStartInput {
  userId: string;
  type: KycCheckType;
  payload?: Record<string, unknown>;
}

export interface KycStartResult {
  reference: string;
  status: KycCheckStatus;
  payload: Record<string, unknown>;
}

// Every KYC provider (Smile ID, Dojah, mock) sits behind this interface.
export interface KycProvider {
  name: string;
  startVerification(input: KycStartInput): Promise<KycStartResult>;
}
