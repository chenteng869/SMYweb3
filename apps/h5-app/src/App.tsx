import { Routes, Route } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import ErrorBoundary from '@/components/ErrorFallback';

// App Tab Pages
import Home from '@/pages/app/Home';
import Discover from '@/pages/app/Discover';
import Services from '@/pages/app/Services';
import AiBrain from '@/pages/app/AiBrain';
import Profile from '@/pages/app/Profile';

// Sub Pages
import TaxCalculator from '@/pages/sub/TaxCalculator';
import LegalHub from '@/pages/sub/LegalHub';
import VideoCenter from '@/pages/sub/VideoCenter';
import VideoPlayer from '@/pages/sub/VideoPlayer';
import MediaCenter from '@/pages/sub/MediaCenter';
import AiChatDetail from '@/pages/sub/AiChatDetail';
import CompanyRegister from '@/pages/sub/CompanyRegister';
import PaymentConsole from '@/pages/sub/PaymentConsole';
import BankAccount from '@/pages/sub/BankAccount';
import DlcLevel from '@/pages/sub/DlcLevel';
import DocumentCenter from '@/pages/sub/DocumentCenter';
import Settings from '@/pages/sub/Settings';
import Notifications from '@/pages/sub/Notifications';
import DidIdentity from '@/pages/sub/DidIdentity';
import AiBusinessCard from '@/pages/sub/AiBusinessCard';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Mobile App Layout */}
        <Route element={<MobileLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/services" element={<Services />} />
          <Route path="/ai" element={<AiBrain />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Sub Pages (no bottom nav) */}
        <Route element={<MobileLayout showNav={false} />}>
          <Route path="/tax-calculator" element={<TaxCalculator />} />
          <Route path="/legal-hub" element={<LegalHub />} />
          <Route path="/video-center" element={<VideoCenter />} />
          <Route path="/video/:id" element={<VideoPlayer />} />
          <Route path="/media-center" element={<MediaCenter />} />
          <Route path="/ai-chat/:agentId" element={<AiChatDetail />} />
          <Route path="/company-register" element={<CompanyRegister />} />
          <Route path="/payment-console" element={<PaymentConsole />} />
          <Route path="/bank-account" element={<BankAccount />} />
          <Route path="/dlc-level" element={<DlcLevel />} />
          <Route path="/documents" element={<DocumentCenter />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/did-identity" element={<DidIdentity />} />
          <Route path="/ai-business-card" element={<AiBusinessCard />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
