import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Heart, CheckCircle2, AlertCircle, TrendingUp, HandHeart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCharityPreference, listCharities, saveCharityPreference, type CharityRecord } from '../data/platform';
import { useAuth } from '../providers/AuthProvider';

export function Charity() {
  const { user } = useAuth();
  const [charities, setCharities] = useState<CharityRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [donationPercent, setDonationPercent] = useState(10);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    Promise.all([listCharities(), getCharityPreference(user.id)]).then(([nextCharities, preference]) => {
      if (!active) {
        return;
      }

      setCharities(nextCharities);
      const fallbackCharityId = nextCharities[0]?.id ?? '';
      setSelectedId(preference?.charityId ?? fallbackCharityId);
      setDonationPercent(preference?.contributionPercent ?? 10);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const handleSave = async () => {
    if (donationPercent >= 10 && donationPercent <= 100) {
      if (!user || !selectedId) {
        return;
      }

      await saveCharityPreference(user.id, {
        charityId: selectedId,
        contributionPercent: donationPercent,
        independentDonationEnabled: false,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10">
              <HandHeart className="w-8 h-8 text-rose-500" />
            </div>
            Your Impact Center
          </h2>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            Select a cause you want to support. A portion of every prize you win is automatically routed to your chosen charity.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl border border-border/50 shadow-sm">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Total Donated: <span className="text-primary">$1,250</span></span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          1. Select a Foundation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {charities.map((charity, idx) => (
            <motion.div
              key={charity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 overflow-hidden h-full flex flex-col group ${
                  selectedId === charity.id 
                    ? 'ring-2 ring-primary shadow-lg border-primary/50 scale-[1.02]' 
                    : 'hover:border-primary/40 hover:shadow-md border-border/50'
                }`}
                onClick={() => setSelectedId(charity.id)}
              >
                <div className="h-48 relative overflow-hidden">
                  <ImageWithFallback 
                    src={charity.imageUrl} 
                    alt={charity.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${selectedId === charity.id ? 'scale-105' : 'group-hover:scale-105'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  <AnimatePresence>
                    {selectedId === charity.id && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-3 right-3 bg-primary text-secondary rounded-full p-1.5 shadow-lg border-2 border-card"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-md text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm text-foreground">
                    {charity.category}
                  </div>
                </div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">{charity.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-2 flex-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{charity.shortDescription}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
          <CardHeader className="bg-muted/10">
            <CardTitle className="text-xl">2. Set Contribution Level</CardTitle>
            <CardDescription className="text-base mt-1">
              Choose the percentage of your winnings to automatically donate (minimum 10%).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 max-w-2xl">
              <div className="flex-1 w-full relative">
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="5"
                  value={donationPercent}
                  onChange={(e) => setDonationPercent(parseInt(e.target.value))}
                  className="w-full h-3 bg-muted rounded-full appearance-none cursor-pointer accent-primary border border-border/50 shadow-inner"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium px-1">
                  <span>10%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="w-24 relative shrink-0">
                <Input 
                  type="number" 
                  min="10" 
                  max="100" 
                  value={donationPercent}
                  onChange={(e) => setDonationPercent(parseInt(e.target.value))}
                  className="pr-8 font-bold text-xl text-primary h-12 text-center shadow-sm border-border/50 focus:border-primary"
                />
                <span className="absolute right-4 top-3 text-muted-foreground font-semibold">%</span>
              </div>
            </div>
            
            <AnimatePresence>
              {donationPercent < 10 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  Minimum contribution level is 10% to participate in Impact Draws.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 relative overflow-hidden">
              <Heart className="absolute -bottom-4 -right-4 w-32 h-32 text-primary/5 pointer-events-none transform -rotate-12" />
              <h4 className="font-bold text-primary mb-2 flex items-center gap-2 text-lg">
                Your Impact Promise
              </h4>
              <p className="text-base text-foreground/80 leading-relaxed relative z-10">
                You are dedicating <strong className="text-primary font-bold text-lg">{donationPercent}%</strong> of your future winnings to <strong className="font-semibold text-foreground">{charities.find(c => c.id === selectedId)?.name}</strong>. 
                {donationPercent >= 50 && <span className="block mt-2 font-semibold text-secondary flex items-center gap-1"><Sparkles className="w-4 h-4"/> Phenomenal! Your generosity makes a massive difference.</span>}
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t border-border/50 p-6 flex justify-end">
            <Button 
              size="lg"
              onClick={handleSave} 
              disabled={donationPercent < 10 || loading || !selectedId}
              className={`w-full sm:w-auto text-base font-semibold shadow-md transition-all duration-300 ${saved ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' : ''}`}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Impact Settings Saved
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}
