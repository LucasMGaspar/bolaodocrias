-- 1. Create Tables
-- Profiles table (extending auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League Members table (pivot)
CREATE TABLE IF NOT EXISTS public.league_members (
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_score INTEGER DEFAULT 0,
    PRIMARY KEY (league_id, user_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id BIGINT PRIMARY KEY, -- ID from External API
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    team_a_logo TEXT,
    team_b_logo TEXT,
    match_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, live, FT
    score_a INTEGER,
    score_b INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    match_id BIGINT REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    guess_a INTEGER NOT NULL,
    guess_b INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- 2. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can see all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Leagues: Viewable by everyone (to allow joining via code), Creatable by authenticated users
CREATE POLICY "Leagues are viewable by everyone" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create leagues" ON public.leagues FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- League Members: Viewable by colleagues, Users can join leagues
CREATE POLICY "Members viewable by league colleagues" ON public.league_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.league_members m WHERE m.league_id = league_id AND m.user_id = auth.uid())
);
CREATE POLICY "Users can join leagues" ON public.league_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Matches: Viewable by everyone
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);

-- Predictions: Users can view their own, and others' only after match starts
CREATE POLICY "Users can manage own predictions" ON public.predictions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "View others predictions after match starts" ON public.predictions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND match_time < NOW())
);

-- 3. Stored Procedure & Trigger for Scoring
CREATE OR REPLACE FUNCTION calculate_match_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'FT' (Full Time)
    IF NEW.status = 'FT' AND OLD.status != 'FT' THEN
        -- Update scores for all users who guessed the exact score
        UPDATE public.league_members lm
        SET total_score = total_score + 3
        FROM public.predictions p
        WHERE p.match_id = NEW.id
          AND p.user_id = lm.user_id
          AND p.guess_a = NEW.score_a
          AND p.guess_b = NEW.score_b;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_match_status_update
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION calculate_match_points();

-- 4. Profile Trigger (Auto-create profile on Auth signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime for league_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
