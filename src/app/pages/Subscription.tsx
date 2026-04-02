import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Check, Star, Shield, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cancelDemoSubscription, getSubscription, saveSubscription, type PlanCode, type SubscriptionRecord } from '../data/platform';
import { useAuth } from '../providers/AuthProvider';
import { cancelSubscription, createBillingPortalSession, createCheckoutSession, paymentBackendAvailable } from '../data/payments';

export function Subscription() {
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>('monthly');
  const [statusMessage, setStatusMessage] = useState('Choose the plan that fits your cadence.');
  const [busyPlan, setBusyPlan] = useState<PlanCode | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      desc: 'Flexible access with monthly billing',
      priceMonthly: 15,
      priceYearly: 15,
      icon: Shield,
      color: 'text-foreground',
      bgColor: 'bg-muted/50',
      benefits: ['Track your latest 5 scores', 'Eligibility for all draw tiers', 'Standard support', 'Minimum 10% donated to charity']
    },
    {
      id: 'yearly',
      name: 'Yearly',
      desc: 'Best value for committed members',
      priceMonthly: 12,
      priceYearly: 12,
      isPopular: true,
      icon: Star,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      benefits: ['Lower effective monthly price', 'Eligibility for all draw tiers', 'Priority support', 'Minimum 10% donated to charity', 'Annual commitment for better retention']
    }
  ];

  React.useEffect(() => {
    if (!user) {
      return;
    }

    getSubscription(user.id).then((subscription) => {
      if (!subscription) {
        return;
      }

      setSubscription(subscription);
      setSelectedPlan(subscription.planCode);
      setIsYearly(subscription.planCode === 'yearly');
      setStatusMessage(
        subscription.renewalAt
          ? `${subscription.status === 'active' ? 'Active' : subscription.status} and renews on ${new Date(subscription.renewalAt).toLocaleDateString()}`
          : `Current status: ${subscription.status}`
      );
    });
  }, [user]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    if (checkoutState === 'success') {
      setStatusMessage('Stripe checkout completed. Your subscription status will update after webhook confirmation.');
    }
    if (checkoutState === 'cancelled') {
      setStatusMessage('Stripe checkout was cancelled. You can choose a plan again anytime.');
    }
  }, []);

  async function choosePlan(planCode: PlanCode) {
    if (!user) {
      return;
    }

    setBusyPlan(planCode);

    if (paymentBackendAvailable()) {
      try {
        const response = await createCheckoutSession({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          planCode,
        });

        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
          return;
        }
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : 'Unable to start Stripe checkout.');
        setBusyPlan(null);
        return;
      }
    }

    await saveSubscription(user.id, planCode);
    const nextSubscription = await getSubscription(user.id);
    setSubscription(nextSubscription);
    setSelectedPlan(planCode);
    setIsYearly(planCode === 'yearly');
    setStatusMessage(
      paymentBackendAvailable()
        ? 'Stripe checkout backend is configured, but checkout did not return a redirect URL.'
        : planCode === 'yearly'
          ? 'Demo mode: yearly plan activated locally. Connect Stripe keys to use live billing.'
          : 'Demo mode: monthly plan activated locally. Connect Stripe keys to use live billing.'
    );
    setBusyPlan(null);
  }

  async function handleManageBilling() {
    if (!user) {
      return;
    }

    if (!paymentBackendAvailable()) {
      setStatusMessage('Billing portal requires Stripe backend configuration. Demo mode cannot open it.');
      return;
    }

    setPortalBusy(true);
    try {
      const response = await createBillingPortalSession(user.id);
      window.location.href = response.portalUrl;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to open the billing portal.');
      setPortalBusy(false);
    }
  }

  async function handleCancelSubscription() {
    if (!user) {
      return;
    }

    setCancelBusy(true);
    try {
      if (paymentBackendAvailable()) {
        await cancelSubscription(user.id);
      } else {
        await cancelDemoSubscription(user.id);
      }

      const nextSubscription = await getSubscription(user.id);
      setSubscription(nextSubscription);
      setStatusMessage('Your subscription is set to cancel. Access remains until the current billing period ends.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to cancel the subscription.');
    }
    setCancelBusy(false);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto py-8"
    >
      <div className="text-center space-y-5 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide mb-2">
          <Sparkles className="w-4 h-4" />
          Subscription Plans
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Fuel your <span className="text-primary">Impact</span>
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Unlock premium features, increase your draw odds, and maximize your charitable contributions.
        </p>
        <p className="text-sm text-muted-foreground">{statusMessage}</p>
        <p className="text-xs text-muted-foreground/80">
          {paymentBackendAvailable()
            ? 'Live Stripe checkout mode is enabled.'
            : 'Demo billing mode is active until `VITE_API_BASE_URL` and Stripe server secrets are configured.'}
        </p>
        {subscription ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={handleManageBilling} disabled={portalBusy}>
              {portalBusy ? 'Opening Portal...' : 'Manage Billing'}
            </Button>
            <Button variant="outline" onClick={handleCancelSubscription} disabled={cancelBusy || subscription.status === 'canceled'}>
              {cancelBusy ? 'Cancelling...' : subscription.status === 'canceled' ? 'Cancellation Scheduled' : 'Cancel Subscription'}
            </Button>
          </div>
        ) : null}

        {/* Toggle */}
        <div className="flex items-center justify-center mt-10">
          <div className="bg-muted/70 p-1.5 rounded-full flex gap-1 border border-border/50 shadow-inner">
            <button
              className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all ${!isYearly ? 'bg-background shadow-sm text-foreground scale-100' : 'text-muted-foreground hover:text-foreground scale-95'}`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </button>
            <button
              className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${isYearly ? 'bg-background shadow-sm text-foreground scale-100' : 'text-muted-foreground hover:text-foreground scale-95'}`}
              onClick={() => setIsYearly(true)}
            >
              Yearly 
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isYearly ? 'bg-secondary text-primary' : 'bg-primary/10 text-primary'}`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className={`relative flex flex-col h-full ${plan.isPopular ? 'md:-translate-y-4' : ''}`}
          >
            <Card className={`flex-1 flex flex-col transition-all duration-300 
              ${selectedPlan === plan.id ? 'ring-2 ring-primary shadow-xl scale-[1.02]' : 'hover:shadow-lg border-border/50 hover:border-primary/30'}
              ${plan.isPopular ? 'shadow-lg border-primary/20' : 'shadow-sm'}
            `}>
              {plan.isPopular && (
                <>
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary rounded-t-xl" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-secondary text-primary text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-secondary/20">
                      <Star className="w-3.5 h-3.5 fill-primary" /> Most Popular
                    </span>
                  </div>
                </>
              )}
              
              <CardHeader className="pt-8 pb-6">
                <div className={`w-12 h-12 rounded-2xl ${plan.bgColor} flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-6 h-6 ${plan.color}`} />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm mt-2">{plan.desc}</CardDescription>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">
                    ${isYearly ? plan.priceYearly : plan.priceMonthly}
                  </span>
                  <span className="text-lg font-medium text-muted-foreground">/mo</span>
                </div>
                {isYearly && (
                  <p className="text-sm text-muted-foreground mt-2 font-medium">Billed ${plan.priceYearly * 12} annually</p>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 bg-muted/10 pt-6">
                <ul className="space-y-4 text-sm">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <Check className={`h-5 w-5 shrink-0 ${plan.isPopular ? 'text-secondary' : 'text-primary'}`} />
                      <span className={`${plan.isPopular ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-6 bg-muted/10 rounded-b-xl border-t border-border/50">
                <Button 
                  size="lg"
                  className={`w-full text-base font-semibold shadow-sm transition-all ${
                    selectedPlan === plan.id 
                      ? 'bg-primary text-primary-foreground opacity-100' 
                      : plan.isPopular 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'bg-background text-foreground border-2 border-border hover:bg-muted'
                  }`}
                  variant={selectedPlan === plan.id || plan.isPopular ? 'default' : 'outline'}
                  onClick={() => choosePlan(plan.id as PlanCode)}
                  disabled={busyPlan !== null}
                >
                  {busyPlan === plan.id ? 'Starting Checkout...' : selectedPlan === plan.id ? 'Current Plan' : `Select ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
