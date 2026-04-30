
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.soil_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soil_type text NOT NULL UNIQUE,
  description text,
  ph_range text,
  texture text,
  fertility_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  agroecological_zone text,
  rainfall_min_mm integer,
  rainfall_max_mm integer,
  dominant_soil_type text,
  soil_fertility_level text CHECK (soil_fertility_level IN ('low','medium','high')),
  irrigation_potential text CHECK (irrigation_potential IN ('low','medium','high')),
  main_constraints text[] DEFAULT '{}',
  centroid_lat numeric,
  centroid_lng numeric,
  geojson jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crop_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  water_need_mm_min integer,
  water_need_mm_max integer,
  preferred_soil text[] DEFAULT '{}',
  cycle_days integer,
  risk_factors text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crop_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crop_profiles(id) ON DELETE CASCADE,
  suitability text NOT NULL CHECK (suitability IN ('high','medium','low')),
  recommendation_text text,
  constraints text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_id, crop_id)
);

CREATE TABLE public.yield_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crop_profiles(id) ON DELETE CASCADE,
  yield_min_t_ha numeric,
  yield_max_t_ha numeric,
  confidence text CHECK (confidence IN ('low','medium','high')),
  assumptions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_id, crop_id)
);

CREATE TABLE public.saved_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crop_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, region_id, crop_id)
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries readable" ON public.countries FOR SELECT USING (true);
CREATE POLICY "regions readable" ON public.regions FOR SELECT USING (true);
CREATE POLICY "soil_profiles readable" ON public.soil_profiles FOR SELECT USING (true);
CREATE POLICY "crop_profiles readable" ON public.crop_profiles FOR SELECT USING (true);
CREATE POLICY "crop_recommendations readable" ON public.crop_recommendations FOR SELECT USING (true);
CREATE POLICY "yield_estimates readable" ON public.yield_estimates FOR SELECT USING (true);

CREATE POLICY "own saved view" ON public.saved_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.saved_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.saved_recommendations FOR DELETE USING (auth.uid() = user_id);

INSERT INTO public.countries (code,name_fr,name_en) VALUES
  ('CI','Côte d''Ivoire','Ivory Coast'),
  ('SN','Sénégal','Senegal'),
  ('NG','Nigeria','Nigeria');

INSERT INTO public.soil_profiles (soil_type, description, ph_range, texture, fertility_notes) VALUES
  ('Ferralsol','Sol tropical lessivé, pauvre en bases','4.5-5.5','Argilo-sableux','Faible fertilité naturelle, répond bien à la fertilisation'),
  ('Vertisol','Sol argileux gonflant','6.5-8.0','Argileux lourd','Bonne fertilité chimique, drainage difficile'),
  ('Lixisol','Sol tropical à argile lessivée','5.5-6.5','Sablo-argileux','Fertilité moyenne, sensible à l''érosion'),
  ('Arenosol','Sol sableux','5.0-6.5','Sableux','Faible rétention en eau et nutriments'),
  ('Fluvisol','Sol alluvial de vallée','6.0-7.5','Limoneux','Très fertile, bonne pour cultures irriguées');

INSERT INTO public.crop_profiles (crop_name,name_fr,water_need_mm_min,water_need_mm_max,preferred_soil,cycle_days,risk_factors) VALUES
  ('maize','Maïs',500,800,ARRAY['Lixisol','Fluvisol'],120,ARRAY['Sécheresse','Chenille légionnaire']),
  ('rice','Riz',1000,1500,ARRAY['Fluvisol','Vertisol'],130,ARRAY['Salinité','Maladies fongiques']),
  ('cassava','Manioc',800,1200,ARRAY['Ferralsol','Lixisol'],300,ARRAY['Mosaïque africaine','Cochenille']),
  ('yam','Igname',1000,1500,ARRAY['Ferralsol','Lixisol'],280,ARRAY['Anthracnose','Nématodes']),
  ('soy','Soja',450,700,ARRAY['Lixisol','Fluvisol'],110,ARRAY['Sécheresse','Pucerons']),
  ('cotton','Coton',700,1300,ARRAY['Vertisol','Lixisol'],180,ARRAY['Ravageurs','Marché volatil']),
  ('tomato','Tomate',400,600,ARRAY['Fluvisol','Lixisol'],90,ARRAY['Mildiou','Stress hydrique']),
  ('onion','Oignon',350,550,ARRAY['Fluvisol','Arenosol'],120,ARRAY['Maladies foliaires','Stockage']),
  ('cashew','Anacarde',800,1600,ARRAY['Ferralsol','Arenosol'],1095,ARRAY['Helopeltis','Prix mondial']),
  ('pineapple','Ananas',1000,1500,ARRAY['Ferralsol','Lixisol'],540,ARRAY['Pourriture du cœur','Logistique export']);

