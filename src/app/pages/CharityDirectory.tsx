import React from 'react';
import { Link } from 'react-router';
import { Search, ArrowRight, HeartHandshake } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { listCharities, type CharityRecord } from '../data/platform';

export function CharityDirectory() {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('All');
  const [charities, setCharities] = React.useState<CharityRecord[]>([]);

  React.useEffect(() => {
    listCharities().then(setCharities);
  }, []);

  const categories = ['All', ...new Set(charities.map((item) => item.category))];
  const visible = charities.filter((charity) => {
    const matchesCategory = filter === 'All' || charity.category === filter;
    const search = query.trim().toLowerCase();
    const matchesQuery =
      search.length === 0
      || charity.name.toLowerCase().includes(search)
      || charity.shortDescription.toLowerCase().includes(search)
      || charity.category.toLowerCase().includes(search);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf7_0%,#f7f4e9_100%)]">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-secondary shadow-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">Impact Golf</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Charity Directory</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Join Now</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Browse Causes</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-foreground">Find the mission behind your membership.</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Public visitors can explore every supported charity, understand each mission, and then subscribe with confidence knowing where their contribution percentage can go.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-[28px] border border-border/60 bg-background/80 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by charity, category, or mission"
              className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((charity) => (
            <Card key={charity.id} className="overflow-hidden border-border/60 bg-card shadow-sm">
              <div className="h-56 overflow-hidden">
                <ImageWithFallback src={charity.imageUrl} alt={charity.name} className="h-full w-full object-cover" />
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {charity.category}
                  </span>
                  {charity.featured ? (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                      Featured
                    </span>
                  ) : null}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{charity.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{charity.shortDescription}</p>
                  {charity.locationLabel ? (
                    <p className="mt-3 text-sm font-medium text-foreground/80">{charity.locationLabel}</p>
                  ) : null}
                  {charity.upcomingEvents[0] ? (
                    <p className="mt-2 text-sm text-primary">
                      Next event: {charity.upcomingEvents[0].title} on {charity.upcomingEvents[0].date}
                    </p>
                  ) : null}
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/charities/${charity.slug}`}>
                    View Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
