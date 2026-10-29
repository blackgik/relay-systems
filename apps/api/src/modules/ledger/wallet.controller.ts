import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';

class MoneyDto {
  @IsInt()
  @Min(1)
  amountMinors!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;
}

class TopupDto extends MoneyDto {
  @IsOptional()
  @IsIn(['card', 'transfer'])
  method?: 'card' | 'transfer';
}

// Withdrawals go to the verified payout account on file, so no bank fields.
class WithdrawDto extends MoneyDto {}

class ReferenceDto {
  @IsString()
  @Length(3, 80)
  reference!: string;
}

@Controller('wallet')
@UseGuards(JwtGuard)
export class WalletController {
  constructor(
    private wallet: WalletService,
    private invoices: InvoiceService
  ) {}

  @Get()
  balances(@CurrentUser() user: { id: string }) {
    return this.wallet.balances(user.id);
  }

  @Get('summary')
  summary(@CurrentUser() user: { id: string }) {
    return this.wallet.summary(user.id);
  }

  @Get('invoices')
  invoiceList(@CurrentUser() user: { id: string }) {
    return this.invoices.listForUser(user.id);
  }

  @Get('banks')
  banks() {
    return this.wallet.banks();
  }

  @Get('transactions')
  transactions(
    @CurrentUser() user: { id: string },
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number
  ) {
    return this.wallet.transactions(user.id, take);
  }

  @Post('topup')
  topup(@CurrentUser() user: { id: string }, @Body() dto: TopupDto) {
    return this.wallet.startTopup(user.id, {
      amountMinors: dto.amountMinors,
      currency: dto.currency.toUpperCase(),
      method: dto.method ?? 'card',
    });
  }

  @Post('topup/verify')
  verifyTopup(@CurrentUser() user: { id: string }, @Body() dto: ReferenceDto) {
    return this.wallet.verifyTopup(user.id, dto.reference);
  }

  @Post('withdraw')
  withdraw(@CurrentUser() user: { id: string }, @Body() dto: WithdrawDto) {
    return this.wallet.startWithdraw(user.id, { amountMinors: dto.amountMinors, currency: dto.currency.toUpperCase() });
  }

  @Get('orders')
  orders(
    @CurrentUser() user: { id: string },
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number
  ) {
    return this.wallet.orders(user.id, take);
  }

  @Get('payout-account')
  payoutAccount(@CurrentUser() user: { id: string }) {
    return this.wallet.payoutAccount(user.id);
  }
}
