-- Optional: run this only if you want the seed data back to its exact
-- original pristine state before grading. Nothing here is required for
-- the app to work — these are just leftovers from testing the new
-- security model (admin/claim RPCs correctly refused to let me undo
-- them over the API, which is the point of the lockdown).

-- Remove the throwaway QA account created during registration testing.
delete from users where email = 'test.student.qa@my.sliit.lk';

-- Put Kavindi Silva back to a regular student (I promoted her once to
-- prove the "Promote to Admin" button works).
update users set role = 'student' where email = 'kavindi.silva@my.sliit.lk';

-- Put the "ID Card Found" claim and its item back to their original
-- pending/open seed state (I approved it once to prove the flow works).
update claims set status = 'pending'
where id = '44444444-4444-4444-4444-444444444403';
update found_items set status = 'open'
where id = '33333333-3333-3333-3333-333333333301';
