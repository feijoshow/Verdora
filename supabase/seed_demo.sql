-- Verdora demo seed — Namibia farmer + admin sample data
-- Run AFTER creating auth users (see supabase/DEMO_SETUP.md).
-- Safe to re-run: removes rows with demo_ id prefix for the demo farmer.

do $$
declare
  farmer_id uuid;
  admin_id uuid;
  farmer_email constant text := 'demo.farmer@verdora.test';
  admin_email constant text := 'demo.admin@verdora.test';
begin
  select id into farmer_id from public.users where email = farmer_email;
  select id into admin_id from public.users where email = admin_email;

  if farmer_id is null then
    raise exception 'Demo farmer not found. Register % in the app first, then re-run this script.', farmer_email;
  end if;

  -- ─── Farmer profile (Oshakati, Namibia) ───
  update public.users
  set
    name = 'Maria Shikongo',
    role = 'farmer',
    location_legacy = 'Oshakati, Oshana, Namibia',
    region_id = 'oshana',
    region_name = 'Oshana',
    town_id = 'oshakati',
    town_name = 'Oshakati',
    constituency = 'Oshakati East',
    is_custom_town = false,
    latitude = -17.783,
    longitude = 15.683,
    farm_size = '3 hectares',
    farmer_type = 'small-scale',
    soil_type = 'Sandy loam',
    farming_methods = '["Irrigation", "Crop rotation"]'::jsonb,
    crop_preferences = '["Mahango", "Tomato", "Cabbage"]'::jsonb,
    data_consent = true,
    data_consent_at = coalesce(data_consent_at, now()),
    updated_at = now()
  where id = farmer_id;

  if admin_id is not null then
    update public.users
    set role = 'admin', name = coalesce(nullif(name, ''), 'Demo Admin'), updated_at = now()
    where id = admin_id;
  else
    raise notice 'Admin account % not found — skip admin promotion until registered.', admin_email;
  end if;

  -- Clear previous demo rows for this farmer
  delete from public.chat_logs where id like 'demo_%' and user_id = farmer_id;
  delete from public.weather_logs where id like 'demo_%' and user_id = farmer_id;
  delete from public.scans where id like 'demo_%' and user_id = farmer_id;
  delete from public.crops where id like 'demo_%' and user_id = farmer_id;
  delete from public.fields where id like 'demo_%' and user_id = farmer_id;

  -- ─── Fields ───
  insert into public.fields (id, user_id, name, latitude, longitude, sort_order)
  values
    ('demo_field_main', farmer_id, 'Main plot', -17.783, 15.683, 0),
    ('demo_field_garden', farmer_id, 'Home garden', -17.791, 15.692, 1);

  -- ─── Calendar crops ───
  insert into public.crops (
    id, user_id, crop_name, plant_date, harvest_date, location,
    field_name, field_id, soil_type, farming_methods, notes
  )
  values
    (
      'demo_crop_mahango', farmer_id, 'Mahango', '2026-03-01', '2026-07-15',
      'Oshakati, Oshana, Namibia', 'Main plot', 'demo_field_main', 'Sandy loam',
      '["Irrigation"]'::jsonb, 'Rain-fed mahangu — demo seed'
    ),
    (
      'demo_crop_tomato', farmer_id, 'Tomato', '2026-06-01', '2026-09-15',
      'Oshakati, Oshana, Namibia', 'Home garden', 'demo_field_garden', 'Sandy loam',
      '["Irrigation", "Crop rotation"]'::jsonb, 'Dry-season irrigated tomatoes'
    ),
    (
      'demo_crop_cabbage', farmer_id, 'Cabbage', '2026-05-10', '2026-08-20',
      'Oshakati, Oshana, Namibia', 'Main plot', 'demo_field_main', 'Sandy loam',
      '["Irrigation"]'::jsonb, 'Winter cabbage block'
    );

  -- ─── Scans (includes disease cluster coords for admin intelligence) ───
  insert into public.scans (
    id, user_id, crop_type, disease, confidence, treatment, location,
    field_id, field_name, latitude, longitude, scanned_at
  )
  values
    (
      'demo_scan_tomato_blight_1', farmer_id, 'Tomato', 'Early blight', 0.82,
      'Remove affected leaves; improve airflow; neem spray from local agro-dealer.',
      'Oshakati, Oshana, Namibia', 'demo_field_garden', 'Home garden', -17.791, 15.692,
      now() - interval '3 days'
    ),
    (
      'demo_scan_tomato_blight_2', farmer_id, 'Tomato', 'Early blight', 0.78,
      'Rotate tomatoes; avoid overhead watering in dry season evenings.',
      'Oshakati, Oshana, Namibia', 'demo_field_garden', 'Home garden', -17.790, 15.690,
      now() - interval '8 days'
    ),
    (
      'demo_scan_tomato_blight_3', farmer_id, 'Tomato', 'Early blight', 0.71,
      'Consult MAFWLR extension if spread continues after pruning.',
      'Oshakati, Oshana, Namibia', 'demo_field_main', 'Main plot', -17.784, 15.685,
      now() - interval '12 days'
    ),
    (
      'demo_scan_mahango_ok', farmer_id, 'Mahango', null, 0.91,
      'Crop looks healthy — monitor for leaf spot after heavy dew.',
      'Oshakati, Oshana, Namibia', 'demo_field_main', 'Main plot', -17.783, 15.683,
      now() - interval '1 day'
    );

  -- ─── Weather logs ───
  insert into public.weather_logs (
    id, user_id, location, temperature, humidity, condition,
    recommendation_shown, logged_at
  )
  values
    (
      'demo_weather_1', farmer_id, 'Oshakati, Oshana, Namibia', 24, 28, 'clear sky',
      'Dry season: irrigate early morning or evening; mulch to retain soil moisture.',
      now() - interval '2 hours'
    ),
    (
      'demo_weather_2', farmer_id, 'Oshakati, Oshana, Namibia', 22, 35, 'few clouds',
      'Cool mornings — protect sensitive seedlings from frost; water mid-morning.',
      now() - interval '1 day'
    );

  -- ─── Chat logs ───
  insert into public.chat_logs (id, user_id, location, question, ai_response, asked_at)
  values
    (
      'demo_chat_1', farmer_id, 'Oshakati, Oshana, Namibia',
      'Dry-season tips for Mahango in Oshakati',
      'During Namibia''s dry season, irrigate mahangu early morning, mulch around stems, and watch for leaf spot after heavy dew.',
      now() - interval '5 hours'
    ),
    (
      'demo_chat_2', farmer_id, 'Oshakati, Oshana, Namibia',
      'How do I treat Early blight on my Tomato?',
      'Prune affected leaves, improve airflow, rotate crops, and use neem-based sprays from local agro-dealers.',
      now() - interval '2 days'
    );

  raise notice 'Demo seed complete for farmer % (admin %).', farmer_email, coalesce(admin_email, 'n/a');
end $$;
