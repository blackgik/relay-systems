import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OutboxService } from '../../common/outbox/outbox.service';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { LedgerService } from './ledger.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [IdentityModule],
  controllers: [EscrowController, WalletController],
  providers: [LedgerService, WalletService, EscrowService, OutboxService],
  exports: [LedgerService, WalletService, EscrowService],
})
export class LedgerModule {}
