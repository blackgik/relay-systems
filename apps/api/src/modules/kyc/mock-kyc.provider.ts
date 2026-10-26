import { Injectable } from '@nestjs/common';
import { KycProvider, KycStartInput, KycStartResult } from './kyc-provider.interface';

// Mock adapter: verifies instantly so the demo never depends on a provider
// sandbox. Swap the binding in KycModule for a real provider.
@Injectable()
export class MockKycProvider implements KycProvider {
  name = 'mock';

  async startVerification(input: KycStartInput): Promise<KycStartResult> {
    return {
      reference: `mock_${input.type}_${input.userId}_${Date.now()}`,
      status: 'VERIFIED',
      payload: { provider: 'mock', type: input.type, verifiedAt: new Date().toISOString() },
    };
  }
}
