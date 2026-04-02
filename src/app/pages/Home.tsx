import React from 'react';
import { Link } from 'react-router';
import { ArrowRight, HeartHandshake, Sparkles, Trophy, ShieldCheck, Heart, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { listCharities, type CharityRecord } from '../data/platform';

export function Home() {
  const [featuredCharity, setFeaturedCharity] = React.useState<CharityRecord | null>(null);
  const [charities, setCharities] = React.useState<CharityRecord[]>([]);

  React.useEffect(() => {
    listCharities().then((items) => {
      setCharities(items.slice(0, 3));
      setFeaturedCharity(items.find((item) => item.featured) ?? items[0] ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8faf5_0%,#f3efe4_45%,#ffffff_100%)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-secondary shadow-md">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-primary">Impact Golf</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Play with purpose</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/charities" className="hover:text-foreground">Charities</Link>
            <Link to="/how-it-works" className="hover:text-foreground">How It Works</Link>
            <Link to="/login" className="hover:text-foreground">Sign In</Link>
          </nav>
          <Button asChild className="shadow-sm">
            <Link to="/signup">Start Your Membership</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" />
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Charity-first golf membership platform
              </div>
              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                  Turn your last five rounds into
                  <span className="text-primary"> monthly impact.</span>
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  Subscribe, record Stableford scores, join monthly prize draws, and send a portion of every win to a cause you care about. This is golf membership reimagined around generosity, not country-club cliches.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 px-6 text-base shadow-md" asChild>
                  <Link to="/signup">
                    Join The Platform
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 text-base bg-background/70" asChild>
                  <Link to="/charities">Explore Charities</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Monthly Draws', value: '5-number reward engine', icon: Trophy },
                  { label: 'Flexible Plans', value: 'Monthly & yearly billing', icon: ShieldCheck },
                  { label: 'Cause-Led Impact', value: 'Choose your charity percentage', icon: Heart },
                ].map((item) => (
                  <Card key={item.label} className="border-border/60 bg-background/70 shadow-sm">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
              <div className="overflow-hidden rounded-[32px] border border-border/60 bg-card shadow-[0_30px_80px_rgba(15,81,50,0.12)]">
                <div className="border-b border-border/50 bg-primary p-7 text-primary-foreground">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary/80">How Members Win</p>
                  <h2 className="mt-3 text-3xl font-bold text-secondary">Simple flow, real stakes, visible good.</h2>
                </div>
                <div className="space-y-6 p-7">
                  {[
                    { step: '01', title: 'Subscribe', desc: 'Choose monthly or yearly access and activate your draw eligibility.' },
                    { step: '02', title: 'Record Your Scores', desc: 'Keep your latest 5 Stableford rounds ready for the monthly engine.' },
                    { step: '03', title: 'Direct Your Impact', desc: 'Set your charity and contribution percentage before results are published.' },
                    { step: '04', title: 'Win & Verify', desc: 'If you hit 3, 4, or 5 matches, submit proof and receive payout status updates.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary font-bold shadow-inner">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Featured Cause</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Start your membership with a mission already in focus.</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/charities">View All Charities</Link>
            </Button>
          </div>

          {featuredCharity ? (
            <Card className="overflow-hidden border-border/60 bg-card shadow-lg">
              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative min-h-[320px]">
                  <ImageWithFallback src={featuredCharity.imageUrl} alt={featuredCharity.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/60 via-transparent to-transparent" />
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-10">
                  <div className="inline-flex w-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    Spotlight Charity
                  </div>
                  <h3 className="mt-4 text-3xl font-bold text-foreground">{featuredCharity.name}</h3>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{featuredCharity.category}</p>
                  <p className="mt-5 text-base leading-7 text-muted-foreground">{featuredCharity.description}</p>
                  {featuredCharity.impactHeadline ? (
                    <p className="mt-4 rounded-2xl bg-primary/5 px-4 py-3 text-sm font-medium leading-6 text-primary">
                      {featuredCharity.impactHeadline}
                    </p>
                  ) : null}
                  {featuredCharity.upcomingEvents[0] ? (
                    <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Upcoming Event</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{featuredCharity.upcomingEvents[0].title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {featuredCharity.upcomingEvents[0].date} · {featuredCharity.upcomingEvents[0].location}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild>
                      <Link to={`/charities/${featuredCharity.slug}`}>View Charity Profile</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/signup">Choose This Cause</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary/80">Charity Directory</p>
              <h2 className="mt-2 text-3xl font-bold text-secondary">Visitors can browse causes before they ever subscribe.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {charities.map((charity) => (
                <Card key={charity.id} className="overflow-hidden border-primary-foreground/10 bg-primary-foreground/95 text-foreground shadow-md">
                  <div className="h-48 overflow-hidden">
                    <ImageWithFallback src={charity.imageUrl} alt={charity.name} className="h-full w-full object-cover" />
                  </div>
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{charity.category}</p>
                      <h3 className="mt-2 text-2xl font-bold">{charity.name}</h3>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{charity.shortDescription}</p>
                    {charity.upcomingEvents[0] ? (
                      <p className="rounded-2xl bg-muted/60 px-3 py-2 text-sm text-foreground">
                        Next event: {charity.upcomingEvents[0].title}
                      </p>
                    ) : null}
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={`/charities/${charity.slug}`}>
                        Learn More
                        <Search className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
