import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminControlClient from '../AdminControlClient';
import AdminSecretGate from '@/components/AdminSecretGate';
import { getPendingProducts, getPendingSellers, getAllPayoutRequests } from '@/lib/seller-actions';
import { getAllOrders } from '@/lib/order-actions';
import { getAllCustomRequests } from '@/lib/custom-request-actions';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const session: any = await getServerSession(authOptions);
  const cookieStore = cookies();
  const isAuthorized = session?.user?.role === 'ADMIN' || cookieStore.get('admin_secret_session')?.value === 'authenticated';

  if (!isAuthorized) {
    return <AdminSecretGate />;
  }

  const [pendingProducts, payoutRequests, orders, pendingSellers, customRequests] = await Promise.all([
    getPendingProducts().catch((err) => {
      console.error('Failed to fetch pending products:', err);
      return [];
    }),
    getAllPayoutRequests().catch((err) => {
      console.error('Failed to fetch payout requests:', err);
      return [];
    }),
    getAllOrders().catch((err) => {
      console.error('Failed to fetch orders:', err);
      return [];
    }),
    getPendingSellers().catch((err) => {
      console.error('Failed to fetch pending sellers:', err);
      return [];
    }),
    getAllCustomRequests().catch((err) => {
      console.error('Failed to fetch custom requests:', err);
      return [];
    })
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white font-mono tracking-widest text-xs">LOADING ORDERS...</div>}>
      <AdminControlClient 
        initialPendingProducts={pendingProducts}
        initialPayoutRequests={payoutRequests}
        initialOrders={orders}
        initialPendingSellers={pendingSellers}
        initialCustomRequests={customRequests}
        initialTab="orders"
      />
    </Suspense>
  );
}
