import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Length, Min } from 'class-validator';
import { WalletService } from './wallet.service';
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

@Controller('wallet')
@UseGuards(JwtGuard)
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  balances(@CurrentUser() user: { id: string }) {
    return this.wallet.balances(user.id);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: { id: string }, @Query('take') take?: string) {
    return this.wallet.transactions(user.id, take ? Number(take) : 50);
  }

  @Post('topup')
  topup(@CurrentUser() user: { id: string }, @Body() dto: MoneyDto) {
    return this.wallet.topup(user.id, dto.amountMinors, dto.currency.toUpperCase());
  }

  @Post('withdraw')
  withdraw(@CurrentUser() user: { id: string }, @Body() dto: MoneyDto) {
    return this.wallet.withdraw(user.id, dto.amountMinors, dto.currency.toUpperCase());
  }
}
