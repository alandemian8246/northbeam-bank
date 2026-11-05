import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const Overview = lazy(() => import('@/pages/Overview'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Payments = lazy(() => import('@/pages/Payments'));
const Cards = lazy(() => import('@/pages/Cards'));
const Insights = lazy(() => import('@/pages/Insights'));
const Settings = lazy(() => import('@/pages/Settings'));
const AccountsList = lazy(() => import('@/pages/Accounts').then((m) => ({ default: m.AccountsList })));
const AccountDetail = lazy(() => import('@/pages/Accounts').then((m) => ({ default: m.AccountDetail })));

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-subtle" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-subtle" />)}
      </div>
      <div className="h-72 rounded-xl bg-subtle" />
    </div>
  );
}

function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card>
        <EmptyState icon={Compass} title="Nothing lives at this address" description="The page you’re looking for doesn’t exist or has moved." action={<Link to="/"><Button>Back to overview</Button></Link>} />
      </Card>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {[
            { path: '/', el: <Overview /> },
            { path: '/accounts', el: <AccountsList /> },
            { path: '/accounts/:id', el: <AccountDetail /> },
            { path: '/transactions', el: <Transactions /> },
            { path: '/payments', el: <Payments /> },
            { path: '/cards', el: <Cards /> },
            { path: '/insights', el: <Insights /> },
            { path: '/settings', el: <Settings /> },
          ].map(({ path, el }) => (
            <Route key={path} path={path} element={<Suspense fallback={<PageSkeleton />}>{el}</Suspense>} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
