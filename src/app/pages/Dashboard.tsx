import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, DollarSign, Star, Heart, Award, LineChart, Ticket } from 'lucide-react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '../providers/AuthProvider';
import { getCharityPreference, getSubscription, listCharities, listScores } from '../data/platform';

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [scoreCount, setScoreCount] = React.useState(0);
  const [subscriptionLabel, setSubscriptionLabel] = React.useState('No active plan');
  const [subscriptionMeta, setSubscriptionMeta] = React.useState('Choose a plan to unlock draws');
  const [subscriptionTone, setSubscriptionTone] = React.useState('Active');
  const [charityName, setCharityName] = React.useState('your selected charity');
  const [charityPercent, setCharityPercent] = React.useState(10);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    Promise.all([
      listScores(user.id),
      getSubscription(user.id),
      getCharityPreference(user.id),
      listCharities(),
    ]).then(([scores, subscription, preference, charities]) => {
      if (!active) {
        return;
      }

      setScoreCount(scores.length);

      if (subscription) {
        setSubscriptionLabel(subscription.planCode === 'yearly' ? 'Yearly Plan' : 'Monthly Plan');
        setSubscriptionTone(subscription.status);
        setSubscriptionMeta(
          subscription.status === 'canceled' && subscription.canceledAt
            ? `Cancellation scheduled • Ends ${subscription.renewalAt ? new Date(subscription.renewalAt).toLocaleDateString() : new Date(subscription.canceledAt).toLocaleDateString()}`
            : subscription.renewalAt
              ? `${subscription.status === 'active' ? 'Active' : 'Status: ' + subscription.status} • Renews ${new Date(subscription.renewalAt).toLocaleDateString()}`
              : `Status: ${subscription.status}`
        );
      }

      if (preference) {
        const charity = charities.find((item) => item.id === preference.charityId);
        setCharityName(charity?.name ?? charityName);
        setCharityPercent(preference.contributionPercent);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const stats = [
    { title: "Current Prize Pool", value: "$50,000", subtitle: "Jackpot for next draw", icon: DollarSign, isPrimary: true },
    { title: "Next Draw In", value: "2d 14h", subtitle: "Friday, 8:00 PM", icon: Clock },
    { title: "Active Scores", value: `${scoreCount} / 5`, subtitle: scoreCount >= 5 ? 'Your draw pool is full' : `You can add ${5 - scoreCount} more scores`, icon: Award },
    { title: "Your Impact", value: `${charityPercent}%`, subtitle: `Directed to ${charityName}`, icon: Heart, isSecondary: true },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <Card className={`border-none shadow-sm h-full ${stat.isPrimary ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : stat.isSecondary ? 'bg-secondary text-primary shadow-md shadow-secondary/20' : 'bg-card'}`}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className={`text-sm font-medium ${stat.isPrimary || stat.isSecondary ? 'opacity-90' : 'text-muted-foreground'}`}>
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.isPrimary ? 'text-secondary' : stat.isSecondary ? 'text-primary' : 'text-primary'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.isPrimary ? 'text-secondary' : stat.isSecondary ? 'text-primary' : 'text-foreground'}`}>
                  {stat.value}
                </div>
                <p className={`text-xs mt-2 font-medium ${stat.isPrimary || stat.isSecondary ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div 
          className="xl:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="h-full shadow-sm border-border/50">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <CardTitle className="text-xl">Impact Timeline</CardTitle>
              <CardDescription>Your recent interactions and contributions</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {[
                  { type: 'score', title: 'Performance Recorded', time: '2 hours ago', desc: 'You logged 42 points. Score pool updated.', icon: Award },
                  { type: 'draw', title: 'Draw Results Announced', time: '2 days ago', desc: 'Matched 3 numbers! $50 won and 10% auto-donated.', icon: Ticket },
                  { type: 'charity', title: 'Charity Milestone', time: '1 week ago', desc: 'Your contributions to WaterAid reached $500.', icon: Heart },
                ].map((item, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-secondary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-muted/30 border border-border/50 shadow-sm transition-all hover:bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                        <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions & Subscription Status */}
        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="shadow-sm border-border/50 bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center justify-between">
                Subscription Status
                <Star className="w-5 h-5 text-secondary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-secondary mb-1">{loading ? 'Loading...' : subscriptionLabel}</div>
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-primary-foreground/90">{loading ? 'Fetching your account status' : subscriptionMeta}</span>
              </div>
              {!loading && subscriptionTone !== 'active' ? (
                <div className="mb-4 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-medium text-primary-foreground/90">
                  {subscriptionTone === 'canceled'
                    ? 'Your plan is set to end at the close of the current billing period.'
                    : subscriptionTone === 'past_due'
                      ? 'Payment needs attention. Use Manage Plan to update billing.'
                      : 'Your subscription needs review before the next draw.'}
                </div>
              ) : null}
              <Button variant="secondary" className="w-full font-semibold shadow-sm text-primary hover:bg-secondary/90" asChild>
                <Link to="/subscription">Manage Plan</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start h-12 px-4 shadow-sm" asChild>
                <Link to="/scores">
                  <Award className="w-5 h-5 mr-3 text-secondary" />
                  <span className="font-semibold">Log Performance</span>
                </Link>
              </Button>
              <Button className="w-full justify-start h-12 px-4 bg-muted/50 hover:bg-muted text-foreground border border-border/50 shadow-sm" variant="ghost" asChild>
                <Link to="/charity">
                  <Heart className="w-5 h-5 mr-3 text-primary" />
                  <span className="font-medium">Change Charity</span>
                </Link>
              </Button>
              <Button className="w-full justify-start h-12 px-4 bg-muted/50 hover:bg-muted text-foreground border border-border/50 shadow-sm" variant="ghost" asChild>
                <Link to="/draws">
                  <LineChart className="w-5 h-5 mr-3 text-primary" />
                  <span className="font-medium">View Draw History</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
