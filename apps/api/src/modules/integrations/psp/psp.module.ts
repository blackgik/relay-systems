import { Module } from '@nestjs/common';
import { LedgerModule } from '../../ledger/ledger.module';
import { MockPaymentProvider } from './mock-psp.provider';
import { PspController } from './psp.controller';

export const PSP_PROVIDER = 'PSP_PROVIDER';

@Module({
  imports: [LedgerModule],
  controllers: [PspController],
  providers: [{ provide: PSP_PROVIDER, useClass: MockPaymentProvider }],
  exports: [PSP_PROVIDER],
})
export class PspModule {}
