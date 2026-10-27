import { Module } from '@nestjs/common';
import { PaystackClient } from './paystack.client';

@Module({
  providers: [PaystackClient],
  exports: [PaystackClient],
})
export class PaystackModule {}
