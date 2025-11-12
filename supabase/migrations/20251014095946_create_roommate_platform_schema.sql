/*
  # Roommate Platform Database Schema

  ## Overview
  Complete database schema for the "Сосед по интересам" (Roommate by Interests) platform.
  This migration creates all necessary tables for user profiles, interests, matches, messaging, and events.

  ## New Tables

  ### 1. `profiles`
  User profile information linked to auth.users
  - `id` (uuid, primary key) - matches auth.users.id
  - `full_name` (text) - user's full name
  - `age` (integer) - user's age
  - `university` (text) - university name
  - `dormitory` (text) - dormitory/building name
  - `room_number` (text) - room/apartment number
  - `bio` (text) - short description about user
  - `avatar_url` (text) - profile photo URL
  - `gender` (text) - user gender
  - `is_online` (boolean) - online status
  - `last_seen` (timestamptz) - last activity timestamp
  - `created_at` (timestamptz) - profile creation time
  - `updated_at` (timestamptz) - last profile update

  ### 2. `interests`
  Available interest categories
  - `id` (uuid, primary key)
  - `name` (text) - interest name
  - `category` (text) - sport, games, study, hobby, other
  - `icon` (text) - icon identifier
  - `created_at` (timestamptz)

  ### 3. `user_interests`
  Junction table linking users to their interests
  - `id` (uuid, primary key)
  - `user_id` (uuid) - references profiles
  - `interest_id` (uuid) - references interests
  - `created_at` (timestamptz)

  ### 4. `matches`
  User connections/friendships
  - `id` (uuid, primary key)
  - `user_id` (uuid) - first user
  - `matched_user_id` (uuid) - second user
  - `status` (text) - pending, accepted, rejected
  - `created_at` (timestamptz)

  ### 5. `conversations`
  Chat conversations between users
  - `id` (uuid, primary key)
  - `user1_id` (uuid) - first participant
  - `user2_id` (uuid) - second participant
  - `last_message_at` (timestamptz) - last message timestamp
  - `created_at` (timestamptz)

  ### 6. `messages`
  Individual chat messages
  - `id` (uuid, primary key)
  - `conversation_id` (uuid) - references conversations
  - `sender_id` (uuid) - message sender
  - `content` (text) - message text
  - `is_read` (boolean) - read status
  - `created_at` (timestamptz)

  ### 7. `events`
  Community events created by users
  - `id` (uuid, primary key)
  - `creator_id` (uuid) - event creator
  - `title` (text) - event title
  - `description` (text) - event description
  - `category` (text) - event category
  - `location` (text) - where event happens
  - `event_date` (timestamptz) - when event happens
  - `max_participants` (integer) - maximum number of participants
  - `created_at` (timestamptz)

  ### 8. `event_participants`
  Users participating in events
  - `id` (uuid, primary key)
  - `event_id` (uuid) - references events
  - `user_id` (uuid) - references profiles
  - `joined_at` (timestamptz)

  ## Security

  All tables have Row Level Security (RLS) enabled with appropriate policies:
  - Users can read their own data and public profiles
  - Users can only modify their own data
  - Messages are only visible to conversation participants
  - Events are publicly visible but only creators can modify them

  ## Notes

  - All foreign keys use CASCADE deletes to maintain referential integrity
  - Timestamps use `now()` as default values
  - Indexes are added for frequently queried columns
  - RLS policies ensure data privacy and security
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age integer,
  university text,
  dormitory text,
  room_number text,
  bio text,
  avatar_url text,
  gender text,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Create user_interests junction table
CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interest_id uuid REFERENCES interests(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  matched_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, matched_user_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  location text,
  event_date timestamptz NOT NULL,
  max_participants integer,
  created_at timestamptz DEFAULT now()
);

-- Create event_participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest_id ON user_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched_user_id ON matches(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Interests policies
CREATE POLICY "Interests are viewable by everyone"
  ON interests FOR SELECT
  TO authenticated
  USING (true);

-- User interests policies
CREATE POLICY "User interests are viewable by everyone"
  ON user_interests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own interests"
  ON user_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests"
  ON user_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can create match requests"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update matches they're involved in"
  ON matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can delete their own match requests"
  ON matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can update their events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can delete their events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Event participants policies
CREATE POLICY "Event participants are viewable by everyone"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join events"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events"
  ON event_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default interests
INSERT INTO interests (name, category, icon) VALUES
  ('Футбол', 'sport', 'football'),
  ('Баскетбол', 'sport', 'basketball'),
  ('Бег', 'sport', 'running'),
  ('Тренажерный зал', 'sport', 'dumbbell'),
  ('Йога', 'sport', 'yoga'),
  ('CS:GO', 'games', 'gamepad-2'),
  ('Dota 2', 'games', 'gamepad-2'),
  ('Настольные игры', 'games', 'dice-6'),
  ('Шахматы', 'games', 'chess'),
  ('Математика', 'study', 'calculator'),
  ('Программирование', 'study', 'code'),
  ('Английский язык', 'study', 'languages'),
  ('Физика', 'study', 'atom'),
  ('Гитара', 'hobby', 'guitar'),
  ('Рисование', 'hobby', 'palette'),
  ('Фотография', 'hobby', 'camera'),
  ('Кино', 'hobby', 'film'),
  ('Кулинария', 'hobby', 'chef-hat'),
  ('Чтение', 'hobby', 'book-open'),
  ('Путешествия', 'other', 'map')
ON CONFLICT (name) DO NOTHING;