BEGIN;
SELECT plan(17);

-- 1. Table structure tests
SELECT has_table('public', 'ranking_entries', 'ranking_entries table should exist');

SELECT has_column('public', 'ranking_entries', 'id', 'id column should exist');
SELECT col_type_is('public', 'ranking_entries', 'id', 'uuid', 'id should be of type uuid');

SELECT col_type_is('public', 'ranking_entries', 'player_name', 'text', 'player_name should be of type text');
SELECT col_type_is('public', 'ranking_entries', 'score', 'integer', 'score should be of type integer');
SELECT col_type_is('public', 'ranking_entries', 'total_weight', 'numeric(5,1)', 'total_weight should be of type numeric(5,1)');

-- 2. Constraint validation tests (normal cases)
SELECT lives_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 10.0, 'ValidPlayer')$$,
    'should allow insert with valid parameters'
);

SELECT lives_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 10.0, NULL)$$,
    'should allow insert with null player name'
);

-- 3. Constraint validation tests (error cases)
SELECT throws_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 10.0, 'a_very_long_name_that_exceeds_24_characters_here')$$,
    '23514',
    NULL,
    'should not allow player name longer than 24 characters'
);

SELECT throws_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 10.0, '')$$,
    '23514',
    NULL,
    'should not allow empty string player name'
);

SELECT throws_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (-1, 10.0, 'Player')$$,
    '23514',
    NULL,
    'should not allow negative score'
);

SELECT throws_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, -0.1, 'Player')$$,
    '23514',
    NULL,
    'should not allow negative weight'
);

SELECT throws_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 50.1, 'Player')$$,
    '23514',
    NULL,
    'should not allow weight greater than 50.0'
);

-- 4. RLS tests
-- Test anon role
SET local role anon;
SELECT lives_ok(
    $$SELECT count(*) FROM public.ranking_entries$$,
    'anon can select ranking entries'
);
SELECT lives_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 10.0, 'AnonPlayer')$$,
    'anon can insert ranking entries'
);

-- Test authenticated role
SET local role authenticated;
SELECT lives_ok(
    $$SELECT count(*) FROM public.ranking_entries$$,
    'authenticated can select ranking entries'
);
SELECT lives_ok(
    $$INSERT INTO public.ranking_entries (score, total_weight, player_name) VALUES (100, 10.0, 'AuthPlayer')$$,
    'authenticated can insert ranking entries'
);

SELECT * FROM finish();
ROLLBACK;