WITH ci AS (SELECT id FROM public.countries WHERE code='CI'),
     sn AS (SELECT id FROM public.countries WHERE code='SN'),
     ng AS (SELECT id FROM public.countries WHERE code='NG')
INSERT INTO public.regions (country_id,name,agroecological_zone,rainfall_min_mm,rainfall_max_mm,dominant_soil_type,soil_fertility_level,irrigation_potential,main_constraints,centroid_lat,centroid_lng) VALUES
  ((SELECT id FROM ci),'Bélier','Zone forestière humide',1100,1500,'Ferralsol','medium','medium',ARRAY['Érosion','Vieillissement plantations'],6.85,-5.27),
  ((SELECT id FROM ci),'Poro','Savane soudanienne',900,1200,'Lixisol','medium','low',ARRAY['Variabilité pluviométrique','Accès intrants'],9.45,-5.62),
  ((SELECT id FROM sn),'Casamance','Zone subguinéenne',1100,1600,'Ferralsol','medium','medium',ARRAY['Salinisation','Conflit foncier'],12.55,-15.50),
  ((SELECT id FROM sn),'Vallée du fleuve Sénégal','Zone sahélienne irriguée',200,400,'Fluvisol','high','high',ARRAY['Salinité','Coût pompage'],16.50,-15.00),
  ((SELECT id FROM ng),'Kaduna','Savane guinéenne',1000,1400,'Lixisol','medium','medium',ARRAY['Insécurité rurale','Dégradation sols'],10.52,7.44),
  ((SELECT id FROM ng),'Cross River','Forêt humide tropicale',1800,2500,'Ferralsol','medium','high',ARRAY['Excès d''humidité','Maladies fongiques'],5.87,8.60);

