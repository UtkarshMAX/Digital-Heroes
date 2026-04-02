import React from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, HeartHandshake, MapPinned } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { listCharities, type CharityRecord } from '../data/platform';

export function CharityProfile() {
  const { slug } = useParams();
  const [charity, setCharity] = React.useState<CharityRecord | null>(null);
  const [related, setRelated] = React.useState<CharityRecord[]>([]);

  React.useEffect(() => {
    listCharities().then((items) => {
      const current = items.find((item) => item.slug === slug) ?? null;
      setCharity(current);
      setRelated(items.filter((item) => item.slug !== slug).slice(0, 2));
    });
  }, [slug]);

  if (!charity) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Charity not found</h1>
          <p className="mt-3 text-muted-foreground">This charity profile is unavailable right now.</p>
          <Button className="mt-6" asChild>
            <Link to="/charities">Back to Directory</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8faf6_0%,#ffffff_100%)]">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-secondary shadow-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">Impact Golf</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Charity Profile</p>
            </div>
          </Link>
          <Button variant="outline" asChild>
            <Link to="/charities">Browse More Causes</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <Button variant="ghost" className="mb-6 px-0 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/charities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Charity Directory
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[32px] border border-border/60 bg-card shadow-lg">
            <div className="h-[420px] overflow-hidden">
              <ImageWithFallback src={charity.imageUrl} alt={charity.name} className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {charity.category}
              </span>
              <h1 className="mt-4 text-5xl font-black tracking-tight text-foreground">{charity.name}</h1>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{charity.description}</p>
              {charity.impactHeadline ? (
                <p className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 px-5 py-4 text-base leading-7 text-primary">
                  {charity.impactHeadline}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border/60 bg-background/80 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Upcoming Events</p>
                      <p className="text-sm text-muted-foreground">
                        {charity.upcomingEvents[0]
                          ? `${charity.upcomingEvents[0].title} on ${charity.upcomingEvents[0].date}`
                          : 'New event announcements are coming soon.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-background/80 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary/50 p-3 text-primary">
                      <MapPinned className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Impact Footprint</p>
                      <p className="text-sm text-muted-foreground">{charity.locationLabel ?? 'Featured in the member donation rotation'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {charity.upcomingEvents.length > 0 ? (
              <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
                <div className="mt-5 space-y-3">
                  {charity.upcomingEvents.map((event) => (
                    <div key={`${event.title}-${event.date}`} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                      <p className="text-lg font-semibold text-foreground">{event.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{event.date} · {event.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[28px] border border-border/60 bg-primary p-7 text-primary-foreground shadow-sm">
              <h2 className="text-2xl font-bold text-secondary">Why members choose this cause</h2>
              <p className="mt-3 text-primary-foreground/80 leading-7">
                Members who select {charity.name} direct a percentage of their wins and subscription-aligned contributions toward tangible, trackable outcomes. The goal is to make giving feel visible, personal, and tied to progress.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button variant="secondary" className="text-primary" asChild>
                  <Link to="/signup">Choose This Charity At Signup</Link>
                </Button>
                <Button variant="outline" className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20" asChild>
                  <Link to="/login">Sign In To Update Preference</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Explore More Causes</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {related.map((item) => (
                <Card key={item.id} className="overflow-hidden border-border/60 bg-card shadow-sm">
                  <div className="h-52 overflow-hidden">
                    <ImageWithFallback src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{item.category}</p>
                    <h3 className="mt-2 text-2xl font-bold text-foreground">{item.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.shortDescription}</p>
                    <Button variant="outline" className="mt-5" asChild>
                      <Link to={`/charities/${item.slug}`}>View Profile</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
