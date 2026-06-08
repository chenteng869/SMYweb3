import { useEffect } from 'react';
import { PAGE_TITLES } from '@/lib/constants';

export function usePageTitle(title?: string, route?: string) {
  useEffect(() => {
    if (title) {
      document.title = `${title} · 太初国链`;
    } else if (route && PAGE_TITLES[route]) {
      document.title = `${PAGE_TITLES[route]} · 太初国链`;
    } else {
      document.title = '太初国链 · 萨摩亚SPV × 海购星Dapp';
    }
  }, [title, route]);
}

export default usePageTitle;
