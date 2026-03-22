-- ============================================================
-- DEMO DATA SEED — realistic data for every dashboard view
-- Run AFTER 01_subjects.sql and 02_jee_syllabus.sql
--
-- Creates demo user:  demo@vidyai.in  (set password via Supabase dashboard or auth.users)
-- ============================================================

DO $$
DECLARE
  demo_uid     uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  physics_id   uuid;
  chemistry_id uuid;
  math_id      uuid;
  plan_id      uuid;
  sess_id      uuid;  -- reusable session id
  c_id         uuid;  -- cursor concept id
  ch_id        uuid;  -- cursor chapter id
  rec          record;
  day_cursor   date;
  i            integer;
  rand_xp      integer;
  rand_mins    integer;
  rand_ret     numeric;
BEGIN

  -- ─── 0. Demo user ──────────────────────────────────────────
  -- Insert into auth.users (Supabase local dev)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    demo_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'demo@vidyai.in',
    crypt('demo1234', gen_salt('bf', 10)),
    now(),
    '{"full_name": "Arjun Sharma", "exam_target": "JEE"}'::jsonb,
    now(), now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert into auth.identities (required by Supabase GoTrue)
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    demo_uid, demo_uid, demo_uid::text, 'email',
    json_build_object('sub', demo_uid::text, 'email', 'demo@vidyai.in')::jsonb,
    now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  -- The trigger should auto-create the profile, but upsert to be safe
  INSERT INTO profiles (id, email, full_name, exam_target, exam_date, current_class,
                        daily_study_hours, onboarding_completed, subscription_tier, last_active_date)
  VALUES (demo_uid, 'demo@vidyai.in', 'Arjun Sharma', 'JEE',
          (CURRENT_DATE + interval '90 days')::date, '12', 5, true, 'pro', CURRENT_DATE)
  ON CONFLICT (id) DO UPDATE SET
    onboarding_completed = true,
    exam_date = (CURRENT_DATE + interval '90 days')::date,
    last_active_date = CURRENT_DATE;

  -- Get subject IDs
  SELECT id INTO physics_id   FROM subjects WHERE name = 'Physics';
  SELECT id INTO chemistry_id FROM subjects WHERE name = 'Chemistry';
  SELECT id INTO math_id      FROM subjects WHERE name = 'Mathematics';

  -- ─── 1. Learner concept states (knowledge graph data) ──────
  -- Physics: ~40 concepts with varied mastery
  i := 0;
  FOR rec IN
    SELECT c.id AS cid, c.chapter_id, c.difficulty_level
    FROM concepts c WHERE c.subject_id = physics_id
    ORDER BY c.created_at
    LIMIT 40
  LOOP
    i := i + 1;
    INSERT INTO learner_concept_states (
      user_id, concept_id, mastery_state, mastery_score, ease_factor,
      interval_days, repetition_count, stability, next_review_date, last_reviewed_at,
      total_attempts, correct_attempts
    ) VALUES (
      demo_uid, rec.cid,
      CASE
        WHEN i <= 12 THEN 'mastered'::mastery_state
        WHEN i <= 22 THEN 'reviewing'::mastery_state
        WHEN i <= 30 THEN 'learning'::mastery_state
        WHEN i <= 35 THEN 'forgotten'::mastery_state
        ELSE 'unseen'::mastery_state
      END,
      CASE
        WHEN i <= 12 THEN 0.85 + (random() * 0.15)
        WHEN i <= 22 THEN 0.55 + (random() * 0.25)
        WHEN i <= 30 THEN 0.20 + (random() * 0.25)
        WHEN i <= 35 THEN 0.05 + (random() * 0.10)
        ELSE 0.0
      END,
      2.5 + (random() * 0.5),
      CASE WHEN i <= 12 THEN 14 + (random() * 20)::int WHEN i <= 22 THEN 3 + (random() * 7)::int ELSE 1 END,
      CASE WHEN i <= 12 THEN 5 + (random() * 5)::int WHEN i <= 30 THEN 1 + (random() * 3)::int ELSE 0 END,
      CASE WHEN i <= 12 THEN 15.0 + random() * 20 WHEN i <= 22 THEN 5.0 + random() * 10 ELSE 1.0 + random() * 2 END,
      CASE
        WHEN i <= 12 THEN CURRENT_DATE + (7 + (random() * 21)::int)
        WHEN i <= 30 THEN CURRENT_DATE + ((-1) + (random() * 3)::int)  -- some due today/yesterday
        WHEN i <= 35 THEN CURRENT_DATE - (1 + (random() * 5)::int)     -- overdue
        ELSE NULL
      END,
      CASE WHEN i <= 35 THEN now() - ((random() * 20)::int || ' days')::interval ELSE NULL END,
      CASE WHEN i <= 12 THEN 8 + (random() * 5)::int WHEN i <= 30 THEN 2 + (random() * 4)::int ELSE 0 END,
      CASE WHEN i <= 12 THEN 7 + (random() * 5)::int WHEN i <= 22 THEN 2 + (random() * 2)::int ELSE 0 END
    ) ON CONFLICT (user_id, concept_id) DO NOTHING;
  END LOOP;

  -- Chemistry: ~35 concepts
  i := 0;
  FOR rec IN
    SELECT c.id AS cid FROM concepts c WHERE c.subject_id = chemistry_id ORDER BY c.created_at LIMIT 35
  LOOP
    i := i + 1;
    INSERT INTO learner_concept_states (
      user_id, concept_id, mastery_state, mastery_score, ease_factor,
      interval_days, repetition_count, stability, next_review_date, last_reviewed_at,
      total_attempts, correct_attempts
    ) VALUES (
      demo_uid, rec.cid,
      CASE
        WHEN i <= 8  THEN 'mastered'::mastery_state
        WHEN i <= 15 THEN 'reviewing'::mastery_state
        WHEN i <= 24 THEN 'learning'::mastery_state
        WHEN i <= 30 THEN 'forgotten'::mastery_state
        ELSE 'unseen'::mastery_state
      END,
      CASE
        WHEN i <= 8  THEN 0.82 + (random() * 0.18)
        WHEN i <= 15 THEN 0.50 + (random() * 0.25)
        WHEN i <= 24 THEN 0.15 + (random() * 0.25)
        WHEN i <= 30 THEN 0.03 + (random() * 0.08)
        ELSE 0.0
      END,
      2.5, 3, 2 + (random() * 3)::int,
      CASE WHEN i <= 8 THEN 12.0 + random()*15 WHEN i <= 15 THEN 4.0 + random()*8 ELSE 1.0 END,
      CASE WHEN i <= 24 THEN CURRENT_DATE + ((-2) + (random() * 5)::int) ELSE NULL END,
      CASE WHEN i <= 30 THEN now() - ((random() * 15)::int || ' days')::interval ELSE NULL END,
      CASE WHEN i <= 24 THEN 3 + (random()*5)::int ELSE 0 END,
      CASE WHEN i <= 15 THEN 3 + (random()*3)::int ELSE 0 END
    ) ON CONFLICT (user_id, concept_id) DO NOTHING;
  END LOOP;

  -- Mathematics: ~30 concepts
  i := 0;
  FOR rec IN
    SELECT c.id AS cid FROM concepts c WHERE c.subject_id = math_id ORDER BY c.created_at LIMIT 30
  LOOP
    i := i + 1;
    INSERT INTO learner_concept_states (
      user_id, concept_id, mastery_state, mastery_score, ease_factor,
      interval_days, repetition_count, stability, next_review_date, last_reviewed_at,
      total_attempts, correct_attempts
    ) VALUES (
      demo_uid, rec.cid,
      CASE
        WHEN i <= 10 THEN 'mastered'::mastery_state
        WHEN i <= 18 THEN 'reviewing'::mastery_state
        WHEN i <= 25 THEN 'learning'::mastery_state
        ELSE 'unseen'::mastery_state
      END,
      CASE
        WHEN i <= 10 THEN 0.80 + (random() * 0.20)
        WHEN i <= 18 THEN 0.45 + (random() * 0.30)
        WHEN i <= 25 THEN 0.10 + (random() * 0.30)
        ELSE 0.0
      END,
      2.5, 4, 2 + (random()*4)::int,
      CASE WHEN i <= 10 THEN 14.0+random()*18 WHEN i <= 18 THEN 5.0+random()*8 ELSE 1.0 END,
      CASE WHEN i <= 25 THEN CURRENT_DATE + ((-1) + (random()*4)::int) ELSE NULL END,
      CASE WHEN i <= 25 THEN now() - ((random()*18)::int || ' days')::interval ELSE NULL END,
      CASE WHEN i <= 18 THEN 4 + (random()*6)::int ELSE 0 END,
      CASE WHEN i <= 10 THEN 4 + (random()*5)::int ELSE 0 END
    ) ON CONFLICT (user_id, concept_id) DO NOTHING;
  END LOOP;

  -- ─── 2. Learner chapter progress ──────────────────────────
  FOR rec IN
    SELECT ch.id AS chid, ch.subject_id, ch.total_concepts,
           (SELECT count(*) FROM concepts c2 WHERE c2.chapter_id = ch.id) AS real_count
    FROM chapters ch
    WHERE ch.subject_id IN (physics_id, chemistry_id, math_id)
    ORDER BY ch.chapter_number
    LIMIT 50
  LOOP
    INSERT INTO learner_chapter_progress (
      user_id, chapter_id, concepts_seen, concepts_mastered,
      completion_percent, last_studied_at, time_spent_minutes
    ) VALUES (
      demo_uid, rec.chid,
      greatest(0, (rec.real_count * (0.3 + random()*0.7))::int),
      greatest(0, (rec.real_count * (0.1 + random()*0.4))::int),
      (20 + random() * 80)::numeric(5,2),
      now() - ((random() * 14)::int || ' days')::interval,
      (15 + random() * 120)::int
    ) ON CONFLICT (user_id, chapter_id) DO NOTHING;
  END LOOP;

  -- ─── 3. Revision queue (due today and upcoming) ───────────
  FOR rec IN
    SELECT concept_id FROM learner_concept_states
    WHERE user_id = demo_uid AND mastery_state IN ('reviewing', 'learning', 'forgotten')
    LIMIT 25
  LOOP
    INSERT INTO revision_queue (user_id, concept_id, scheduled_date, priority_score, is_completed)
    VALUES (
      demo_uid, rec.concept_id,
      CURRENT_DATE + ((-1) + (random()*2)::int),
      50 + (random() * 50)::numeric(8,4),
      false
    );
  END LOOP;

  -- Some completed reviews in the past
  FOR rec IN
    SELECT concept_id FROM learner_concept_states
    WHERE user_id = demo_uid AND mastery_state = 'mastered'
    LIMIT 15
  LOOP
    INSERT INTO revision_queue (user_id, concept_id, scheduled_date, priority_score, is_completed, completed_at)
    VALUES (
      demo_uid, rec.concept_id,
      CURRENT_DATE - (1 + (random()*5)::int),
      30 + random()::numeric(8,4) * 40,
      true,
      now() - ((1 + (random()*5)::int) || ' days')::interval
    );
  END LOOP;

  -- ─── 4. Revision streak ───────────────────────────────────
  INSERT INTO revision_streaks (user_id, current_streak, longest_streak, last_revision_date, total_revision_days, freeze_tokens_remaining)
  VALUES (demo_uid, 7, 14, CURRENT_DATE, 32, 2)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = 7, longest_streak = 14, last_revision_date = CURRENT_DATE, total_revision_days = 32;

  -- ─── 5. Study plan + daily plans ──────────────────────────
  INSERT INTO study_plans (
    user_id, exam_type, exam_date, status, total_weeks, current_week,
    syllabus_coverage_percent, weak_subjects, strong_subjects,
    plan_config, last_rebalanced_at
  ) VALUES (
    demo_uid, 'JEE', (CURRENT_DATE + interval '90 days')::date, 'active',
    13, 4, 42.5,
    ARRAY['Chemistry']::subject_type[],
    ARRAY['Mathematics']::subject_type[],
    '{"daily_hours": 5, "priority_subjects": ["Chemistry", "Physics"]}'::jsonb,
    now() - interval '10 days'
  ) RETURNING id INTO plan_id;

  -- Today's plan with 5 slots (2 completed, 3 pending)
  INSERT INTO daily_study_plans (plan_id, user_id, plan_date, total_hours, is_completed, completion_percent, slots)
  VALUES (
    plan_id, demo_uid, CURRENT_DATE, 5, false, 40.0,
    jsonb_build_array(
      jsonb_build_object('subject','Physics',     'type','new',      'duration_minutes',60, 'status','completed','is_completed',true,  'xp_awarded',20),
      jsonb_build_object('subject','Chemistry',   'type','revision', 'duration_minutes',45, 'status','completed','is_completed',true,  'xp_awarded',20),
      jsonb_build_object('subject','Mathematics', 'type','new',      'duration_minutes',60, 'status','pending',  'is_completed',false, 'xp_awarded',null),
      jsonb_build_object('subject','Physics',     'type','revision', 'duration_minutes',45, 'status','pending',  'is_completed',false, 'xp_awarded',null),
      jsonb_build_object('subject','Chemistry',   'type','test',     'duration_minutes',90, 'status','pending',  'is_completed',false, 'xp_awarded',null)
    )
  );

  -- Past 6 days of plans
  FOR i IN 1..6 LOOP
    INSERT INTO daily_study_plans (plan_id, user_id, plan_date, total_hours, is_completed, completion_percent, slots)
    VALUES (
      plan_id, demo_uid, CURRENT_DATE - i, 5,
      CASE WHEN random() > 0.3 THEN true ELSE false END,
      (50 + random() * 50)::numeric(5,2),
      jsonb_build_array(
        jsonb_build_object('subject','Physics',     'type','new',      'duration_minutes',60, 'status','completed','is_completed',true,  'xp_awarded',20),
        jsonb_build_object('subject','Chemistry',   'type','revision', 'duration_minutes',45, 'status','completed','is_completed',true,  'xp_awarded',20),
        jsonb_build_object('subject','Mathematics', 'type','new',      'duration_minutes',60, 'status','completed','is_completed',true,  'xp_awarded',20)
      )
    ) ON CONFLICT (user_id, plan_date) DO NOTHING;
  END LOOP;

  -- ─── 6. Daily activity heatmap (90 days) ──────────────────
  FOR i IN 0..89 LOOP
    day_cursor := CURRENT_DATE - i;
    -- Skip ~15% of days for realism
    IF random() < 0.15 AND i > 2 THEN
      CONTINUE;
    END IF;

    rand_xp   := (20 + random() * 280)::int;
    rand_mins  := (15 + random() * 180)::int;
    rand_ret   := CASE
      WHEN i < 7  THEN 0.65 + random() * 0.30   -- recent: decent retention
      WHEN i < 30 THEN 0.45 + random() * 0.40
      ELSE              0.30 + random() * 0.50
    END;

    INSERT INTO daily_activity_heatmap (
      user_id, activity_date, study_minutes, cards_reviewed,
      questions_attempted, doubts_asked, xp_earned,
      subjects_covered, avg_retention_score
    ) VALUES (
      demo_uid, day_cursor, rand_mins,
      (3 + random() * 25)::int,
      (0 + random() * 10)::int,
      (random() * 3)::int,
      rand_xp,
      CASE (i % 3)
        WHEN 0 THEN ARRAY['Physics','Chemistry']::subject_type[]
        WHEN 1 THEN ARRAY['Mathematics','Physics']::subject_type[]
        ELSE        ARRAY['Chemistry','Mathematics']::subject_type[]
      END,
      round(rand_ret::numeric, 3)
    ) ON CONFLICT (user_id, activity_date) DO NOTHING;
  END LOOP;

  -- ─── 7. Weekly performance snapshots (8 weeks) ─────────────
  -- Chemistry has a DIP in the latest week to trigger rebalancing alert
  FOR i IN 0..7 LOOP
    INSERT INTO weekly_performance_snapshots (
      user_id, week_start, overall_score,
      subject_scores, concepts_mastered,
      revision_completion_rate, test_accuracy
    ) VALUES (
      demo_uid,
      CURRENT_DATE - (i * 7) - (extract(dow from CURRENT_DATE)::int),  -- Monday of each week
      (55 + random() * 30)::numeric(5,2),
      CASE
        WHEN i = 0 THEN  -- THIS week: Chemistry dip
          '{"Physics": 72, "Chemistry": 38, "Mathematics": 68}'::jsonb
        WHEN i = 1 THEN  -- LAST week: Chemistry was fine
          '{"Physics": 70, "Chemistry": 58, "Mathematics": 65}'::jsonb
        ELSE
          jsonb_build_object(
            'Physics',     (55 + random()*30)::int,
            'Chemistry',   (50 + random()*30)::int,
            'Mathematics', (50 + random()*35)::int
          )
      END,
      (5 + random() * 10)::int,
      (60 + random() * 35)::numeric(5,2),
      (50 + random() * 40)::numeric(5,2)
    ) ON CONFLICT (user_id, week_start) DO NOTHING;
  END LOOP;

  -- ─── 8. Study sessions + interaction events (for forgetting curve) ─
  -- Create a study session for the past 15 days (one per day)
  FOR i IN 0..14 LOOP
    INSERT INTO study_sessions (
      user_id, session_type, started_at, ended_at, duration_minutes,
      subject_id, cards_reviewed, cards_correct, xp_earned
    ) VALUES (
      demo_uid, 'revision',
      (now() - (i || ' days')::interval) - interval '2 hours',
      (now() - (i || ' days')::interval) - interval '1 hour',
      (20 + random() * 40)::int,
      CASE (i % 3) WHEN 0 THEN physics_id WHEN 1 THEN chemistry_id ELSE math_id END,
      (5 + random() * 15)::int,
      (3 + random() * 12)::int,
      (30 + random() * 80)::int
    ) RETURNING id INTO sess_id;

    -- Add 3-5 interaction events per session
    FOR rec IN
      SELECT concept_id FROM learner_concept_states
      WHERE user_id = demo_uid AND mastery_state != 'unseen'
      ORDER BY random() LIMIT (3 + (random()*2)::int)
    LOOP
      INSERT INTO concept_interaction_events (
        user_id, session_id, concept_id, event_type,
        quality_score, response_time_ms, was_correct, hint_used
      ) VALUES (
        demo_uid, sess_id, rec.concept_id, 'revision',
        (2 + random() * 3)::int,
        (1500 + random() * 8000)::int,
        random() > 0.3,
        random() > 0.85
      );
    END LOOP;
  END LOOP;

  -- ─── 9. Questions (JEE MCQ bank) ─────────────────────────
  -- We'll insert 30 real JEE-style questions and collect their IDs

  DECLARE
    q_ids uuid[] := '{}';
    q_id  uuid;
    phy_ch1 uuid;
    phy_ch2 uuid;
    chem_ch1 uuid;
    chem_ch2 uuid;
    math_ch1 uuid;
    math_ch2 uuid;
    test_sess_id uuid;
    test2_sess_id uuid;
    test3_sess_id uuid;
    pdf_test_id uuid;
  BEGIN

  -- Get some chapter IDs for questions
  SELECT id INTO phy_ch1  FROM chapters WHERE subject_id = physics_id   ORDER BY chapter_number LIMIT 1;
  SELECT id INTO phy_ch2  FROM chapters WHERE subject_id = physics_id   ORDER BY chapter_number OFFSET 2 LIMIT 1;
  SELECT id INTO chem_ch1 FROM chapters WHERE subject_id = chemistry_id ORDER BY chapter_number LIMIT 1;
  SELECT id INTO chem_ch2 FROM chapters WHERE subject_id = chemistry_id ORDER BY chapter_number OFFSET 2 LIMIT 1;
  SELECT id INTO math_ch1 FROM chapters WHERE subject_id = math_id      ORDER BY chapter_number LIMIT 1;
  SELECT id INTO math_ch2 FROM chapters WHERE subject_id = math_id      ORDER BY chapter_number OFFSET 2 LIMIT 1;

  -- Physics questions (10)
  INSERT INTO questions (subject_id, chapter_id, exam_type, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty_level, is_pyq, marks_positive, marks_negative, verified)
  VALUES
    (physics_id, phy_ch1, 'JEE', 'A body of mass 5 kg is moving with a velocity of 10 m/s. A force of 10 N is applied on it for 5 seconds. The final velocity of the body is:', '20 m/s', '15 m/s', '25 m/s', '10 m/s', 'A', 'Using F=ma, a=10/5=2 m/s². v=u+at=10+2×5=20 m/s', 'Easy', false, 4, -1, true),
    (physics_id, phy_ch1, 'JEE', 'A projectile is thrown at angle 60° with horizontal with initial velocity 20 m/s. The range of the projectile is (g=10 m/s²):', '20√3 m', '20 m', '40 m', '10√3 m', 'A', 'R = u²sin2θ/g = 400×sin120°/10 = 400×(√3/2)/10 = 20√3 m', 'Medium', true, 4, -1, true),
    (physics_id, phy_ch2, 'JEE', 'Two blocks of masses 3 kg and 5 kg are connected by a light string passing over a frictionless pulley. The acceleration of the system is (g=10 m/s²):', '2.5 m/s²', '5 m/s²', '3.75 m/s²', '1.25 m/s²', 'A', 'a = (m₂-m₁)g/(m₁+m₂) = (5-3)×10/(3+5) = 20/8 = 2.5 m/s²', 'Easy', false, 4, -1, true),
    (physics_id, phy_ch2, 'JEE', 'A 2 kg block rests on a rough inclined plane making angle 30° with horizontal. If μ=1/√3, the frictional force acting on the block is:', '10 N', '20/√3 N', '10√3 N', '20 N', 'A', 'Component along plane = mgsin30° = 2×10×0.5 = 10N. Max friction = μmgcos30° = (1/√3)(20)(√3/2) = 10N. Block is at rest, so f = mgsin30° = 10N', 'Medium', true, 4, -1, true),
    (physics_id, phy_ch1, 'JEE', 'The dimensional formula for Planck''s constant is:', '[MLT⁻¹]', '[ML²T⁻¹]', '[ML²T⁻²]', '[ML²T⁻³]', 'B', 'E=hν, so h=E/ν. [h]=[ML²T⁻²]/[T⁻¹]=[ML²T⁻¹]', 'Easy', false, 4, -1, true),
    (physics_id, phy_ch2, 'JEE', 'A ball is thrown vertically upward with velocity 20 m/s from the top of a building 40 m high. Time taken to reach the ground is (g=10 m/s²):', '4 s', '2 s', '6 s', '2(1+√3) s', 'D', 'Using s=ut+½at², -40=20t-5t². 5t²-20t-40=0, t²-4t-8=0. t=(4+√48)/2=2+2√3=2(1+√3) s', 'Hard', true, 4, -1, true),
    (physics_id, phy_ch1, 'JEE', 'The ratio of SI to CGS unit of gravitational constant G is:', '10⁻³', '10³', '10⁻⁷', '10⁷', 'B', 'G in SI = 6.67×10⁻¹¹ N m² kg⁻². Converting: 1N=10⁵ dyne, 1m=100cm, 1kg=1000g. Ratio = 10⁵×10⁴/10⁶ = 10³', 'Medium', false, 4, -1, true),
    (physics_id, phy_ch2, 'JEE', 'A particle moves along a circle of radius R with constant angular velocity ω. The displacement (not distance) of particle after half revolution is:', '2R', 'πR', '2πR', '0', 'A', 'After half revolution, particle is at diametrically opposite point. Displacement = diameter = 2R', 'Easy', false, 4, -1, true),
    (physics_id, phy_ch1, 'JEE', 'If the error in measuring the radius of a sphere is 2%, the error in calculating its volume is:', '6%', '4%', '2%', '8%', 'A', 'V = (4/3)πr³. ΔV/V = 3(Δr/r) = 3×2% = 6%', 'Medium', true, 4, -1, true),
    (physics_id, phy_ch2, 'JEE', 'The moment of inertia of a uniform circular disc of mass M and radius R about an axis tangent to the disc and in the plane of disc is:', '(5/4)MR²', '(3/2)MR²', '(7/4)MR²', '(3/4)MR²', 'A', 'I_diameter = MR²/4. By parallel axis theorem: I = MR²/4 + MR² = 5MR²/4', 'Hard', false, 4, -1, true);

  -- Chemistry questions (10)
  INSERT INTO questions (subject_id, chapter_id, exam_type, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty_level, is_pyq, marks_positive, marks_negative, verified)
  VALUES
    (chemistry_id, chem_ch1, 'JEE', 'The number of moles in 11.2 L of a gas at STP is:', '0.5', '1', '1.5', '2', 'A', 'At STP, 1 mole = 22.4 L. So 11.2/22.4 = 0.5 moles', 'Easy', false, 4, -1, true),
    (chemistry_id, chem_ch1, 'JEE', 'Which of the following has the highest number of atoms?', '1 g of H₂', '1 g of O₂', '1 g of N₂', '1 g of Ag', 'A', '1g H₂ = 0.5 mol = 6.022×10²³ atoms. Others have fewer atoms per gram.', 'Easy', true, 4, -1, true),
    (chemistry_id, chem_ch2, 'JEE', 'The quantum numbers of the last electron in chromium (Z=24) are:', 'n=3, l=2, ml=-2, ms=+½', 'n=4, l=0, ml=0, ms=+½', 'n=3, l=2, ml=+2, ms=-½', 'n=4, l=0, ml=0, ms=-½', 'A', 'Cr has configuration [Ar]3d⁵4s¹ (half-filled stability). Last electron enters 3d.', 'Hard', true, 4, -1, true),
    (chemistry_id, chem_ch2, 'JEE', 'The number of radial nodes in 3p orbital is:', '0', '1', '2', '3', 'B', 'Radial nodes = n-l-1 = 3-1-1 = 1', 'Medium', false, 4, -1, true),
    (chemistry_id, chem_ch1, 'JEE', 'The empirical formula of a compound containing 40% C, 6.7% H, and 53.3% O is:', 'CHO', 'CH₂O', 'C₂H₄O₂', 'CO₂', 'B', 'C:H:O = 40/12 : 6.7/1 : 53.3/16 = 3.33:6.7:3.33 = 1:2:1 → CH₂O', 'Easy', false, 4, -1, true),
    (chemistry_id, chem_ch2, 'JEE', 'Which of the following has the smallest ionic radius?', 'Na⁺', 'Mg²⁺', 'Al³⁺', 'F⁻', 'C', 'All are isoelectronic (10 electrons). Higher nuclear charge → smaller radius. Al³⁺ has Z=13, highest.', 'Medium', true, 4, -1, true),
    (chemistry_id, chem_ch1, 'JEE', 'In the reaction 2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂ + 8H₂O, the equivalent weight of KMnO₄ is (M = molecular weight):', 'M/5', 'M/3', 'M', 'M/2', 'A', 'Mn goes from +7 to +2, change of 5 electrons. Equivalent weight = M/n = M/5', 'Medium', false, 4, -1, true),
    (chemistry_id, chem_ch2, 'JEE', 'The bond angle in H₂O is approximately:', '90°', '104.5°', '109.5°', '120°', 'B', 'H₂O has sp³ hybridization with 2 lone pairs. Lone pair-bond pair repulsion reduces angle from 109.5° to 104.5°', 'Easy', true, 4, -1, true),
    (chemistry_id, chem_ch1, 'JEE', 'The molarity of a solution containing 4.9 g of H₂SO₄ in 500 mL of solution is:', '0.1 M', '0.5 M', '0.05 M', '1 M', 'A', 'Moles of H₂SO₄ = 4.9/98 = 0.05. Molarity = 0.05/0.5 = 0.1 M', 'Easy', false, 4, -1, true),
    (chemistry_id, chem_ch2, 'JEE', 'The IUPAC name of CH₃-CH=CH-CHO is:', 'But-2-enal', '2-Butenal', 'Crotonaldehyde', 'Both A and B', 'D', 'The compound is CH₃CH=CHCHO. IUPAC: But-2-enal or 2-Butenal (equivalent)', 'Medium', false, 4, -1, true);

  -- Math questions (10)
  INSERT INTO questions (subject_id, chapter_id, exam_type, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty_level, is_pyq, marks_positive, marks_negative, verified)
  VALUES
    (math_id, math_ch1, 'JEE', 'If A = {1,2,3,4} and B = {2,4,6,8}, then A ∩ B is:', '{2,4}', '{1,2,3,4,6,8}', '{6,8}', '{1,3}', 'A', 'Intersection contains common elements: {2,4}', 'Easy', false, 4, -1, true),
    (math_id, math_ch1, 'JEE', 'The number of subsets of a set containing n elements is:', '2n', 'n²', '2ⁿ', 'n!', 'C', 'Each element has 2 choices (include/exclude). Total subsets = 2ⁿ', 'Easy', true, 4, -1, true),
    (math_id, math_ch2, 'JEE', 'If z = 3+4i, then |z| is:', '5', '7', '25', '1', 'A', '|z| = √(3²+4²) = √(9+16) = √25 = 5', 'Easy', false, 4, -1, true),
    (math_id, math_ch2, 'JEE', 'The argument of the complex number -1+i is:', 'π/4', '3π/4', '-π/4', '5π/4', 'B', '-1+i lies in Q2. θ = π - arctan(1/1) = π - π/4 = 3π/4', 'Medium', true, 4, -1, true),
    (math_id, math_ch1, 'JEE', 'If f(x) = x² + 2x + 1, then f(f(1)) is:', '16', '25', '36', '9', 'B', 'f(1) = 1+2+1 = 4. f(4) = 16+8+1 = 25', 'Easy', false, 4, -1, true),
    (math_id, math_ch2, 'JEE', 'The value of i¹⁰⁰ + i¹⁰¹ + i¹⁰² + i¹⁰³ is:', '0', '1', '-1', 'i', 'A', 'i¹⁰⁰=1, i¹⁰¹=i, i¹⁰²=-1, i¹⁰³=-i. Sum = 1+i-1-i = 0', 'Medium', true, 4, -1, true),
    (math_id, math_ch1, 'JEE', 'The domain of f(x) = √(4-x²) is:', '[-2, 2]', '(-2, 2)', '(-∞, -2] ∪ [2, ∞)', 'R', 'A', '4-x² ≥ 0 → x² ≤ 4 → -2 ≤ x ≤ 2', 'Easy', false, 4, -1, true),
    (math_id, math_ch2, 'JEE', 'If ω is a cube root of unity, then (1+ω)(1+ω²) equals:', '1', '-1', '0', 'ω', 'A', '(1+ω)(1+ω²) = 1+ω²+ω+ω³ = 1+(-1)+1 = 1 (since 1+ω+ω²=0 and ω³=1)', 'Hard', false, 4, -1, true),
    (math_id, math_ch1, 'JEE', 'If A and B are two sets such that n(A)=20, n(B)=30, and n(A∪B)=40, then n(A∩B) is:', '10', '20', '30', '50', 'A', 'n(A∪B) = n(A)+n(B)-n(A∩B). 40 = 20+30-n(A∩B). n(A∩B) = 10', 'Easy', true, 4, -1, true),
    (math_id, math_ch2, 'JEE', 'The modulus of (1+i)/(1-i) is:', '1', '√2', '2', '1/√2', 'A', '(1+i)/(1-i) = (1+i)²/((1-i)(1+i)) = (1+2i-1)/2 = 2i/2 = i. |i| = 1', 'Medium', false, 4, -1, true);

  -- Collect all question IDs
  SELECT array_agg(id) INTO q_ids FROM questions;

  -- ─── 10. Test sessions with real question IDs + answers ───
  -- Test 1: Physics test (2 days ago) — the main one shown on dashboard
  INSERT INTO study_sessions (
    user_id, session_type, started_at, ended_at, duration_minutes,
    subject_id, xp_earned
  ) VALUES (
    demo_uid, 'test', now() - interval '2 days', now() - interval '2 days' + interval '1.5 hours',
    90, physics_id, 100
  ) RETURNING id INTO sess_id;

  INSERT INTO test_sessions (
    user_id, session_id, exam_type, subject_id,
    question_ids, total_questions, duration_minutes,
    started_at, submitted_at, score, max_score, percentile
  ) VALUES (
    demo_uid, sess_id, 'JEE', physics_id,
    (SELECT array_agg(id) FROM questions WHERE subject_id = physics_id),
    10, 90,
    now() - interval '2 days',
    now() - interval '2 days' + interval '1.5 hours',
    32.00, 40.00, 87.5
  ) RETURNING id INTO test_sess_id;

  -- Test answers for Test 1
  i := 0;
  FOR rec IN SELECT id AS qid FROM questions WHERE subject_id = physics_id LOOP
    i := i + 1;
    INSERT INTO test_answers (test_session_id, question_id, user_id, selected_option, is_correct, marks_awarded, time_spent_ms)
    VALUES (
      test_sess_id, rec.qid, demo_uid,
      CASE WHEN i <= 8 THEN 'A' ELSE (ARRAY['A','B','C','D'])[1 + (random()*3)::int] END,
      i <= 8,
      CASE WHEN i <= 8 THEN 4.00 ELSE -1.00 END,
      (30000 + random() * 120000)::int
    );
  END LOOP;

  -- Test 2: Chemistry test (5 days ago)
  INSERT INTO study_sessions (
    user_id, session_type, started_at, ended_at, duration_minutes,
    subject_id, xp_earned
  ) VALUES (
    demo_uid, 'test', now() - interval '5 days', now() - interval '5 days' + interval '1 hour',
    60, chemistry_id, 80
  ) RETURNING id INTO sess_id;

  INSERT INTO test_sessions (
    user_id, session_id, exam_type, subject_id,
    question_ids, total_questions, duration_minutes,
    started_at, submitted_at, score, max_score, percentile
  ) VALUES (
    demo_uid, sess_id, 'JEE', chemistry_id,
    (SELECT array_agg(id) FROM questions WHERE subject_id = chemistry_id),
    10, 60,
    now() - interval '5 days',
    now() - interval '5 days' + interval '1 hour',
    28.00, 40.00, 72.0
  ) RETURNING id INTO test2_sess_id;

  i := 0;
  FOR rec IN SELECT id AS qid FROM questions WHERE subject_id = chemistry_id LOOP
    i := i + 1;
    INSERT INTO test_answers (test_session_id, question_id, user_id, selected_option, is_correct, marks_awarded, time_spent_ms)
    VALUES (
      test2_sess_id, rec.qid, demo_uid,
      CASE WHEN i <= 7 THEN (ARRAY['A','B','C','D','A','B','A','B','A','D'])[i] ELSE 'C' END,
      i <= 7,
      CASE WHEN i <= 7 THEN 4.00 ELSE -1.00 END,
      (25000 + random() * 90000)::int
    );
  END LOOP;

  -- Test 3: Math test (10 days ago)
  INSERT INTO study_sessions (
    user_id, session_type, started_at, ended_at, duration_minutes,
    subject_id, xp_earned
  ) VALUES (
    demo_uid, 'test', now() - interval '10 days', now() - interval '10 days' + interval '75 minutes',
    75, math_id, 90
  ) RETURNING id INTO sess_id;

  INSERT INTO test_sessions (
    user_id, session_id, exam_type, subject_id,
    question_ids, total_questions, duration_minutes,
    started_at, submitted_at, score, max_score, percentile
  ) VALUES (
    demo_uid, sess_id, 'JEE', math_id,
    (SELECT array_agg(id) FROM questions WHERE subject_id = math_id),
    10, 75,
    now() - interval '10 days',
    now() - interval '10 days' + interval '75 minutes',
    36.00, 40.00, 92.0
  ) RETURNING id INTO test3_sess_id;

  i := 0;
  FOR rec IN SELECT id AS qid FROM questions WHERE subject_id = math_id LOOP
    i := i + 1;
    INSERT INTO test_answers (test_session_id, question_id, user_id, selected_option, is_correct, marks_awarded, time_spent_ms)
    VALUES (
      test3_sess_id, rec.qid, demo_uid,
      CASE WHEN i <= 9 THEN (ARRAY['A','C','A','B','B','A','A','A','A','A'])[i] ELSE 'B' END,
      i <= 9,
      CASE WHEN i <= 9 THEN 4.00 ELSE -1.00 END,
      (20000 + random() * 100000)::int
    );
  END LOOP;

  -- ─── 11. PDF Tests (uploaded test papers) ─────────────────
  INSERT INTO pdf_tests (created_by, title, source_filename, question_ids, total_questions, duration_minutes, is_active)
  VALUES (
    demo_uid, 'JEE Main 2024 Paper 1 — Physics',
    'jee_main_2024_physics.pdf',
    (SELECT array_agg(id) FROM questions WHERE subject_id = physics_id),
    10, 60, true
  );

  INSERT INTO pdf_tests (created_by, title, source_filename, question_ids, total_questions, duration_minutes, is_active)
  VALUES (
    demo_uid, 'JEE Main 2024 Paper 1 — Chemistry',
    'jee_main_2024_chemistry.pdf',
    (SELECT array_agg(id) FROM questions WHERE subject_id = chemistry_id),
    10, 60, true
  );

  INSERT INTO pdf_tests (created_by, title, source_filename, question_ids, total_questions, duration_minutes, is_active)
  VALUES (
    demo_uid, 'JEE Main 2024 Full Paper — Mathematics',
    'jee_main_2024_math.pdf',
    (SELECT array_agg(id) FROM questions WHERE subject_id = math_id),
    10, 60, true
  );

  -- ─── 12. Doubt sessions (AI Tutor history) ───────────────
  -- Need study sessions for doubts
  INSERT INTO study_sessions (user_id, session_type, started_at, ended_at, duration_minutes, subject_id, xp_earned)
  VALUES (demo_uid, 'doubt', now() - interval '1 day', now() - interval '1 day' + interval '10 minutes', 10, physics_id, 10)
  RETURNING id INTO sess_id;

  INSERT INTO doubt_sessions (user_id, session_id, question_text, question_language, subject_id, answer_text, answer_language, sources, rag_chunks_used, llm_model, tokens_used, latency_ms, was_helpful, follow_up_count)
  VALUES
    (demo_uid, sess_id,
     'Explain Newton''s third law with a real-world example',
     'en', physics_id,
     '**Newton''s Third Law** states that for every action, there is an equal and opposite reaction. **Key Points:** Forces always come in pairs. The action and reaction act on different bodies. They are equal in magnitude but opposite in direction. **Real-world Example:** When you jump off a boat onto a dock, you push the boat backward (action) while the boat pushes you forward (reaction). **Another Example:** A rocket expels gas downward (action), and the gas pushes the rocket upward (reaction).',
     'en',
     '[{"title": "Laws of Motion", "chapter": "Laws of Motion", "page": 1, "excerpt": "Newton''s third law: To every action there is an equal and opposite reaction."}]'::jsonb,
     3, 'stepfun/step-3.5-flash:free', 850, 2340, true, 0),
    (demo_uid, sess_id,
     'What is the difference between elastic and inelastic collision?',
     'en', physics_id,
     '**Elastic vs Inelastic Collision:** In elastic collisions, both momentum and kinetic energy are conserved (e.g., billiard balls). In inelastic collisions, only momentum is conserved — KE is partially converted to heat, sound, or deformation. In perfectly inelastic collisions, bodies stick together (maximum KE loss, e.g., bullet embedding in wood). Formula: m1v1 + m2v2 = (m1+m2)v_final.',
     'en',
     '[{"title": "Work, Energy and Power", "chapter": "Work, Energy and Power", "page": 3, "excerpt": "In elastic collisions, both momentum and kinetic energy are conserved."}]'::jsonb,
     2, 'stepfun/step-3.5-flash:free', 1200, 3100, true, 1);

  INSERT INTO study_sessions (user_id, session_type, started_at, ended_at, duration_minutes, subject_id, xp_earned)
  VALUES (demo_uid, 'doubt', now() - interval '3 days', now() - interval '3 days' + interval '8 minutes', 8, chemistry_id, 10)
  RETURNING id INTO sess_id;

  INSERT INTO doubt_sessions (user_id, session_id, question_text, question_language, subject_id, answer_text, answer_language, sources, rag_chunks_used, llm_model, tokens_used, latency_ms, was_helpful, follow_up_count)
  VALUES
    (demo_uid, sess_id,
     'Why does ice float on water? Explain using hydrogen bonding.',
     'en', chemistry_id,
     '**Why Ice Floats on Water:** Ice has lower density (0.917 g/cm3) than liquid water (1.0 g/cm3) due to hydrogen bonding. In liquid water, H-bonds are dynamic (~3.4 per molecule). When water freezes, each molecule forms exactly 4 H-bonds in a tetrahedral arrangement, creating an open hexagonal crystal lattice with MORE empty space. Therefore ice is LESS dense. Biological importance: ice floats and insulates water below, allowing aquatic life to survive winter.',
     'en',
     '[{"title": "States of Matter", "chapter": "States of Matter", "page": 2, "excerpt": "Water exhibits anomalous behavior due to extensive hydrogen bonding."}]'::jsonb,
     4, 'stepfun/step-3.5-flash:free', 980, 2800, true, 0);

  INSERT INTO study_sessions (user_id, session_type, started_at, ended_at, duration_minutes, subject_id, xp_earned)
  VALUES (demo_uid, 'doubt', now() - interval '5 days', now() - interval '5 days' + interval '12 minutes', 12, math_id, 10)
  RETURNING id INTO sess_id;

  INSERT INTO doubt_sessions (user_id, session_id, question_text, question_language, subject_id, answer_text, answer_language, sources, rag_chunks_used, llm_model, tokens_used, latency_ms, was_helpful, follow_up_count)
  VALUES
    (demo_uid, sess_id,
     'How to find the number of onto functions from set A to set B?',
     'en', math_id,
     '**Number of Onto (Surjective) Functions:** If |A|=m and |B|=n, use Inclusion-Exclusion: Sum from k=0 to n of (-1)^k * C(n,k) * (n-k)^m. Example: A={1,2,3}, B={a,b}: Total=8, Missing a=1, Missing b=1, Onto = 8-2 = 6. Onto functions exist only when m >= n.',
     'en',
     '[{"title": "Sets and Functions", "chapter": "Sets", "page": 5, "excerpt": "A function f: A→B is onto if every element of B has a preimage in A."}]'::jsonb,
     3, 'stepfun/step-3.5-flash:free', 1050, 2650, NULL, 2),
    (demo_uid, sess_id,
     'Solve: Find the value of lim(x→0) sin(x)/x',
     'en', math_id,
     '**The Most Famous Limit:** lim(x->0) sin(x)/x = 1. Proof via Squeeze Theorem: for 0 < x < pi/2, cos(x) < sin(x)/x < 1. As x->0, cos(x)->1. Related limits: tan(x)/x=1, (1-cosx)/x^2=1/2, sin(ax)/(bx)=a/b, (e^x-1)/x=1, ln(1+x)/x=1. JEE Tip: These are standard limits, directly applicable without proof.',
     'en',
     '[]'::jsonb,
     1, 'stepfun/step-3.5-flash:free', 720, 1890, true, 0);

  -- ─── 13. Processed videos (Content processor) ────────────
  INSERT INTO processed_videos (
    user_id, youtube_url, youtube_video_id, title, channel,
    duration_seconds, language_detected, transcript_raw,
    structured_notes, summary,
    processing_status, processing_started_at, processing_completed_at
  ) VALUES
    (demo_uid,
     'https://www.youtube.com/watch?v=ZM8ECpBuQYE',
     'ZM8ECpBuQYE',
     'Newton''s Laws of Motion — Complete JEE Physics',
     'Physics Wallah',
     2400, 'en',
     'In this lecture, we will cover all three of Newton''s laws of motion...',
     '[{"heading": "Newton''s First Law (Law of Inertia)", "content": "A body at rest stays at rest and a body in motion continues in uniform motion unless acted upon by an external unbalanced force."}, {"heading": "Newton''s Second Law", "content": "The rate of change of momentum is directly proportional to the applied force. F = ma."}, {"heading": "Newton''s Third Law", "content": "For every action, there is an equal and opposite reaction. Action and reaction act on different bodies."}, {"heading": "Applications", "content": "Free body diagrams (FBD) are essential. Steps: identify forces, choose coordinates, apply F=ma along each axis."}]'::jsonb,
     'Complete lecture covering Newton''s three laws of motion with JEE-focused problem solving techniques.',
     'completed', now() - interval '7 days', now() - interval '7 days' + interval '5 minutes'),
    (demo_uid,
     'https://www.youtube.com/watch?v=Q7GKg_8pYqc',
     'Q7GKg_8pYqc',
     'Atomic Structure — Bohr Model & Quantum Numbers for JEE',
     'Unacademy JEE',
     3000, 'en',
     'Today we dive deep into atomic structure starting from Bohr model...',
     '[{"heading": "Bohr Model of Atom", "content": "Postulates: electrons orbit in fixed energy levels, angular momentum is quantized. Energy: En = -13.6Z^2/n^2 eV."}, {"heading": "Quantum Numbers", "content": "Four quantum numbers: n (principal), l (azimuthal), ml (magnetic), ms (spin). These uniquely identify each electron."}, {"heading": "Electronic Configuration", "content": "Aufbau principle, Pauli exclusion, Hund rule. Special cases: Cr [Ar]3d5 4s1, Cu [Ar]3d10 4s1."}, {"heading": "Important Formulas", "content": "Radius: rn = 0.529 n^2/Z A. Velocity: vn = 2.18e6 Z/n m/s. De Broglie: lambda = h/mv."}]'::jsonb,
     'In-depth atomic structure for JEE: Bohr model postulates, quantum numbers, electronic configuration rules with exceptions.',
     'completed', now() - interval '12 days', now() - interval '12 days' + interval '6 minutes'),
    (demo_uid,
     'https://www.youtube.com/watch?v=riXcZT2ICjA',
     'riXcZT2ICjA',
     'Complex Numbers — Full Chapter for JEE Mains & Advanced',
     'Mohit Tyagi',
     3600, 'en',
     'Complex numbers is one of the most important chapters for JEE...',
     '[{"heading": "Basics", "content": "z = a + bi. Modulus: |z| = sqrt(a^2+b^2). Conjugate: z-bar = a - bi."}, {"heading": "Argand Plane & Polar Form", "content": "Polar form: z = r(cos theta + i sin theta) = r e^(i theta)."}, {"heading": "Cube Roots of Unity", "content": "omega = e^(2pi i/3). Properties: 1+omega+omega^2=0, omega^3=1."}, {"heading": "Geometry", "content": "Distance = |z1-z2|. Triangle inequality: |z1+z2| <= |z1|+|z2|."}]'::jsonb,
     'Comprehensive complex numbers lecture: algebra, Argand plane, polar/Euler forms, cube roots of unity, geometry applications.',
     'completed', now() - interval '3 days', now() - interval '3 days' + interval '4 minutes');

  -- ─── 14. Subscription ────────────────────────────────────
  INSERT INTO subscriptions (user_id, tier, started_at, expires_at, is_active)
  VALUES (demo_uid, 'pro', now() - interval '30 days', now() + interval '335 days', true);

  -- ─── 15. Notifications ───────────────────────────────────
  INSERT INTO notifications (user_id, type, title, body, is_read, data, channel)
  VALUES
    (demo_uid, 'streak_milestone', 'Streak milestone!', 'You''ve maintained a 7-day study streak! Keep going!', false,
     '{"streak_count": 7}'::jsonb, 'in_app'),
    (demo_uid, 'revision_due', 'Cards due today', 'You have 25 flashcards due for review. Start your revision session now.', false,
     '{"due_count": 25}'::jsonb, 'in_app'),
    (demo_uid, 'test_reminder', 'Great score!', 'You scored 80% on your Physics test. Review the 2 incorrect answers to improve.', true,
     '{"score": 80}'::jsonb, 'in_app'),
    (demo_uid, 'plan_update', 'Plan rebalanced', 'Your study plan was auto-rebalanced due to a dip in Chemistry retention.', true,
     '{"subject": "Chemistry", "dip_pct": 20}'::jsonb, 'in_app'),
    (demo_uid, 'streak_milestone', 'New badge earned!', 'You earned the "Week Warrior" badge for completing 7 days of study.', false,
     '{"badge_id": "week_warrior", "badge_name": "Week Warrior"}'::jsonb, 'in_app');

  END;  -- end inner DECLARE block

  RAISE NOTICE 'Demo data seeded for user demo@vidyai.in (password: demo1234)';

END $$;
