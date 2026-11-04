-- BAWASLU AWARDS 2026 — jalankan sekali di Supabase SQL Editor.
-- Semua 48 orang adalah pemilih sekaligus kandidat.
create extension if not exists pgcrypto;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  normalized_name text generated always as (lower(regexp_replace(trim(full_name), '\s+', ' ', 'g'))) stored,
  is_active boolean not null default true,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint people_full_name_unique unique (normalized_name)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null unique,
  is_active boolean not null default true
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.people(id),
  category_id uuid not null references public.categories(id),
  candidate_id uuid not null references public.people(id),
  created_at timestamptz not null default now(),
  constraint one_vote_per_voter_per_category unique (voter_id, category_id)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id boolean primary key default true check (id = true),
  voting_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.app_settings(id, voting_open) values (true, true) on conflict (id) do nothing;

create table if not exists public.winners (
  category_id uuid primary key references public.categories(id),
  candidate_id uuid not null references public.people(id),
  is_published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Seed kategori
insert into public.categories(name, sort_order) values
 ('Si Tukang Jajan',1),
 ('Si Paling Kreatif',2),
 ('Si Paling Modis',3),
 ('Si Paling Ngopi',4),
 ('Morning Person',5),
 ('Si Paling Sabar',6),
 ('Si Paling Slow',7),
 ('Si Paling Minta Tolong',8),
 ('Best Employee',9)
on conflict (name) do nothing;

-- Seed 48 orang (nama saja, tanpa jabatan)
insert into public.people(full_name) values
 ('Roy M. Siagian'),
 ('Sri Mariati Hutabarat'),
 ('Hanif Vidi Yuwono'),
 ('Rosalina A.M. Sihombing'),
 ('Adie Iwa Chatulistiwa'),
 ('Muhammad Habibi'),
 ('Alifuddin Fahmi Abdillah'),
 ('Allya Hanifa'),
 ('Alvi Nur Azizah'),
 ('Andi Suhandi'),
 ('Angelica Nadya Rizki'),
 ('Anggun Anggara Kusuma'),
 ('Annissa Fajar Hermawati'),
 ('Ari Kusuma'),
 ('Asep Saepurohman'),
 ('Dana Pratiwi'),
 ('Dian Firja Ameliani'),
 ('Gerhana Rizki Candra Wahyuni'),
 ('Hanifah Rasyidah Riani'),
 ('Hans Karunia Hamonangan'),
 ('Husnul Khatimah AR'),
 ('Iesa Rochim'),
 ('Imam Hidayat'),
 ('Irvanus Destavino'),
 ('Latoiful Manan'),
 ('Moh. Mustofa Hadi'),
 ('Monica Stifani Panjaitan'),
 ('Muh. Reza Syamsuri'),
 ('Muhammad Bimo Anugrah Idris'),
 ('Muhammad Subhan Nurul Umam'),
 ('Ni Wayan Widnyani'),
 ('Nistya Maharani'),
 ('Nyayu Deviana Nur Asyifa'),
 ('Pramesta Widyapermana'),
 ('Putri Setya Utami'),
 ('Raden Sonny Abdurrahman'),
 ('Rizky Dwi Kusuma'),
 ('Rokhyudi'),
 ('Rury Uswatun Hasanah'),
 ('Saepudin'),
 ('Septy Haryanti'),
 ('Sri Nilawati'),
 ('Umi Khumairoh'),
 ('Uswatun Khasanah'),
 ('Yosep Saepulloh'),
 ('Zul Khoyriah'),
 ('Satria Abdul Fatah'),
 ('Bre Ikra Jendra')
on conflict (normalized_name) do nothing;

-- Helper untuk kebijakan admin. Hak akses ditentukan dari sesi Supabase Auth.
create or replace function public.is_awards_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()); $$;

