import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from './BottomNav';

export interface MobileLayoutProps {
  showNav?: boolean;
  className?: string;
}

export default function MobileLayout({ showNav }: MobileLayoutProps) {
  const location = useLocation();
  const shouldShowNav = showNav !== false;

  return (
    <div className="min-h-screen bg-bg-dark flex justify-center">
      <div className="w-full max-w-mobile min-h-screen bg-bg-dark relative flex flex-col">
        <main className={shouldShowNav ? 'flex-1 pb-16' : 'flex-1'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0.5, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0.5, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        {shouldShowNav && <BottomNav />}
      </div>
    </div>
  );
}
