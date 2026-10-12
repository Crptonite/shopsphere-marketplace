import AccountShell from '@/components/AccountShell';
import DesignHub from './DesignHub';

export const metadata = { title: 'Design — ShopSphere' };

export default function DesignPage() {
  return <AccountShell active="/design">
    <DesignHub />
  </AccountShell>;
}
