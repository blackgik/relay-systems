import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { AdminGuard } from '../disputes/admin.guard';
import { OnboardingService } from './onboarding.service';
import { BankDto, DocumentsDto, IdentityDto, PersonalDto, ReviewDto } from './onboarding.dto';

@Controller('kyc/onboarding')
@UseGuards(JwtGuard)
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Get()
  status(@CurrentUser() user: { id: string }) {
    return this.onboarding.status(user.id);
  }

  @Put('personal')
  personal(@CurrentUser() user: { id: string }, @Body() dto: PersonalDto) {
    return this.onboarding.savePersonal(user.id, dto);
  }

  @Put('identity')
  identity(@CurrentUser() user: { id: string }, @Body() dto: IdentityDto) {
    return this.onboarding.saveIdentity(user.id, dto);
  }

  @Put('documents')
  documents(@CurrentUser() user: { id: string }, @Body() dto: DocumentsDto) {
    return this.onboarding.saveDocuments(user.id, dto);
  }

  @Get('banks')
  banks() {
    return this.onboarding.banks();
  }

  @Post('bank/resolve')
  @HttpCode(200)
  resolve(@CurrentUser() user: { id: string }, @Body() dto: BankDto) {
    return this.onboarding.resolveBank(user.id, dto);
  }

  @Put('bank')
  bank(@CurrentUser() user: { id: string }, @Body() dto: BankDto) {
    return this.onboarding.saveBank(user.id, dto);
  }

  @Post('bank/refresh')
  @HttpCode(200)
  refresh(@CurrentUser() user: { id: string }) {
    return this.onboarding.refreshBvnMatch(user.id);
  }

  @Post('submit')
  @HttpCode(200)
  submit(@CurrentUser() user: { id: string }) {
    return this.onboarding.submit(user.id);
  }

  @Get('admin/pending')
  @UseGuards(AdminGuard)
  pending() {
    return this.onboarding.pending();
  }

  @Post('admin/:userId/review')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  review(@Param('userId') userId: string, @Body() dto: ReviewDto) {
    return this.onboarding.review(userId, dto.decision, dto.note);
  }
}
