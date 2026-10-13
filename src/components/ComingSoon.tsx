import Link from 'next/link';

/** Placeholder page for account features that are not built yet. */
export default function ComingSoon({ title, text }: { title: string; text: string }) {
  return <main className="page page-narrow">
    <div className="page-head"><div><div className="eyebrow">COMING SOON</div><h1>{title}</h1><p>{text}</p></div></div>
    <div className="empty"><h3>Not available yet</h3><p>Back to your <Link href="/account">account</Link>.</p></div>
  </main>;
}
