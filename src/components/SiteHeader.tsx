import { getCurrentUser } from '@/lib/auth';
import { cartCount } from '@/lib/cart';
import { hasDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { BROWSER_COOKIE, listAccounts, vaultEnabled } from '@/lib/account-vault';
import HeaderBar from '@/components/HeaderBar';

/** Global navbar for every route: loads the user and cart count, renders the interactive bar. */
export default async function SiteHeader() {
  const user = await getCurrentUser().catch(() => null);
  const count = hasDb() ? await cartCount(user) : 0;
  const browserId = (await cookies()).get(BROWSER_COOKIE)?.value;
  const vault = vaultEnabled();
  const accounts = vault && browserId
    ? (await listAccounts(browserId).catch(() => [])).filter((a) => a.userId !== user?.id)
    : [];
  return <HeaderBar
    user={user ? { displayName: user.displayName, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin } : null}
    cartCount={count}
    vault={vault}
    accounts={accounts}
  />;
}
