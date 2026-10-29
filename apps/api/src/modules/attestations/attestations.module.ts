import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AttestationsController } from './attestations.controller';
import { AttestationsService } from './attestations.service';

@Module({
  imports: [IdentityModule],
  controllers: [AttestationsController],
  providers: [AttestationsService],
})
export class AttestationsModule {}
