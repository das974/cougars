'use client';

import AuthModal from '@/components/AuthModal';

interface Props {
  onAuth: (isAdmin: boolean) => void;
}

export default function AppLogin({ onAuth }: Props) {
  return (
    <AuthModal
      fullScreen
      title="Battersea Cougars"
      endpoint="/api/app-auth"
      onSuccess={(d) => onAuth((d.isAdmin as boolean) ?? false)}
    />
  );
}