WITH r AS (SELECT id FROM public.regions WHERE name='Bélier')
INSERT INTO public.crop_recommendations (region_id,crop_id,suitability,recommendation_text,constraints)
SELECT (SELECT id FROM r), c.id, v.suit, v.txt, v.cons FROM (VALUES
  ('cassava','high','Excellent pour le manioc, planter en début de saison des pluies', ARRAY['Mosaïque virale']),
  ('cashew','high','Sols ferralsols adaptés, marché export structuré', ARRAY['Prix volatil']),
  ('maize','medium','Possible avec variétés améliorées et fertilisation', ARRAY['Sécheresse de mi-cycle']),
  ('pineapple','high','Bonnes conditions pour ananas Cayenne lisse', ARRAY['Logistique froide'])
) AS v(crop,suit,txt,cons) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Bélier')
INSERT INTO public.yield_estimates (region_id,crop_id,yield_min_t_ha,yield_max_t_ha,confidence,assumptions)
SELECT (SELECT id FROM r), c.id, v.mn, v.mx, v.cf, v.asu FROM (VALUES
  ('cassava',12,22,'medium',ARRAY['Variétés améliorées','Fertilisation NPK']),
  ('cashew',0.6,1.2,'medium',ARRAY['Plantations >5 ans','Taille régulière']),
  ('maize',2.0,3.5,'medium',ARRAY['Semences certifiées','100kg NPK/ha']),
  ('pineapple',40,60,'medium',ARRAY['Densité 60k pieds/ha','Irrigation d''appoint'])
) AS v(crop,mn,mx,cf,asu) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Poro')
INSERT INTO public.crop_recommendations (region_id,crop_id,suitability,recommendation_text,constraints)
SELECT (SELECT id FROM r), c.id, v.suit, v.txt, v.cons FROM (VALUES
  ('cotton','high','Zone cotonnière historique, filière organisée', ARRAY['Pression ravageurs']),
  ('maize','high','Bon potentiel en rotation avec coton', ARRAY['Pluviométrie variable']),
  ('soy','medium','Émergent, intérêt pour rotation et marché local', ARRAY['Manque semences certifiées'])
) AS v(crop,suit,txt,cons) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Poro')
INSERT INTO public.yield_estimates (region_id,crop_id,yield_min_t_ha,yield_max_t_ha,confidence,assumptions)
SELECT (SELECT id FROM r), c.id, v.mn, v.mx, v.cf, v.asu FROM (VALUES
  ('cotton',1.0,1.8,'high',ARRAY['Encadrement filière','Intrants subventionnés']),
  ('maize',1.8,3.2,'medium',ARRAY['Rotation coton-maïs','Fertilisation modérée']),
  ('soy',1.0,1.8,'low',ARRAY['Inoculant Rhizobium','Variétés tropicales'])
) AS v(crop,mn,mx,cf,asu) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Casamance')
INSERT INTO public.crop_recommendations (region_id,crop_id,suitability,recommendation_text,constraints)
SELECT (SELECT id FROM r), c.id, v.suit, v.txt, v.cons FROM (VALUES
  ('rice','high','Riziculture pluviale et bas-fonds bien adaptée', ARRAY['Salinisation des bas-fonds']),
  ('cassava','high','Sécurité alimentaire et marché urbain de Dakar', ARRAY['Transport vers marchés']),
  ('pineapple','medium','Possible en zones bien drainées', ARRAY['Acidité élevée'])
) AS v(crop,suit,txt,cons) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Casamance')
INSERT INTO public.yield_estimates (region_id,crop_id,yield_min_t_ha,yield_max_t_ha,confidence,assumptions)
SELECT (SELECT id FROM r), c.id, v.mn, v.mx, v.cf, v.asu FROM (VALUES
  ('rice',2.0,4.0,'medium',ARRAY['Variétés NERICA','Aménagement bas-fonds']),
  ('cassava',10,18,'medium',ARRAY['Boutures saines','Désherbage à temps']),
  ('pineapple',25,40,'low',ARRAY['Drainage adéquat','Amendement calcique'])
) AS v(crop,mn,mx,cf,asu) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Vallée du fleuve Sénégal')
INSERT INTO public.crop_recommendations (region_id,crop_id,suitability,recommendation_text,constraints)
SELECT (SELECT id FROM r), c.id, v.suit, v.txt, v.cons FROM (VALUES
  ('rice','high','Riziculture irriguée double cycle possible', ARRAY['Coût pompage','Salinité']),
  ('onion','high','Bassin oignon majeur pour marché national', ARRAY['Stockage post-récolte']),
  ('tomato','high','Production de contre-saison à fort rendement', ARRAY['Chaleur estivale','Mildiou'])
) AS v(crop,suit,txt,cons) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Vallée du fleuve Sénégal')
INSERT INTO public.yield_estimates (region_id,crop_id,yield_min_t_ha,yield_max_t_ha,confidence,assumptions)
SELECT (SELECT id FROM r), c.id, v.mn, v.mx, v.cf, v.asu FROM (VALUES
  ('rice',5.0,8.0,'high',ARRAY['Irrigation maîtrisée','Variétés Sahel']),
  ('onion',25,40,'high',ARRAY['Variétés Violet de Galmi','Fertilisation équilibrée']),
  ('tomato',30,55,'medium',ARRAY['Cycle frais nov-mars','Tuteurage'])
) AS v(crop,mn,mx,cf,asu) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Kaduna')
INSERT INTO public.crop_recommendations (region_id,crop_id,suitability,recommendation_text,constraints)
SELECT (SELECT id FROM r), c.id, v.suit, v.txt, v.cons FROM (VALUES
  ('maize','high','Ceinture maïsicole nigériane', ARRAY['Insécurité rurale']),
  ('soy','high','Marché transformation huilière en croissance', ARRAY['Chaîne logistique']),
  ('yam','medium','Possible dans zones à pluviométrie suffisante', ARRAY['Stress hydrique en fin de cycle'])
) AS v(crop,suit,txt,cons) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Kaduna')
INSERT INTO public.yield_estimates (region_id,crop_id,yield_min_t_ha,yield_max_t_ha,confidence,assumptions)
SELECT (SELECT id FROM r), c.id, v.mn, v.mx, v.cf, v.asu FROM (VALUES
  ('maize',2.5,4.5,'high',ARRAY['Hybrides','Engrais NPK + urée']),
  ('soy',1.2,2.2,'medium',ARRAY['Inoculation','Date semis fin juin']),
  ('yam',8,14,'medium',ARRAY['Buttes hautes','Tuteurage'])
) AS v(crop,mn,mx,cf,asu) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Cross River')
INSERT INTO public.crop_recommendations (region_id,crop_id,suitability,recommendation_text,constraints)
SELECT (SELECT id FROM r), c.id, v.suit, v.txt, v.cons FROM (VALUES
  ('cassava','high','Région phare pour le manioc industriel', ARRAY['Maladies virales']),
  ('yam','high','Zone traditionnelle de production', ARRAY['Coûts de plantation']),
  ('pineapple','medium','Conditions humides favorables', ARRAY['Excès d''eau ponctuel'])
) AS v(crop,suit,txt,cons) JOIN public.crop_profiles c ON c.crop_name=v.crop;

WITH r AS (SELECT id FROM public.regions WHERE name='Cross River')
INSERT INTO public.yield_estimates (region_id,crop_id,yield_min_t_ha,yield_max_t_ha,confidence,assumptions)
SELECT (SELECT id FROM r), c.id, v.mn, v.mx, v.cf, v.asu FROM (VALUES
  ('cassava',15,25,'high',ARRAY['Variétés TMS','Désherbage chimique']),
  ('yam',10,16,'medium',ARRAY['Semenceaux sains','Rotation']),
  ('pineapple',30,50,'medium',ARRAY['Drainage','Densité optimale'])
) AS v(crop,mn,mx,cf,asu) JOIN public.crop_profiles c ON c.crop_name=v.crop;
