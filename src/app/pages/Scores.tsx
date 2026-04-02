import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Award, Plus, AlertCircle, X, History, TrendingUp, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { deleteScore, listScores, saveScore, type ScoreRecord } from '../data/platform';
import { useAuth } from '../providers/AuthProvider';

export function Scores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [newScore, setNewScore] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [playedOn, setPlayedOn] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshScores() {
    if (!user) {
      return;
    }

    setScores(await listScores(user.id));
    setLoading(false);
  }

  React.useEffect(() => {
    refreshScores();
  }, [user]);

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newScore, 10);
    
    if (isNaN(val) || val < 1 || val > 45) {
      setError('Score must be between 1 and 45 (Stableford format)');
      return;
    }
    
    if (!newCourse.trim()) {
      setError('Location name is required');
      return;
    }

    if (!playedOn) {
      setError('Played date is required');
      return;
    }

    setError('');

    if (!user) {
      return;
    }

    await saveScore(user.id, {
      id: editingId ?? undefined,
      score: val,
      playedOn,
      courseName: newCourse.trim(),
    });

    await refreshScores();
    setNewScore('');
    setNewCourse('');
    setPlayedOn(new Date().toISOString().slice(0, 10));
    setEditingId(null);
  };

  const removeScore = async (id: string) => {
    if (!user) {
      return;
    }

    await deleteScore(user.id, id);
    await refreshScores();
  };

  const startEdit = (score: ScoreRecord) => {
    setEditingId(score.id);
    setNewScore(String(score.score));
    setNewCourse(score.courseName);
    setPlayedOn(score.playedOn);
    setError('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Award className="w-8 h-8 text-primary" />
            Performance Tracking
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Log your latest rounds. The last 5 entries power your impact draws.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-primary/5 text-primary px-4 py-2 rounded-xl border border-primary/20">
          <TrendingUp className="w-5 h-5 text-secondary" />
          <div className="font-semibold text-sm">
            Active Pool: {scores.length}/5
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Add Score Form */}
        <motion.div 
          className="lg:col-span-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="shadow-sm border-border/50 sticky top-28">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plus className="w-5 h-5 text-primary" />
                Record New Entry
              </CardTitle>
              <CardDescription>Enter or edit your Stableford score with the date played.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddScore} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="course" className="text-sm font-medium">Location</Label>
                  <Input 
                    id="course" 
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    placeholder="e.g. Pinehurst No. 2"
                    className="h-11 bg-muted/50 border-border/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="score" className="text-sm font-medium">Stableford Points</Label>
                  <Input 
                    id="score" 
                    type="number"
                    min="1"
                    max="45"
                    value={newScore}
                    onChange={(e) => setNewScore(e.target.value)}
                    placeholder="e.g. 42"
                    className="h-11 bg-muted/50 border-border/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="playedOn" className="text-sm font-medium">Date Played</Label>
                  <Input
                    id="playedOn"
                    type="date"
                    value={playedOn}
                    onChange={(e) => setPlayedOn(e.target.value)}
                    className="h-11 bg-muted/50 border-border/50 focus:border-primary"
                  />
                </div>
                
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" size="lg" className="w-full text-base font-semibold shadow-md mt-2">
                  {editingId ? 'Save Score Changes' : 'Add to Active Pool'}
                </Button>
                {editingId ? (
                  <Button type="button" variant="ghost" className="w-full" onClick={() => {
                    setEditingId(null);
                    setNewScore('');
                    setNewCourse('');
                    setPlayedOn(new Date().toISOString().slice(0, 10));
                    setError('');
                  }}>
                    Cancel Editing
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Scores Display */}
        <motion.div 
          className="lg:col-span-7"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="shadow-sm border-border/50 h-full">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Active Entries
                </div>
              </CardTitle>
              <CardDescription>Your active rolling pool. The 6th entry will replace the oldest.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                    Loading your scores...
                  </div>
                ) : scores.length === 0 ? (
                  <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium text-foreground">No active scores</p>
                    <p className="text-sm mt-1">Add your first score to participate in impact draws.</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {scores.map((score, index) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: -20 }}
                        transition={{ duration: 0.2 }}
                        key={score.id} 
                        className={`group relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all ${
                          index === scores.length - 1 && scores.length === 5 
                            ? 'border-destructive/30 bg-destructive/5' 
                            : 'bg-card border-border/50 hover:border-primary/30 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center font-bold text-xl text-secondary shadow-inner">
                            {score.score}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-base">{score.courseName}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{new Date(score.playedOn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEdit(score)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={() => removeScore(score.id)}
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                        
                        {index === scores.length - 1 && scores.length === 5 && (
                          <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                            Oldest
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
