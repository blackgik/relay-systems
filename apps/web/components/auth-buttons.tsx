'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Typography } from '@/ui/elements';
import { useAuth } from '@/lib/auth';

export function AuthButtons() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) return null;
  if (!user) {
    return (
      <Link href="/auth/signin" className="text-body-m font-medium text-text-brand">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Typography size="body-s" color="secondary" as="span">
        {user.fullName} · {user.kycTier}
      </Typography>
      <Button
        label="Sign out"
        variant="text"
        size="sm"
        onClick={() => {
          logout();
          router.push('/');
        }}
      />
    </div>
  );
}