-- Submit satu paket suara (9 kategori) dalam satu transaksi.
-- Mengunci baris pemilih supaya dua request bersamaan tidak bisa menggandakan suara.
create or replace function public.submit_ballot(p_person_id uuid, p_selections jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_person public.people%rowtype;
  v_category_count integer;
  v_selection_count integer;
  v_distinct_category_count integer;
  v_invalid_count integer;
begin
  select * into v_person from public.people where id = p_person_id and is_active = true for update;
  if not found then raise exception 'Nama pemilih tidak ditemukan atau tidak aktif.'; end if;
  if not (select voting_open from public.app_settings where id = true) then raise exception 'Voting sedang ditutup oleh admin.'; end if;
  if v_person.submitted_at is not null then raise exception 'Nama ini sudah mengirimkan suara.'; end if;
  if jsonb_typeof(p_selections) <> 'array' then raise exception 'Format pilihan tidak valid.'; end if;

  select count(*) into v_category_count from public.categories where is_active = true;
  select count(*) into v_selection_count from jsonb_array_elements(p_selections);
  select count(distinct (x->>'category_id')) into v_distinct_category_count from jsonb_array_elements(p_selections) x;
  if v_selection_count <> v_category_count or v_distinct_category_count <> v_category_count then
    raise exception 'Pilih tepat satu kandidat pada setiap kategori.';
  end if;

  select count(*) into v_invalid_count
  from jsonb_array_elements(p_selections) x
  left join public.categories c on c.id = (x->>'category_id')::uuid and c.is_active = true
  left join public.people p on p.id = (x->>'candidate_id')::uuid and p.is_active = true
  where c.id is null or p.id is null;
  if v_invalid_count > 0 then raise exception 'Terdapat kategori atau kandidat yang tidak valid.'; end if;

  insert into public.votes(voter_id, category_id, candidate_id)
  select p_person_id, (x->>'category_id')::uuid, (x->>'candidate_id')::uuid
  from jsonb_array_elements(p_selections) x;

  update public.people set submitted_at = now() where id = p_person_id;
end;
$$;

alter table public.people enable row level security;
alter table public.categories enable row level security;
alter table public.votes enable row level security;
alter table public.admin_users enable row level security;
alter table public.winners enable row level security;
alter table public.app_settings enable row level security;

-- Pemilih boleh membaca daftar nama, kategori, dan status buka/tutup voting.
drop policy if exists "public read voting status" on public.app_settings;
create policy "public read voting status" on public.app_settings for select to anon, authenticated using (true);
drop policy if exists "admin update voting status" on public.app_settings;
create policy "admin update voting status" on public.app_settings for update to authenticated using (public.is_awards_admin()) with check (public.is_awards_admin());

-- Pemilih boleh membaca daftar nama dan kategori. Tidak ada akses publik ke tabel suara.
drop policy if exists "public can read active people" on public.people;
create policy "public can read active people" on public.people for select to anon, authenticated using (is_active = true);
drop policy if exists "public can read active categories" on public.categories;
create policy "public can read active categories" on public.categories for select to anon, authenticated using (is_active = true);

-- Admin boleh membaca seluruh data suara dan status pemilih.
drop policy if exists "admin read votes" on public.votes;
create policy "admin read votes" on public.votes for select to authenticated using (public.is_awards_admin());
drop policy if exists "admin read all people" on public.people;
create policy "admin read all people" on public.people for select to authenticated using (public.is_awards_admin());
drop policy if exists "admin update people" on public.people;
create policy "admin update people" on public.people for update to authenticated using (public.is_awards_admin()) with check (public.is_awards_admin());
drop policy if exists "admin manage categories" on public.categories;
create policy "admin manage categories" on public.categories for all to authenticated using (public.is_awards_admin()) with check (public.is_awards_admin());
drop policy if exists "admin manage winners" on public.winners;
create policy "admin manage winners" on public.winners for all to authenticated using (public.is_awards_admin()) with check (public.is_awards_admin());
drop policy if exists "public read published winners" on public.winners;
create policy "public read published winners" on public.winners for select to anon, authenticated using (is_published = true);
drop policy if exists "admin read own admin row" on public.admin_users;
create policy "admin read own admin row" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- Batasi operasi langsung pada votes; submit hanya melalui RPC di atas.
revoke all on public.votes from anon, authenticated;
grant select on public.votes to authenticated;
revoke insert, update, delete on public.people from anon, authenticated;
grant execute on function public.submit_ballot(uuid,jsonb) to anon, authenticated;
grant execute on function public.is_awards_admin() to authenticated;
grant select on public.people, public.categories, public.winners, public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant update, insert, delete on public.winners to authenticated;
grant update on public.people to authenticated;
grant all on public.categories to authenticated;
