import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass, Briefcase, Brain, User } from 'lucide-react';
import { NAV_TABS } from '@/lib/constants';

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Home,
  Compass,
  Briefcase,
  Brain,
  User,
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111827]/95 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="max-w-[430px] mx-auto h-16 flex items-center justify-around">
        {NAV_TABS.map((tab) => {
          const Icon = iconMap[tab.icon];
          const isActive = location.pathname === tab.path;
          return (
            <motion.button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              style={{
                color: isActive ? '#F6A623' : '#6B7280',
                background: 'none',
                border: 'none',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div animate={isActive ? { scale: 1.05 } : { scale: 1 }}>
                {Icon ? <Icon size={24} strokeWidth={1.5} /> : <span>?</span>}
              </motion.div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 500 : 400 }}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: '#F6A623' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
