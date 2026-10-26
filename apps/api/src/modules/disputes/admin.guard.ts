import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Demo admin check: comma-separated allowlist. Production needs real roles.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const allowlist = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!allowlist.includes(String(req.user?.email ?? '').toLowerCase())) {
      throw new ForbiddenException('Admin only');
    }
    return true;
  }
}
