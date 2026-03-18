'use client';

import { useState, useEffect } from 'react';
import { FiLock, FiUnlock } from 'react-icons/fi';
import AuthModal from '@/components/AuthModal';

interface Props {
  isAdmin: boolean;
  onAdminChange: (v: boolean) => void;
}

export default function AdminButton({ isAdmin, onAdminChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleToggle() {
    if (isAdmin) { onAdminChange(false); }
    else { setModalOpen(true); }
  }

  return (
    <>
      <button
        onClick={handleToggle}
        title={isAdmin ? 'Exit admin mode' : 'Admin login'}
        className={[
          'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
          isAdmin
            ? 'text-green bg-green/10 ring-1 ring-inset ring-green/30'
            : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800',
        ].join(' ')}
      >
        {isAdmin ? <FiUnlock className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
      </button>

      {modalOpen && (
        <AuthModal
          title="Admin Access"
          endpoint="/api/admin-auth"
          onSuccess={() => { onAdminChange(true); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
          submitLabel="Unlock"
        />
      )}
    </>
  );
}
