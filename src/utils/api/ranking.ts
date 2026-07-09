import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type RankingEntry = {
  id: string;
  player_name: string | null;
  score: number;
  total_weight: number;
  created_at: string;
};

export type RankingResult = {
  current: RankingEntry;
  entries: RankingEntry[];
};

const supabase = createClient(supabaseUrl, supabasePublishableKey);

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function submitAndLoadRanking(score: number, totalWeight: number): Promise<RankingResult> {
  const { data: current, error: insertError } = await supabase
    .from('ranking_entries')
    .insert({
      player_name: null,
      score,
      total_weight: totalWeight,
    })
    .select('id,player_name,score,total_weight,created_at')
    .single();

  throwIfError(insertError);

  if (!current) {
    throw new Error('Ranking entry was not returned.');
  }

  const entriesResult = await supabase
    .from('ranking_entries')
    .select('id,player_name,score,total_weight,created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  throwIfError(entriesResult.error);

  return {
    current,
    entries: entriesResult.data ?? [],
  };
}
