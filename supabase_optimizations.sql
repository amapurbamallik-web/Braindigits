-- Run this entire script in your Supabase SQL Editor to instantly speed up the Friends List and Leaderboard!

-- 1. Indexing friendships to make finding your friends lightning fast
-- Without these, Supabase has to scan every single friendship in the database. With these, it finds your friends in milliseconds.
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships (user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships (user_id_2);

-- 2. Indexing Leaderboard Wins
-- By creating descending indexes on wins, Supabase pre-sorts the database. 
-- When the Leaderboard fetches the top 50, it no longer has to calculate who is the highest, it just grabs the top of the pre-sorted list!
CREATE INDEX IF NOT EXISTS idx_profiles_total_wins ON public.profiles (total_wins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_ai_wins ON public.profiles (ai_wins DESC);

-- Note: Indexes take up a tiny bit of storage space but provide massive performance gains for these specific lookups.
