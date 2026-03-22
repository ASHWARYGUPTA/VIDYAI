-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ENUMS
CREATE TYPE exam_type AS ENUM ('JEE', 'NEET', 'UPSC');

CREATE TYPE subject_type AS ENUM (
  'Physics', 'Chemistry', 'Biology', 'Mathematics',
  'History', 'Geography', 'Polity', 'Economy', 'Environment', 'Current_Affairs'
);

CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

CREATE TYPE mastery_state AS ENUM ('unseen', 'learning', 'reviewing', 'mastered', 'forgotten');

CREATE TYPE session_type AS ENUM ('study', 'revision', 'test', 'doubt');

CREATE TYPE plan_status AS ENUM ('active', 'paused', 'completed');

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

CREATE TYPE notification_type AS ENUM (
  'revision_due', 'plan_update', 'streak_milestone', 'test_reminder'
);

CREATE TYPE content_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE partner_tier AS ENUM ('starter', 'growth', 'enterprise');
