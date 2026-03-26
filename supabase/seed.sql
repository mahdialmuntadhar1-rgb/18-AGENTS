insert into governorates (id, name_en, name_ar, name_ku)
values
  ('baghdad', 'Baghdad', 'بغداد', 'بەغدا'),
  ('basra', 'Basra', 'البصرة', 'بەسرە')
on conflict (id) do nothing;

insert into agents (id, display_name, governorate_id, city, category, government_rate, connector)
values
  ('Agent-01', 'Baghdad Restaurants', 'baghdad', 'Baghdad', 'restaurants', 'Rate Level 1', 'google_places'),
  ('Agent-02', 'Basra Cafes', 'basra', 'Basra', 'cafes', 'Rate Level 1', 'google_places')
on conflict (id) do nothing;
