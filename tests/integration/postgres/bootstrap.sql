-- Disposable PostgreSQL only: minimal Supabase roles/schemas, not an Auth/Storage emulator.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
grant usage on schema public,auth to anon,authenticated,service_role;
