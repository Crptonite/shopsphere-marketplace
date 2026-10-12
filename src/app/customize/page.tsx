import AccountShell from '@/components/AccountShell';
import CustomizeHub from './CustomizeHub';

export const metadata = { title: 'Customize — ShopSphere' };

export default function CustomizePage() {
  return <AccountShell active="/customize">
    <CustomizeHub />
  </AccountShell>;
}
