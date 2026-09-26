import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Profile moved to Settings in v0.5; keep old links working.
export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/settings'); }, [router]);
  return null;
}
