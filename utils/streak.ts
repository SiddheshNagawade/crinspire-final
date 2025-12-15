/**
 * Streak System Utility
 * Handles daily streak tracking for user engagement
 */

import { supabase } from '../supabaseClient';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  daysUntilReset: number;
}

/**
 * Update user streak after exam completion
 * Should be called after user submits exam
 * 
 * Rules:
 * - First activity of the day: streak increases by 1
 * - Miss a day: streak resets to 0
 * - Same day: no change to streak
 */
export async function updateUserStreak(userId: string): Promise<StreakInfo | null> {
  try {
    const { data, error } = await supabase.rpc(
      'update_user_streak',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error updating streak:', error);
      return null;
    }

    if (data && data.length > 0) {
      return {
        currentStreak: data[0].current_streak || 0,
        longestStreak: data[0].longest_streak || 0,
        lastActivityDate: data[0].last_activity_date,
        daysUntilReset: 1, // User has 1 day to maintain streak
      };
    }

    return null;
  } catch (err) {
    console.error('Exception in updateUserStreak:', err);
    return null;
  }
}

/**
 * Get current user streak information
 * Call this to display streak on dashboard/profile
 */
export async function getUserStreak(userId: string): Promise<StreakInfo | null> {
  try {
    const { data, error } = await supabase.rpc(
      'check_user_streak',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error fetching streak:', error);
      return null;
    }

    if (data && data.length > 0) {
      return {
        currentStreak: data[0].current_streak || 0,
        longestStreak: data[0].longest_streak || 0,
        lastActivityDate: data[0].last_activity_date,
        daysUntilReset: data[0].days_until_reset || 0,
      };
    }

    return null;
  } catch (err) {
    console.error('Exception in getUserStreak:', err);
    return null;
  }
}

/**
 * Format streak for display
 * Example: "🔥 7 day streak!" or "7 days 🔥"
 */
export function formatStreakDisplay(streak: number): string {
  if (streak === 0) return 'Start your streak!';
  if (streak === 1) return '🔥 1 day streak';
  return `🔥 ${streak} day streak`;
}

/**
 * Check if streak will reset today
 * Useful for showing urgent notifications
 */
export function isStreakAtRisk(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false;

  const lastActivity = new Date(lastActivityDate);
  const today = new Date();
  
  // Reset time to midnight for fair comparison
  lastActivity.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysDifference = Math.floor(
    (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Streak is at risk if 1 full day has passed without activity
  return daysDifference >= 1;
}

/**
 * Get streak milestone message
 * Show achievements at specific streak numbers
 */
export function getStreakMilestoneMessage(streak: number): string | null {
  const milestones: { [key: number]: string } = {
    1: '🎉 You started your streak!',
    7: '🌟 One week streak! Keep it up!',
    14: '⭐ Two weeks! You\'re unstoppable!',
    30: '👑 One month! Incredible dedication!',
    60: '💎 Two months! You\'re a legend!',
    100: '🏆 100 days! Hall of fame!',
  };

  return milestones[streak] || null;
}

/**
 * Calculate days until streak resets
 * Returns number of days user has before streak is lost
 */
export function getDaysUntilStreakReset(lastActivityDate: string | null): number {
  if (!lastActivityDate) return 0;

  const lastActivity = new Date(lastActivityDate);
  const today = new Date();

  lastActivity.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // If last activity was today, user has until midnight tomorrow
  if (lastActivity.getTime() === today.getTime()) {
    return 1;
  }

  // If last activity was yesterday, user has until end of today
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastActivity.getTime() === yesterday.getTime()) {
    return 1;
  }

  // Otherwise, streak already reset
  return 0;
}
