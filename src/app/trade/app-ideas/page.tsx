export const metadata = { title: 'Mobile app projects — Trade — ShopSphere' };

const IDEAS = [
  'To-Do List App', 'Expense Tracker', 'Fitness and Workout App', 'Recipe and Meal Planning App', 'Language Learning App',
  'Music Player', 'Note-Taking App', 'News Reader', 'Location-Based Reminder App', 'Social Networking App',
  'Multiple Weather App', 'Multiple QR Code Scanner', 'Multiple Budgeting and Finance App', 'Multiple Meditation and Mindfulness App', 'Multiple Event Countdown App',
  'Habit Tracker', 'Flashcard App', 'Ride-Sharing App', 'Document Scanner', 'Navigation App',
];

export default function AppIdeasPage() {
  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">PROJECT IDEAS</div><h1>Mobile app projects</h1><p>Ideas 21 to 40.</p></div></div>
    <ol start={21} className="card" style={{ padding: '18px 18px 18px 40px', lineHeight: 1.9 }}>
      {IDEAS.map((t) => <li key={t}>{t}</li>)}
    </ol>
  </main>;
}
