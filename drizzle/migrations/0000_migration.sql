-- ===== ENUMS =====
create type public.app_role as enum ('admin', 'user');
create type public.listing_type as enum ('sale', 'donation');
create type public.item_condition as enum ('new', 'like_new', 'good', 'fair');
create type public.listing_status as enum ('available', 'reserved', 'sold');
create type public.report_status as enum ('pending', 'reviewed', 'dismissed');

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null check (phone ~ '^[0-9+\- ]{7,20}$'),
  location text check (location is null or char_length(location) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Public may only see non-sensitive columns (phone stays private)
grant select (id, full_name, location, created_at) on public.profiles to anon, authenticated;
grant update (full_name, phone, location, updated_at) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are publicly readable (limited columns)" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ===== USER ROLES =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ===== CATEGORIES =====
create table public.categories (
  id serial primary key,
  name text not null unique check (char_length(name) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant usage on sequence public.categories_id_seq to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Categories public read" on public.categories for select using (true);
create policy "Admins insert categories" on public.categories for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update categories" on public.categories for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ===== LISTINGS =====
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,  -- null only for seeded sample listings
  category_id int not null references public.categories(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 2000),
  listing_type public.listing_type not null,
  price numeric(10,2),
  item_condition public.item_condition not null,
  status public.listing_status not null default 'available',
  location text not null check (char_length(location) between 2 and 80),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_matches_type check (
    (listing_type = 'donation' and price is null) or
    (listing_type = 'sale' and price is not null and price > 0 and price <= 10000000)
  )
);
create index listings_owner_idx on public.listings(owner_id);
create index listings_category_idx on public.listings(category_id);
create index listings_type_status_idx on public.listings(listing_type, status);
create index listings_created_idx on public.listings(created_at desc);
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;
alter table public.listings enable row level security;
create policy "Listings public read" on public.listings for select using (true);
create policy "Users create own listings" on public.listings for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners or admins update listings" on public.listings for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Owners or admins delete listings" on public.listings for delete to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Prevent changing ownership on update
create or replace function public.listings_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Listing owner cannot be changed';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger listings_guard_trg before update on public.listings for each row execute function public.listings_guard();

-- ===== INQUIRIES =====
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 1000),
  created_at timestamptz not null default now(),
  constraint no_self_inquiry check (sender_id <> recipient_id)
);
create index inquiries_recipient_idx on public.inquiries(recipient_id, created_at desc);
create index inquiries_sender_idx on public.inquiries(sender_id, created_at desc);
create index inquiries_listing_idx on public.inquiries(listing_id);
grant select, insert, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;
create policy "Participants read inquiries" on public.inquiries for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "Users send inquiries as themselves" on public.inquiries for insert to authenticated
  with check (sender_id = auth.uid());

-- Recipient is always derived from the listing; listing must be available
create or replace function public.inquiries_prepare()
returns trigger language plpgsql security definer set search_path = public as $$
declare l record;
begin
  select owner_id, status into l from public.listings where id = new.listing_id;
  if not found then raise exception 'Listing not found'; end if;
  if l.owner_id is null then raise exception 'This is a sample listing and cannot be contacted'; end if;
  if l.status <> 'available' then raise exception 'This listing is no longer available'; end if;
  if l.owner_id = new.sender_id then raise exception 'You cannot send an inquiry about your own listing'; end if;
  new.recipient_id := l.owner_id;
  return new;
end $$;
create trigger inquiries_prepare_trg before insert on public.inquiries for each row execute function public.inquiries_prepare();

