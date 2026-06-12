import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

export interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export default function TopBar({
  title,
  showBack = false,
  onBack,
  rightAction,
  className,
  transparent = false,
}: TopBarProps) {
  const navigate = useNavigate();
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNotifications = () => {
    navigate('/notifications');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-50 h-12 flex items-center px-4',
        transparent ? 'bg-transparent' : 'glass-light border-b border-white/[0.06]',
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left */}
      <div className="flex items-center w-20">
        {showBack ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2 text-text-primary"
          >
            <ArrowLeft size={24} strokeWidth={1.5} />
          </motion.button>
        ) : (
          <span className="text-h4 font-display font-bold text-coral">WOPC</span>
        )}
      </div>

      {/* Center */}
      <div className="flex-1 text-center">
        <h1 className="text-h3 text-text-primary truncate">{title}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center justify-end gap-1 w-20">
        {rightAction || (
          <>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNotifications}
              className="relative w-10 h-10 flex items-center justify-center text-text-primary"
            >
              <Bell size={22} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSettings}
              className="w-10 h-10 flex items-center justify-center text-text-primary"
            >
              <Settings size={22} strokeWidth={1.5} />
            </motion.button>
          </>
        )}
      </div>
    </motion.header>
  );
}
