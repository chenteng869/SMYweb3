import { useState, useEffect, useRef } from 'react';

interface ScrollDirectionOptions {
  threshold?: number;
}

export function useScrollDirection(options: ScrollDirectionOptions = {}) {
  const { threshold = 10 } = options;
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      setScrollY(currentScrollY);
      setIsAtTop(currentScrollY < threshold);

      if (Math.abs(currentScrollY - lastScrollY.current) < threshold) {
        return;
      }

      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { scrollDirection, isAtTop, scrollY };
}

export default useScrollDirection;
