import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedUser = { id: string; email: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest().user as AuthenticatedUser;
  }
);
