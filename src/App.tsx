import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KundenstammPage from '@/pages/KundenstammPage';
import KundenstammDetailPage from '@/pages/KundenstammDetailPage';
import MonteurePage from '@/pages/MonteurePage';
import MonteureDetailPage from '@/pages/MonteureDetailPage';
import TerminverwaltungPage from '@/pages/TerminverwaltungPage';
import TerminverwaltungDetailPage from '@/pages/TerminverwaltungDetailPage';
import PublicFormKundenstamm from '@/pages/public/PublicForm_Kundenstamm';
import PublicFormMonteure from '@/pages/public/PublicForm_Monteure';
import PublicFormTerminverwaltung from '@/pages/public/PublicForm_Terminverwaltung';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a43dc0ccfb23aec5c0f285d" element={<PublicFormKundenstamm />} />
              <Route path="public/6a43dc0f0c642509c50578ea" element={<PublicFormMonteure />} />
              <Route path="public/6a43dc10e4117afe74f02ece" element={<PublicFormTerminverwaltung />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="kundenstamm" element={<KundenstammPage />} />
                <Route path="kundenstamm/:id" element={<KundenstammDetailPage />} />
                <Route path="monteure" element={<MonteurePage />} />
                <Route path="monteure/:id" element={<MonteureDetailPage />} />
                <Route path="terminverwaltung" element={<TerminverwaltungPage />} />
                <Route path="terminverwaltung/:id" element={<TerminverwaltungDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
