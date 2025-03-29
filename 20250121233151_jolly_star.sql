/*
  # Initial Schema for Expose Your Take

  1. New Tables
    - users
      - id (uuid, primary key)
      - username (text)
      - points (integer)
      - created_at (timestamp)
    
    - predictions
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - sport (text)
      - prediction_text (text)
      - player_name (text, optional)
      - end_date (timestamp)
      - status (text)
      - points_earned (integer)
      - created_at (timestamp)
    
    - standings_predictions
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - sport (text)
      - season_year (integer)
      - prediction_data (jsonb)
      - actual_data (jsonb)
      - points_earned (integer)
      - created_at (timestamp)
    
    - votes
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - prediction_id (uuid, foreign key)
      - vote_type (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Predictions table
CREATE TABLE predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  sport text NOT NULL,
  prediction_text text NOT NULL,
  player_name text,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'pending',
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (sport IN ('MLB', 'NFL', 'NHL', 'NBA', 'MLS'))
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions are viewable by everyone"
  ON predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions"
  ON predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Standings predictions table
CREATE TABLE standings_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  sport text NOT NULL,
  season_year integer NOT NULL,
  prediction_data jsonb NOT NULL,
  actual_data jsonb,
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (sport IN ('MLB', 'NFL', 'NHL', 'NBA', 'MLS'))
);

ALTER TABLE standings_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings predictions are viewable by everyone"
  ON standings_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own standings predictions"
  ON standings_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own standings predictions"
  ON standings_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Votes table
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  prediction_id uuid REFERENCES predictions(id) NOT NULL,
  vote_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, prediction_id),
  CHECK (vote_type IN ('upvote', 'downvote'))
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);