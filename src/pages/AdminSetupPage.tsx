
import React from 'react';
import { AdminSetup } from '@/components/AdminSetup';

export const AdminSetupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AdminSetup />
      </div>
    </div>
  );
};
