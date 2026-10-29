import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PaystackModule } from '../integrations/paystack/paystack.module';
import { OutboxService } from '../../common/outbox/outbox.service';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { InvoiceService } from './invoice.service';
import { LedgerService } from './ledger.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [IdentityModule, PaystackModule],
  controllers: [EscrowController, WalletController],
  providers: [LedgerService, WalletService, EscrowService, InvoiceService, OutboxService],
  exports: [LedgerService, WalletService, EscrowService, InvoiceService],
})
export class LedgerModule {}
