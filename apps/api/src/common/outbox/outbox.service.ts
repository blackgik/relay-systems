import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Transactional outbox writer. Callers pass the transaction client so the
// state change and its event row commit atomically; a worker publishes
// unpublished rows to the queue (later slice).
@Injectable()
export class OutboxService {
  write(tx: Prisma.TransactionClient, type: string, payload: Prisma.InputJsonValue) {
    return tx.outboxEvent.create({ data: { type, payload } });
  }
}
