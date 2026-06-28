-- Tink Open Banking credentials (server-side only).
--
-- Speichert den langlebigen refresh_token pro Nutzer, damit das Konto nicht
-- bei jedem App-Start neu verbunden werden muss. Der Token ist zusätzlich
-- auf Anwendungsebene verschlüsselt (AES-GCM in der Edge Function); der
-- Schlüssel liegt ausschließlich als Edge-Function-Secret, nie in der DB.
--
-- Geschrieben/gelesen wird ausschließlich über die Edge Function mit dem
-- Service-Role-Key (umgeht RLS). Die RLS-Policy unten ist Defense-in-Depth:
-- selbst bei direktem Client-Zugriff sieht ein Nutzer nur die eigene Zeile,
-- und der Token-Wert ist ohnehin Ciphertext.

create table if not exists public.tink_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_enc text not null,
  scope text,
  updated_at timestamptz not null default now()
);

alter table public.tink_credentials enable row level security;

create policy "own tink credentials"
  on public.tink_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
