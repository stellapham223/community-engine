import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Joy Community Engine',
  description: 'Community monitoring + AEO authority builder for Joy Subscriptions',
};

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-primary text-lg">
              🌐 Joy Community
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">Today</NavLink>
              <NavLink href="/mentions">Mentions</NavLink>
              <NavLink href="/giveback">Giveback</NavLink>
              <NavLink href="/revisit">Revisit</NavLink>
              <NavLink href="/reputation">Reputation</NavLink>
              <NavLink href="/stats">Stats</NavLink>
              <NavLink href="/topics">Topics</NavLink>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({href, children}) {
  return (
    <Link href={href} className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors">
      {children}
    </Link>
  );
}
