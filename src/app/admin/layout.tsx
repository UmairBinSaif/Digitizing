import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Control Center | Ultimate Digitizing',
  description: 'Master administration orchestrator',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
