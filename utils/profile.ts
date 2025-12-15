import { supabase } from '../supabaseClient';

export async function upsertProfileFromClient(user: any) {
  const { id, email, user_metadata } = user || {};
  if (!id) return;

  const full_name = user_metadata?.full_name ?? null;
  const age = user_metadata?.age ? Number(user_metadata.age) : null;

  // Use upsert so first-time registration creates the row if missing
  const { error } = await supabase
    .from('profiles')
    .upsert({ id, email, full_name, age }, { onConflict: 'id' });

  if (error) {
    console.error('Error updating profile:', error.message);
  }
}