-- ===== REPORTS =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index reports_status_idx on public.reports(status);
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "Reporter or admin reads reports" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users file reports as themselves" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'pending');
create policy "Admins update reports" on public.reports for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ===== SIGNUP TRIGGER: profile + default 'user' role =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, location)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1) || ' user'),
    coalesce(nullif(trim(new.raw_user_meta_data->>'phone'), ''), '0000000'),
    nullif(trim(new.raw_user_meta_data->>'location'), '')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');  -- never admin
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===== HELPER FUNCTIONS =====
create or replace function public.get_my_profile()
returns table (id uuid, full_name text, phone text, location text, email text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.phone, p.location, u.email::text, p.created_at
  from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid()
$$;

create or replace function public.admin_list_users()
returns table (id uuid, full_name text, email text, phone text, location text, is_admin boolean, listing_count bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorized'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.phone, p.location,
           public.has_role(p.id, 'admin'),
           (select count(*) from public.listings l where l.owner_id = p.id),
           p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;

create or replace function public.admin_delete_user(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorized'; end if;
  if _user_id = auth.uid() then raise exception 'You cannot delete your own admin account'; end if;
  delete from auth.users where id = _user_id;  -- cascades to profile, roles, listings, inquiries
end $$;

create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorized'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'listings', (select count(*) from public.listings),
    'sale', (select count(*) from public.listings where listing_type = 'sale'),
    'donation', (select count(*) from public.listings where listing_type = 'donation'),
    'inquiries', (select count(*) from public.inquiries),
    'pending_reports', (select count(*) from public.reports where status = 'pending')
  );
end $$;

revoke execute on function public.admin_list_users() from anon;
revoke execute on function public.admin_delete_user(uuid) from anon;
revoke execute on function public.admin_stats() from anon;
revoke execute on function public.get_my_profile() from anon;

-- ===== SEED DATA =====
insert into public.categories (name, slug) values
 ('Furniture','furniture'),('Electronics','electronics'),('Books','books'),
 ('Clothing','clothing'),('Kitchen','kitchen'),('Sports & Outdoors','sports'),
 ('Kids & Baby','kids'),('Home Decor','decor');

insert into public.listings (owner_id, category_id, title, description, listing_type, price, item_condition, location, image_url, created_at) values
 (null,(select id from public.categories where slug='furniture'),'Solid oak armchair with linen cushion','Mid-century style oak armchair. Frame is sturdy with light wear on the arms. Cushion cover is removable and was washed last month.','sale',3500,'good','Dhanmondi, Dhaka','/images/seed/armchair.jpg', now() - interval '2 days'),
 (null,(select id from public.categories where slug='electronics'),'Mechanical keyboard, brown switches','Full-size mechanical keyboard, all keys working. Comes with the original USB cable. Upgraded to a smaller one, so letting this go.','sale',2800,'like_new','Mirpur, Dhaka','/images/seed/keyboard.jpg', now() - interval '1 day'),
 (null,(select id from public.categories where slug='books'),'Box of diploma CST textbooks','Around 12 books covering C programming, DBMS, networking and digital electronics. Some highlighting inside. Free to any student who needs them.','donation',null,'fair','Rajshahi','/images/seed/books.jpg', now() - interval '3 hours'),
 (null,(select id from public.categories where slug='kitchen'),'Ceramic dinner set for six','Hand-glazed plates, bowls and mugs for six people. One mug has a tiny chip on the base, otherwise perfect.','sale',1900,'good','Chattogram','/images/seed/dinnerware.jpg', now() - interval '5 days'),
 (null,(select id from public.categories where slug='sports'),'Kids bicycle, 16 inch','Blue 16 inch bicycle with training wheels. Our son outgrew it. Tyres hold air fine. Free to a family that will use it.','donation',null,'good','Sylhet','/images/seed/bicycle.jpg', now() - interval '6 hours'),
 (null,(select id from public.categories where slug='clothing'),'Wool winter coat, size M','Charcoal wool-blend coat, worn one winter. Dry cleaned and ready to wear.','sale',2200,'like_new','Uttara, Dhaka','/images/seed/coat.jpg', now() - interval '4 days'),
 (null,(select id from public.categories where slug='decor'),'Set of three terracotta planters','Unglazed terracotta pots in three sizes with drainage holes. Moving flats and can’t take them. Free pickup.','donation',null,'good','Khulna','/images/seed/planters.jpg', now() - interval '1 day'),
 (null,(select id from public.categories where slug='electronics'),'Desk lamp with adjustable arm','Warm-white LED desk lamp with a weighted base. Works perfectly; adapter included.','sale',850,'good','Gulshan, Dhaka','/images/seed/lamp.jpg', now() - interval '8 days');

-- ===== STORAGE POLICIES (bucket created separately) =====
create policy "Listing images public read" on storage.objects for select using (bucket_id = 'listing-images');
create policy "Users upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own images" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);