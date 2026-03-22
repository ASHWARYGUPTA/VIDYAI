-- Seed: JEE subjects
INSERT INTO subjects (name, exam_types, display_order, description) VALUES
  ('Physics',     ARRAY['JEE', 'NEET']::exam_type[], 1, 'Physics for JEE and NEET'),
  ('Chemistry',   ARRAY['JEE', 'NEET']::exam_type[], 2, 'Chemistry for JEE and NEET'),
  ('Mathematics', ARRAY['JEE']::exam_type[],          3, 'Mathematics for JEE'),
  ('Biology',     ARRAY['NEET']::exam_type[],         4, 'Biology for NEET'),
  ('History',     ARRAY['UPSC']::exam_type[],         5, 'History for UPSC'),
  ('Geography',   ARRAY['UPSC']::exam_type[],         6, 'Geography for UPSC'),
  ('Polity',      ARRAY['UPSC']::exam_type[],         7, 'Indian Polity for UPSC'),
  ('Economy',     ARRAY['UPSC']::exam_type[],         8, 'Economy for UPSC'),
  ('Environment', ARRAY['UPSC', 'NEET']::exam_type[], 9, 'Environment and Ecology'),
  ('Current_Affairs', ARRAY['UPSC']::exam_type[],    10, 'Current Affairs for UPSC')
ON CONFLICT DO NOTHING;
