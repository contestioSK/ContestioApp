import { useCallback } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  duration?: number;
}

export function useConfetti() {
  // Goal completion confetti - standard celebration
  const celebrateGoalCompletion = useCallback((options?: ConfettiOptions) => {
    const defaults = {
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']
    };

    confetti({
      ...defaults,
      ...options
    });
  }, []);

  // Main goal completion - more intense celebration
  const celebrateMainGoal = useCallback((options?: ConfettiOptions) => {
    const defaults = {
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#92400e'],
      duration: 3000
    };

    // Multiple bursts for main goal
    const burst = () => {
      confetti({
        ...defaults,
        ...options,
        origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() * 0.2 + 0.4 }
      });
    };

    // Create multiple bursts over time
    burst();
    setTimeout(() => burst(), 250);
    setTimeout(() => burst(), 500);
  }, []);

  // Season completion - ultimate celebration
  const celebrateSeasonCompletion = (options?: ConfettiOptions) => {
    const defaults = {
      particleCount: 200,
      spread: 120,
      origin: { x: 0.5, y: 0.3 },
      colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
      duration: 5000
    };

    // Rainbow confetti shower
    const colors = [
      ['#ec4899', '#f472b6', '#fb7185'],
      ['#8b5cf6', '#a78bfa', '#c084fc'],
      ['#3b82f6', '#60a5fa', '#93c5fd'],
      ['#10b981', '#34d399', '#6ee7b7'],
      ['#f59e0b', '#fbbf24', '#fcd34d']
    ];

    colors.forEach((colorSet, index) => {
      setTimeout(() => {
        confetti({
          ...defaults,
          ...options,
          colors: colorSet,
          origin: { x: (index + 1) / (colors.length + 1), y: 0.2 }
        });
      }, index * 300);
    });
  };

  // Goal type specific celebrations
  const celebrateByGoalType = useCallback((goalType: string, isMainGoal = false) => {
    const goalTypeColors = {
      total_weight: ['#3b82f6', '#60a5fa', '#93c5fd'], // Blue tones
      fish_count: ['#10b981', '#34d399', '#6ee7b7'],   // Green tones
      trips_count: ['#8b5cf6', '#a78bfa', '#c084fc'],  // Purple tones
      biggest_fish: ['#f59e0b', '#fbbf24', '#fcd34d'], // Orange/yellow tones
      species_variety: ['#ec4899', '#f472b6', '#fb7185'] // Pink tones
    };

    const colors = goalTypeColors[goalType as keyof typeof goalTypeColors] || 
                   ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

    if (isMainGoal) {
      celebrateMainGoal({ colors });
    } else {
      celebrateGoalCompletion({ colors });
    }
  }, [celebrateGoalCompletion, celebrateMainGoal]);

  // Milestone celebration - for significant progress increments
  const celebrateMilestone = useCallback((percentage: number) => {
    const intensity = Math.floor(percentage / 25); // 25%, 50%, 75%, 100%
    const particleCount = 50 + (intensity * 25);
    
    celebrateGoalCompletion({
      particleCount,
      spread: 50 + (intensity * 10),
      colors: ['#10b981', '#34d399', '#6ee7b7']
    });
  }, [celebrateGoalCompletion]);

  // Fireworks effect for special achievements
  const fireworks = (options?: ConfettiOptions) => {
    const defaults = {
      particleCount: 50,
      spread: 360,
      origin: { x: 0.5, y: 0.7 }
    };

    // Create firework bursts at different positions
    const positions = [
      { x: 0.2, y: 0.4 },
      { x: 0.8, y: 0.4 },
      { x: 0.5, y: 0.3 },
      { x: 0.3, y: 0.6 },
      { x: 0.7, y: 0.6 }
    ];

    positions.forEach((position, index) => {
      setTimeout(() => {
        confetti({
          ...defaults,
          ...options,
          origin: position,
          colors: ['#fbbf24', '#f59e0b', '#d97706', '#92400e', '#451a03']
        });
      }, index * 200);
    });
  };

  return {
    celebrateGoalCompletion,
    celebrateMainGoal,
    celebrateSeasonCompletion,
    celebrateByGoalType,
    celebrateMilestone,
    fireworks
  };
}