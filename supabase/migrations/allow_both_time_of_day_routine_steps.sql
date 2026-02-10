-- Allow routine_steps.time_of_day to be 'both' (step appears in morning and evening).
ALTER TABLE routine_steps DROP CONSTRAINT IF EXISTS routine_steps_time_of_day_check;
ALTER TABLE routine_steps ADD CONSTRAINT routine_steps_time_of_day_check
  CHECK (time_of_day IN ('morning', 'evening', 'both'));
