# Supabase setup

This app now tracks a single global "Age II converts" counter in Supabase.

## 1. Create a Supabase project

1. Sign in to [Supabase](https://supabase.com/).
2. Create a new project.
3. Wait for the database to finish provisioning.

## 2. Add the public client config

This frontend only uses the **public** project URL and **anon** key. Do not expose the service role key in the browser.

1. In Supabase, open **Project Settings → API**.
2. Copy the **Project URL** and **anon public** key.
3. Open `/home/runner/work/gameRecommendation/gameRecommendation/supabase-config.js`.
4. Replace the empty values:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY"
};
```

If you deploy this site with a static host, make sure only the public URL and anon key are injected into the client build or served config file.

## 3. Run the SQL setup

1. In Supabase, open the **SQL Editor**.
2. Copy the contents of `/home/runner/work/gameRecommendation/gameRecommendation/supabase/schema.sql`.
3. Run the script.

That script creates:

- `public.convert_counter` as a single-row table
- the seed row with `id = 1`
- row-level security
- an anon/authenticated read policy
- `public.increment_convert_count()` for atomic increments

## 4. Security notes

- `anon` and `authenticated` can only `select` from `public.convert_counter`.
- Direct table updates are not granted to public clients.
- `public.increment_convert_count()` is `security definer` and uses a locked `search_path` so the browser can increment through RPC without broad table write access.
- The browser must only use the anon public key. Never put the service role key in `supabase-config.js`.

## 5. Manual test plan

1. Load the page after adding the Supabase config.
2. Select at least three favorite games and generate a recommendation.
3. Confirm the recommendation still appears even if Supabase is unreachable.
4. Confirm the result includes `Total Age II converts so far: X` when Supabase responds.
5. Generate another recommendation and confirm the displayed count increases by 1.
