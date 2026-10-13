import SampleBanner from '@/components/trade/SampleBanner';
import DcaCalculator from '@/components/trade/DcaCalculator';
import RemindersPanel from '@/components/trade/RemindersPanel';

export const metadata = { title: 'DCA reminders — Trade — ShopSphere' };

export default function DcaRemindersPage() {
  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">WORKSPACE</div><h1>DCA reminders</h1><p>Plan a regular investment and get reminded when it is due.</p></div></div>
    <SampleBanner />
    <div className="grid-2" style={{ marginTop: 14, alignItems: 'start' }}>
      <DcaCalculator />
      <RemindersPanel />
    </div>
  </main>;
}
