-- Run this in your Supabase SQL Editor to wipe the slate clean and perfectly rebuild the database constraints and RLS for Friends and Profiles.

-- 1. Create Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    total_wins INTEGER DEFAULT 0 NOT NULL,
    total_games INTEGER DEFAULT 0 NOT NULL,
    ai_wins INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create robust policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create Friendships Table (if not exists)
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_id_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent friending yourself
    CONSTRAINT check_not_self CHECK (user_id_1 != user_id_2)
);

-- Ensure there is only ONE friendship row between ANY two users (prevents duplicate spam requests)
-- To do this cleanly across user_id_1 and user_id_2, we drop any existing bad constraint, then create a unique index.
DROP INDEX IF EXISTS unique_friendships;
CREATE UNIQUE INDEX unique_friendships ON public.friendships (
    LEAST(user_id_1, user_id_2),
    GREATEST(user_id_1, user_id_2)
);

-- Enable RLS for friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can accept/reject friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can insert friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;

-- Create robust policies for friendships
-- SELECT: You can see the friendship if you are either user 1 or user 2
CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT 
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- INSERT: You can send a request (insert) if you are user 1 OR user 2
CREATE POLICY "Users can insert friendships" ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- UPDATE: You can update (accept) if you are either user, but realistically only pending requests need update
CREATE POLICY "Users can update their friendships" ON public.friendships FOR UPDATE
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- DELETE: You can delete (reject or unfriend) if you are either user
CREATE POLICY "Users can delete their friendships" ON public.friendships FOR DELETE
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Ensure Realtime is enabled for friendships (if needed later)
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
