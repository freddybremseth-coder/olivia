
export type Language = 'en' | 'no' | 'es' | 'it' | 'fr' | 'de' | 'sv' | 'ru';

const translations: Record<string, Record<Language, string>> = {
  // General
  active: { en: 'Active', no: 'Aktiv', es: 'Activo', it: 'Attivo', fr: 'Actif', de: 'Aktiv', sv: 'Aktiv', ru: 'Активный' },
  too_much_wind: { en: 'Too much wind', no: 'For mye vind', es: 'Demasiado viento', it: 'Troppo vento', fr: 'Trop de vent', de: 'Zu viel Wind', sv: 'För mycket vind', ru: 'Слишком сильный ветер' },
  revenue: { en: 'Revenue', no: 'Inntekter', es: 'Ingresos', it: 'Ricavi', fr: 'Revenus', de: 'Umsatz', sv: 'Intäkter', ru: 'Доход' },
  cost: { en: 'Cost', no: 'Kostnad', es: 'Costo', it: 'Costo', fr: 'Coût', de: 'Kosten', sv: 'Kostnad', ru: 'Стоимость' },
  north: { en: 'North', no: 'Nord', es: 'Norte', it: 'Nord', fr: 'Nord', de: 'Norden', sv: 'Norr', ru: 'Север' },
  south: { en: 'South', no: 'Sør', es: 'Sur', it: 'Sud', fr: 'Sud', de: 'Süden', sv: 'Söder', ru: 'Юг' },
  east: { en: 'East', no: 'Øst', es: 'Este', it: 'Est', fr: 'Est', de: 'Osten', sv: 'Öster', ru: 'Восток' },
  west: { en: 'West', no: 'Vest', es: 'Oeste', it: 'Ovest', fr: 'Ouest', de: 'Westen', sv: 'Väster', ru: 'Запад' },
  iot_sensors_menu: { en: 'IoT Sensors', no: 'IoT-sensorer', es: 'Sensores IoT', it: 'Sensori IoT', fr: 'Capteurs IoT', de: 'IoT-Sensoren', sv: 'IoT-sensorer', ru: 'Датчики IoT' },
  search_placeholder: { en: 'Search cadastre, address, coordinates...', no: 'Søk matrikkel, adresse, koordinater...', es: 'Buscar catastro, dirección, coordenadas...', it: 'Cerca catasto, indirizzo, coordinate...', fr: 'Chercher cadastre, adresse, coordonnées...', de: 'Kataster, Adresse, Koordinaten suchen...', sv: 'Sök fastighetsbeteckning, adress, koordinater...', ru: 'Поиск кадастра, адреса, координат...' },
  direct_lookup: { en: 'Direct Lookup (Spain)', no: 'Direkteoppslag (Spania)', es: 'Búsqueda Directa (España)', it: 'Ricerca Diretta (Spagna)', fr: 'Recherche Directe (Espagne)', de: 'Direktsuche (Spanien)', sv: 'Direktsökning (Spanien)', ru: 'Прямой поиск (Испания)' },
  verify_property: { en: 'VERIFY PROPERTY', no: 'VERIFISER EIENDOM', es: 'VERIFICAR PROPIEDAD', it: 'VERIFICA PROPRIETÀ', fr: 'VÉRIFIER LA PROPRIÉTÉ', de: 'GRUNDSTÜCK ÜBERPRÜFEN', sv: 'VERIFIERA EGENDOM', ru: 'ПРОВЕРИТЬ НЕДВИЖИМОСТЬ' },
  save_to_my_farm: { en: 'SAVE TO MY FARM', no: 'LAGRE I MIN GÅRD', es: 'GUARDAR EN MI FINCA', it: 'SALVA NELLA MIA AZIENDA', fr: 'ENREGISTRER DANS MA FERME', de: 'IN MEINEM BETRIEB SPEICHERN', sv: 'SPARA PÅ MIN GÅRD', ru: 'СОХРАНИТЬ НА МОЕЙ ФЕРМЕ' },
  my_parcels: { en: 'My Parcels', no: 'Mine Parseller', es: 'Mis Parcelas', it: 'I Miei Appezzamenti', fr: 'Mes Parcelles', de: 'Meine Parzellen', sv: 'Mina Skiften', ru: 'Мои участки' },
  verify_data: { en: 'VERIFY DATA', no: 'VERIFISER DATA', es: 'VERIFICAR DATOS', it: 'VERIFICA DATI', fr: 'VÉRIFIER LES DONNÉES', de: 'DATEN ÜBERPRÜFEN', sv: 'VERIFIERA DATA', ru: 'ПРОВЕРИТЬ ДАННЫЕ' },
  map_layers: { en: 'Map Layers', no: 'Kartlag', es: 'Capas del Mapa', it: 'Livelli Mappa', fr: 'Couches de la carte', de: 'Karteneeinstellungen', sv: 'Kartlager', ru: 'Слои карты' },
  satellite: { en: 'Satellite', no: 'Satellitt', es: 'Satélite', it: 'Satellite', fr: 'Satellite', de: 'Satellit', sv: 'Satellit', ru: 'Спутник' },
  terrain: { en: 'Terrain', no: 'Terreng', es: 'Terreno', it: 'Terreno', fr: 'Terrain', de: 'Gelände', sv: 'Terräng', ru: 'Местность' },
  cadastre: { en: 'Cadastre', no: 'Matrikkel', es: 'Catastro', it: 'Catasto', fr: 'Cadastre', de: 'Kataster', sv: 'Fastighetsregister', ru: 'Кадастр' },
  electricity_power_lines: { en: 'Electricity & Power Lines', no: 'Strøm & Høyspent', es: 'Electricidad y Líneas de Alta Tensión', it: 'Elettricità e Linee Elettriche', fr: 'Électricité et Lignes à Haute Tension', de: 'Strom & Hochspannungsleitungen', sv: 'El & Kraftledningar', ru: 'Электричество и линии электропередач' },
  water_irrigation: { en: 'Water & Irrigation', no: 'Vann & Irrigasjon', es: 'Agua y Riego', it: 'Acqua e Irrigazione', fr: 'Eau et Irrigation', de: 'Wasser & Bewässerung', sv: 'Vatten & Bevattning', ru: 'Вода и орошение' },
  verification_complete: { en: 'Verification complete', no: 'Verifisering ferdig', es: 'Verificación completa', it: 'Verifica completata', fr: 'Vérification terminée', de: 'Überprüfung abgeschlossen', sv: 'Verifiering klar', ru: 'Проверка завершена' },
  cadastral_reference: { en: 'Cadastral Reference', no: 'Matrikkelreferanse', es: 'Referencia Catastral', it: 'Riferimento Catastale', fr: 'Référence Cadastrale', de: 'Katasterreferenz', sv: 'Fastighetsbeteckning', ru: 'Кадастровый номер' },
  property_name: { en: 'Property Name', no: 'Eiendomsnavn', es: 'Nombre de la Propiedad', it: 'Nome Proprietà', fr: 'Nom de la propriété', de: 'Grundstücksname', sv: 'Fastighetsnamn', ru: 'Название недвижимости' },
  number_of_trees: { en: 'Number of Trees', no: 'Antall Trær', es: 'Número de Árboles', it: 'Numero di Alberi', fr: 'Nombre d\'arbres', de: 'Anzahl der Bäume', sv: 'Antal träd', ru: 'Количество деревьев' },
  variety: { en: 'Variety', no: 'Sort', es: 'Variedad', it: 'Varietà', fr: 'Variété', de: 'Sorte', sv: 'Sort', ru: 'Сорт' },
  area: { en: 'Area', no: 'Areal', es: 'Área', it: 'Area', fr: 'Superficie', de: 'Fläche', sv: 'Area', ru: 'Площадь' },
  land_use_type: { en: 'Land Use Type', no: 'Landbrukstype', es: 'Tipo de Uso del Suelo', it: 'Tipo di Uso del Suolo', fr: 'Type d\'utilisation du sol', de: 'Bodennutzungsart', sv: 'Markanvändningstyp', ru: 'Тип землепользования' },
  delete_parcel_confirm: { en: 'Permanently delete this parcel?', no: 'Slette denne parsellen permanent?', es: '¿Eliminar esta parcela permanentemente?', it: 'Eliminare definitivamente questa particella?', fr: 'Supprimer cette parcelle de façon permanente ?', de: 'Diese Parzelle dauerhaft löschen?', sv: 'Ta bort denna fastighet permanent?', ru: 'Безвозвратно удалить этот участок?' },
  meteorological_overview: { en: 'Meteorological Overview', no: 'Meteorologisk Oversikt', es: 'Resumen Meteorológico', it: 'Panoramica Meteorologica', fr: 'Aperçu Météorologique', de: 'Meteorologische Übersicht', sv: 'Meteorologisk Översikt', ru: 'Метеорологический обзор' },
  farm_management: { en: 'Farm Management', no: 'Gårdskontroll', es: 'Gestión de Finca', it: 'Gestione Azienda', fr: 'Gestion de l\'Exploitation', de: 'Betriebsführung', sv: 'Gårdsförvaltning', ru: 'Управление фермой' },
  forecast_7_days: { en: 'Forecast (7 days)', no: 'Prognose (7 dager)', es: 'Pronóstico (7 días)', it: 'Previsioni (7 giorni)', fr: 'Prévisions (7 jours)', de: 'Vorhersage (7 Tage)', sv: 'Prognos (7 dagar)', ru: 'Прогноз (7 дней)' },
  history_90_days: { en: 'Near History (90 days)', no: 'Nærhistorikk (90 dager)', es: 'Historial Reciente (90 días)', it: 'Storico Recente (90 giorni)', fr: 'Historique Récent (90 jours)', de: 'Neueste Historie (90 Tage)', sv: 'Närhistorik (90 dagar)', ru: 'Ближайшая история (90 дней)' },
  yearly_overview_climate: { en: 'Yearly Overview (Climate)', no: 'Årsoversikt (Klima)', es: 'Resumen Anual (Clima)', it: 'Panoramica Annuale (Clima)', fr: 'Aperçu Annuel (Climat)', de: 'Jahresübersicht (Klima)', sv: 'Årlig Översikt (Klimat)', ru: 'Годовой обзор (Климат)' },
  default_location: { en: 'Default (Biar, ES)', no: 'Standard (Biar, ES)', es: 'Predeterminado (Biar, ES)', it: 'Predefinito (Biar, ES)', fr: 'Défaut (Biar, ES)', de: 'Standard (Biar, ES)', sv: 'Standard (Biar, ES)', ru: 'По умолчанию (Биар, ES)' },
  my_position_gps: { en: 'My Position (GPS)', no: 'Min posisjon (GPS)', es: 'Mi Posición (GPS)', it: 'La Mia Posizione (GPS)', fr: 'Ma Position (GPS)', de: 'Meine Position (GPS)', sv: 'Min Position (GPS)', ru: 'Мое местоположение (GPS)' },
  update_weather: { en: 'Update Weather', no: 'Oppdater vær', es: 'Actualizar Clima', it: 'Aggiorna Meteo', fr: 'Mettre à Jour la Météo', de: 'Wetter Aktualisieren', sv: 'Uppdatera Väder', ru: 'Обновить погоду' },
  fetching_real_time_data: { en: 'Fetching real-time meteorological data...', no: 'Henter sanntids meteorologiske data...', es: 'Obteniendo datos meteorológicos en tiempo real...', it: 'Recupero dati meteorologici in tempo reale...', fr: 'Récupération des données météorologiques en temps réel...', de: 'Echtzeit-Wetterdaten werden abgerufen...', sv: 'Hämtar meteorologiska data i realtid...', ru: 'Получение метеорологических данных в реальном времени...' },
  wind_speed: { en: 'Wind Speed', no: 'Vindstyrke', es: 'Velocidad del Viento', it: 'Velocità del Vento', fr: 'Vitesse du Vent', de: 'Windgeschwindigkeit', sv: 'Vindhastighet', ru: 'Скорость ветра' },
  todays_et0: { en: "Today's ET0", no: 'Dagens ET0', es: 'ET0 de Hoy', it: 'ET0 di Oggi', fr: 'ET0 du Jour', de: 'Heutiges ET0', sv: 'Dagens ET0', ru: 'Сегодняшнее ET0' },
  next_24_hours: { en: 'Next 24 Hours', no: 'Neste 24 timer', es: 'Próximas 24 Horas', it: 'Prossime 24 Ore', fr: 'Prochaines 24 Heures', de: 'Nächste 24 Stunden', sv: 'Kommande 24 timmar', ru: 'Следующие 24 часа' },
  temperature_trend_7_days: { en: 'Temperature Trend (7 days)', no: 'Temperaturtrend (7 dager)', es: 'Tendencia de Temperatura (7 días)', it: 'Andamento Temperatura (7 giorni)', fr: 'Tendance de la Température (7 jours)', de: 'Temperaturtrend (7 Tage)', sv: 'Temperaturtrend (7 dagar)', ru: 'Температурный тренд (7 дней)' },
  precipitation_forecast_7_days: { en: 'Precipitation Forecast (7 days)', no: 'Nedbørsprognose (7 dager)', es: 'Pronóstico de Precipitación (7 días)',it: 'Previsione Precipitazioni (7 giorni)', fr: 'Prévisions de Précipitations (7 jours)', de: 'Niederschlagsvorhersage (7 Tage)', sv: 'Nederbördsprognos (7 dagar)', ru: 'Прогноз осадков (7 дней)' },
  max_temp: { en: 'Max Temp', no: 'Maks Temp', es: 'Temp Máx', it: 'Temp Max', fr: 'Temp Max', de: 'Max Temp', sv: 'Max Temp', ru: 'Макс. темп.' },
  amount_mm: { en: 'Amount (mm)', no: 'Mengde (mm)', es: 'Cantidad (mm)', it: 'Quantità (mm)', fr: 'Quantité (mm)', de: 'Menge (mm)', sv: 'Mängd (mm)', ru: 'Количество (мм)' },
  probability_percent: { en: 'Probability (%)', no: 'Sannsynlighet (%)', es: 'Probabilidad (%)', it: 'Probabilità (%)', fr: 'Probabilité (%)', de: 'Wahrscheinlichkeit (%)', sv: 'Sannolikhet (%)', ru: 'Вероятность (%)' },
  extended_forecast: { en: 'Extended Forecast', no: 'Utvidet Prognose', es: 'Pronóstico Extendido', it: 'Previsione Estesa', fr: 'Prévisions Étendues', de: 'Erweiterte Vorhersage', sv: 'Utökad Prognos', ru: 'Расширенный прогноз' },
  ai_microclimate_analysis: { en: 'AI Microclimate Analysis', no: 'AI Mikroklima Analyse', es: 'Análisis de Microclima IA', it: 'Analisi Microclima IA', fr: 'Analyse du Microclimat IA', de: 'KI-Mikroklima-Analyse', sv: 'AI Mikroklimatanalys', ru: 'Анализ микроклимата ИИ' },
  see_full_report: { en: 'See full report', no: 'Se full rapport', es: 'Ver informe completo', it: 'Vedi rapporto completo', fr: 'Voir le rapport complet', de: 'Vollständigen Bericht ansehen', sv: 'Se hela rapporten', ru: 'Смотреть полный отчет' },
  saved: { en: 'Saved!', no: 'Lagret!', es: '¡Guardado!', it: 'Salvato!', fr: 'Enregistré !', de: 'Gespeichert!', sv: 'Sparat!', ru: 'Сохранено!' },
  save_settings: { en: 'Save Settings', no: 'Lagre innstillinger', es: 'Guardar Ajustes', it: 'Salva Impostazioni', fr: 'Enregistrer les Paramètres', de: 'Einstellungen speichern', sv: 'Spara inställningar', ru: 'Сохранить настройки' },
  api_keys: { en: 'API Keys', no: 'API-nøkler', es: 'Claves de API', it: 'Chiavi API', fr: 'Clés API', de: 'API-Schlüssel', sv: 'API-nycklar', ru: 'Ключи API' },
  save_keys: { en: 'Save Keys', no: 'Lagre nøkler', es: 'Guardar Claves', it: 'Salva Chiavi', fr: 'Enregistrer les Clés', de: 'Schlüssel speichern', sv: 'Spara nycklar', ru: 'Сохранить ключи' },
  keys_stored_locally: { en: 'Keys are stored locally in your browser (localStorage). They are never sent to any server.', no: 'Nøklene lagres kun lokalt i nettleseren din (localStorage). De sendes aldri til noen server.', es: 'Las claves se almacenan localmente en tu navegador (localStorage). Nunca se envían a ningún servidor.', it: 'Le chiavi sono memorizzate localmente nel tuo browser (localStorage). Non vengono mai inviate a nessun server.', fr: 'Les clés sont stockées localement dans votre navigateur (localStorage). Elles ne sont jamais envoyées à un serveur.', de: 'Schlüssel werden lokal in Ihrem Browser gespeichert (localStorage). Sie werden niemals an einen Server gesendet.', sv: 'Nycklarna lagras lokalt i din webbläsare (localStorage). De skickas aldrig till någon server.', ru: 'Ключи хранятся локально в вашем браузере (localStorage). Они никогда не отправляются ни на какой сервер.' },
  google_gemini_api_key: { en: 'Google Gemini API Key', no: 'Google Gemini API-nøkkel', es: 'Clave de API de Google Gemini', it: 'Chiave API di Google Gemini', fr: 'Clé API Google Gemini', de: 'Google Gemini API-Schlüssel', sv: 'Google Gemini API-nyckel', ru: 'Ключ API Google Gemini' },
  get_key: { en: 'Get Key', no: 'Hent nøkkel', es: 'Obtener Clave', it: 'Ottieni Chiave', fr: 'Obtenir la Clé', de: 'Schlüssel erhalten', sv: 'Hämta nyckel', ru: 'Получить ключ' },
  anthropic_claude_api_key: { en: 'Anthropic Claude API Key', no: 'Anthropic Claude API-nøkkel', es: 'Clave de API de Anthropic Claude', it: 'Chiave API di Anthropic Claude', fr: 'Clé API Anthropic Claude', de: 'Anthropic Claude API-Schlüssel', sv: 'Anthropic Claude API-nyckel', ru: 'Ключ API Anthropic Claude' },
  ai_analysis_priority: { en: 'AI Analysis Priority:', no: 'Prioritet ved AI-analyse:', es: 'Prioridad de Análisis de IA:', it: 'Priorità Analisi AI:', fr: 'Priorité de l\'Analyse IA :', de: 'Priorität der KI-Analyse:', sv: 'Prioritet för AI-analys:', ru: 'Приоритет анализа ИИ:' },
  claude_key_set: { en: 'Claude key set → uses Claude', no: 'Claude-nøkkel satt → bruker Claude', es: 'Clave de Claude establecida → usa Claude', it: 'Chiave Claude impostata → usa Claude', fr: 'Clé Claude définie → utilise Claude', de: 'Claude-Schlüssel gesetzt → verwendet Claude', sv: 'Claude-nyckel inställd → använder Claude', ru: 'Ключ Claude установлен → используется Claude' },
  gemini_key_only: { en: 'Only Gemini key → uses Google Gemini', no: 'Kun Gemini-nøkkel → bruker Google Gemini', es: 'Solo clave de Gemini → usa Google Gemini', it: 'Solo chiave Gemini → usa Google Gemini', fr: 'Clé Gemini uniquement → utilise Google Gemini', de: 'Nur Gemini-Schlüssel → verwendet Google Gemini', sv: 'Endast Gemini-nyckel → använder Google Gemini', ru: 'Только ключ Gemini → используется Google Gemini' },
  no_keys: { en: 'No keys → uses environment variable (GEMINI_API_KEY from .env)', no: 'Ingen nøkler → bruker miljøvariabel (GEMINI_API_KEY fra .env)', es: 'Sin claves → usa variable de entorno (GEMINI_API_KEY de .env)', it: 'Nessuna chiave → usa variabile d\'ambiente (GEMINI_API_KEY da .env)', fr: 'Aucune clé → utilise la variable d\'environnement (GEMINI_API_KEY de .env)', de: 'Keine Schlüssel → verwendet Umgebungsvariable (GEMINI_API_KEY aus .env)', sv: 'Inga nycklar → använder miljövariabel (GEMINI_API_KEY från .env)', ru: 'Нет ключей → используется переменная окружения (GEMINI_API_KEY из .env)' },
  farm_config: { en: 'Farm Config', no: 'Gårdskonfigurasjon', es: 'Configuración de la Finca', it: 'Configurazione Azienda', fr: 'Configuration de l\'Exploitation', de: 'Betriebskonfiguration', sv: 'Gårdskonfiguration', ru: 'Конфигурация фермы' },
  farm_name: { en: 'Farm Name', no: 'Gårdsnavn', es: 'Nombre de la Finca', it: 'Nome Azienda', fr: 'Nom de l\'Exploitation', de: 'Betriebsname', sv: 'Gårdsnamn', ru: 'Название фермы' },
  address_label: { en: 'Address', no: 'Adresse', es: 'Dirección', it: 'Indirizzo', fr: 'Adresse', de: 'Adresse', sv: 'Adress', ru: 'Адрес' },
  language_label: { en: 'Language & Region', no: 'Språk & Region', es: 'Idioma y Región', it: 'Lingua e Regione', fr: 'Langue et Région', de: 'Sprache & Region', sv: 'Språk & Region', ru: 'Язык и регион' },
  currency: { en: 'Currency', no: 'Valuta', es: 'Moneda', it: 'Valuta', fr: 'Devise', de: 'Währung', sv: 'Valuta', ru: 'Валюта' },
  production_control: { en: 'Production Control', no: 'Produksjonskontroll', es: 'Control de Producción', it: 'Controllo Produzione', fr: 'Contrôle de Production', de: 'Produktionskontrolle', sv: 'Produktionskontroll', ru: 'Контроль производства' },
  table_olive_pipeline: { en: 'Table Olive Pipeline - from picking to sale', no: 'Bordoliven pipeline – fra plukking til salg', es: 'Pipeline de Aceituna de Mesa - de la cosecha a la venta', it: 'Pipeline Olive da Tavola - dalla raccolta alla vendita', fr: 'Pipeline des Olives de Table - de la cueillette à la vente', de: 'Tafeloliven-Pipeline - von der Ernte bis zum Verkauf', sv: 'Bordsoliver-pipeline – från plockning till försäljning', ru: 'Производственный конвейер столовых оливок - от сбора до продажи' },
  new_recipe: { en: 'New Recipe', no: 'Ny Oppskrift', es: 'Nueva Receta', it: 'Nuova Ricetta', fr: 'Nouvelle Recette', de: 'Neues Rezept', sv: 'Nytt Recept', ru: 'Новый рецепт' },
  new_batch: { en: 'New Batch', no: 'Ny Batch', es: 'Nuevo Lote', it: 'Nuovo Lotto', fr: 'Nouveau Lot', de: 'Neue Charge', sv: 'Ny Batch', ru: 'Новая партия' },
  pipeline: { en: 'Pipeline', no: 'Pipeline', es: 'Pipeline', it: 'Pipeline', fr: 'Pipeline', de: 'Pipeline', sv: 'Pipeline', ru: 'Конвейер' },
  history: { en: 'History', no: 'Historikk', es: 'Historial', it: 'Storico', fr: 'Historique', de: 'Historie', sv: 'Historik', ru: 'История' },
  recipes: { en: 'Recipes', no: 'Oppskrifter', es: 'Recetas', it: 'Ricette', fr: 'Recettes', de: 'Rezepte', sv: 'Recept', ru: 'Рецепты' },
  process_guide: { en: 'Process Guide', no: 'Prosessguide', es: 'Guía de Proceso', it: 'Guida al Processo', fr: 'Guide de Processus', de: 'Prozessanleitung', sv: 'Processguide', ru: 'Руководство по процессу' },
  no_active_batches: { en: 'No active batches. Click <strong class="text-white">New Batch</strong> to start.', no: 'Ingen aktive batches. Klikk <strong class="text-white">Ny Batch</strong> for å starte.', es: 'No hay lotes activos. Haz clic en <strong class="text-white">Nuevo Lote</strong> para comenzar.', it: 'Nessun lotto attivo. Clicca su <strong class="text-white">Nuovo Lotto</strong> per iniziare.', fr: 'Aucun lot actif. Cliquez sur <strong class="text-white">Nouveau Lot</strong> pour commencer.', de: 'Keine aktiven Chargen. Klicken Sie auf <strong class="text-white">Neue Charge</strong>, um zu beginnen.', sv: 'Inga aktiva batcher. Klicka på <strong class="text-white">Ny Batch</strong> för att starta.', ru: 'Нет активных партий. Нажмите <strong class="text-white">Новая партия</strong>, чтобы начать.' },
  no_batches: { en: 'No batches', no: 'Ingen batches', es: 'No hay lotes', it: 'Nessun lotto', fr: 'Aucun lot', de: 'Keine Chargen', sv: 'Inga batcher', ru: 'Нет партий' },
  next_step: { en: 'Next Step', no: 'Neste steg', es: 'Siguiente Paso', it: 'Passo Successivo', fr: 'Étape Suivante', de: 'Nächster Schritt', sv: 'Nästa steg', ru: 'Следующий шаг' },
  archive: { en: 'Archive', no: 'Arkiver', es: 'Archivar', it: 'Archivia', fr: 'Archiver', de: 'Archivieren', sv: 'Arkivera', ru: 'Архивировать' },
  fleet_and_equipment: { en: 'Fleet & Equipment', no: 'Maskinpark & Utstyr', es: 'Flota y Equipo', it: 'Flotta e Attrezzature', fr: 'Flotte et Équipement', de: 'Fuhrpark & Ausrüstung', sv: 'Maskinpark & Utrustning', ru: 'Автопарк и оборудование' },
  manage_fleet_and_monitor_metrics: { en: 'Manage your fleet and monitor operational metrics.', no: 'Administrer din flåte og overvåk driftsmålinger.', es: 'Gestiona tu flota y supervisa las métricas operativas.', it: 'Gestisci la tua flotta e monitora le metriche operative.', fr: 'Gérez votre flotte et surveillez les métriques opérationnelles.', de: 'Verwalten Sie Ihren Fuhrpark und überwachen Sie die Betriebskennzahlen.', sv: 'Hantera din maskinpark och övervaka driftmätningar.', ru: 'Управляйте своим автопарком и отслеживайте рабочие показатели.' },
  register_equipment: { en: 'Register Equipment', no: 'Registrer Utstyr', es: 'Registrar Equipo', it: 'Registra Attrezzatura', fr: 'Enregistrer un Équipement', de: 'Ausrüstung registrieren', sv: 'Registrera Utrustning', ru: 'Зарегистрировать оборудование' },
  accumulated_operational_data: { en: 'Accumulated Operational Data', no: 'Akkumulert Driftsdata', es: 'Datos Operativos Acumulados', it: 'Dati Operativi Accumulati', fr: 'Données Opérationnelles Accumulées', de: 'Kumulierte Betriebsdaten', sv: 'Ackumulerade Driftdata', ru: 'Накопленные операционные данные' },
  condition: { en: 'Condition', no: 'Tilstand', es: 'Condición', it: 'Condizione', fr: 'État', de: 'Zustand', sv: 'Skick', ru: 'Состояние' },
  last_service: { en: 'Last Service', no: 'Siste service', es: 'Último Servicio', it: 'Ultima Manutenzione', fr: 'Dernier Entretien', de: 'Letzter Service', sv: 'Senaste Service', ru: 'Последнее обслуживание' },
  machine_model: { en: 'Machine / Model', no: 'Maskin / Modell', es: 'Máquina / Modelo', it: 'Macchina / Modello', fr: 'Machine / Modèle', de: 'Maschine / Modell', sv: 'Maskin / Modell', ru: 'Машина / Модель' },
  type: { en: 'Type', no: 'Type', es: 'Tipo', it: 'Tipo', fr: 'Type', de: 'Typ', sv: 'Typ', ru: 'Тип' },
  status: { en: 'Status', no: 'Status', es: 'Estado', it: 'Stato', fr: 'Statut', de: 'Status', sv: 'Status', ru: 'Статус' },
  measurement_unit: { en: 'Measurement Unit', no: 'Måleenhet', es: 'Unidad de Medida', it: 'Unità di Misura', fr: 'Unité de Mesure', de: 'Maßeinheit', sv: 'Måttenhet', ru: 'Единица измерения' },
  operating_value: { en: 'Operating Value', no: 'Driftsverdi', es: 'Valor Operativo', it: 'Valore Operativo', fr: 'Valeur d\'Exploitation', de: 'Betriebswert', sv: 'Driftvärde', ru: 'Рабочее значение' },
  register_new_equipment: { en: 'Register New Equipment', no: 'Registrer Nytt Utstyr', es: 'Registrar Nuevo Equipo', it: 'Registra Nuova Attrezzatura', fr: 'Enregistrer un Nouvel ÉquIPement', de: 'Neue Ausrüstung registrieren', sv: 'Registrera Ny Utrustning', ru: 'Зарегистрировать новое оборудование' },
  model_name: { en: 'Model/Name', no: 'Modell/Navn', es: 'Modelo/Nombre', it: 'Modello/Nome', fr: 'Modèle/Nom', de: 'Modell/Name', sv: 'Modell/Namn', ru: 'Модель/Название' },
  start_value: { en: 'Start Value', no: 'Startverdi', es: 'Valor Inicial', it: 'Valore Iniziale', fr: 'Valeur Initiale', de: 'Startwert', sv: 'Startvärde', ru: 'Начальное значение' },
  register_in_fleet: { en: 'Register in Fleet', no: 'Registrer i flåten', es: 'Registrar en la Flota', it: 'Registra nella Flotta', fr: 'Enregistrer dans la Flotte', de: 'Im Fuhrpark registrieren', sv: 'Registrera i maskinparken', ru: 'Зарегистрировать в автопарке' },
  service: { en: 'Service', no: 'Service', es: 'Servicio', it: 'Manutenzione', fr: 'Entretien', de: 'Service', sv: 'Service', ru: 'Обслуживание' },
  broken: { en: 'Broken', no: 'Defekt', es: 'Averiado', it: 'Guasto', fr: 'En Panne', de: 'Defekt', sv: 'Trasig', ru: 'Сломан' },

  // Months
  jan: { en: 'Jan', no: 'Jan', es: 'Ene', it: 'Gen', fr: 'Janv', de: 'Jan', sv: 'Jan', ru: 'Янв' },
  feb: { en: 'Feb', no: 'Feb', es: 'Feb', it: 'Feb', fr: 'Févr', de: 'Feb', sv: 'Feb', ru: 'Фев' },
  mar: { en: 'Mar', no: 'Mar', es: 'Mar', it: 'Mar', fr: 'Mars', de: 'März', sv: 'Mar', ru: 'Март' },
  apr: { en: 'Apr', no: 'Apr', es: 'Abr', it: 'Apr', fr: 'Avril', de: 'Apr', sv: 'Apr', ru: 'Апр' },
  may: { en: 'May', no: 'Mai', es: 'May', it: 'Mag', fr: 'Mai', de: 'Mai', sv: 'Maj', ru: 'Май' },
  jun: { en: 'Jun', no: 'Jun', es: 'Jun', it: 'Giu', fr: 'Juin', de: 'Juni', sv: 'Jun', ru: 'Июнь' },

  // Profitability Dashboard
  profitability_overview: { en: 'Profitability Overview', no: 'Lønnsomhetsoversikt', es: 'Resumen de Rentabilidad', it: 'Panoramica della Redditività', fr: 'Aperçu de la Rentabilité', de: 'Rentabilitätsübersicht', sv: 'Lönsamhetsöversikt', ru: 'Обзор рентабельности' },
  economic_result_for: { en: 'Economic result for DonaAnna.com', no: 'Økonomisk resultat for DonaAnna.com', es: 'Resultado económico para DonaAnna.com', it: 'Risultato economico per DonaAnna.com', fr: 'Résultat économique pour DonaAnna.com', de: 'Wirtschaftliches Ergebnis für DonaAnna.com', sv: 'Ekonomiskt resultat för DonaAnna.com', ru: 'Экономический результат для DonaAnna.com' },
  this_year: { en: 'This Year', no: 'Dette året', es: 'Este Año', it: 'Quest\'anno', fr: 'Cette Année', de: 'Dieses Jahr', sv: 'Detta År', ru: 'Этот год' },
  total_revenue: { en: 'Total Revenue', no: 'Total omsetning', es: 'Ingresos Totales', it: 'Entrate Totali', fr: 'Revenus Totaux', de: 'Gesamtumsatz', sv: 'Totala Intäkter', ru: 'Общий доход' },
  total_costs: { en: 'Total Costs', no: 'Totale kostnader', es: 'Costos Totales', it: 'Costi Totali', fr: 'Coûts Totaux', de: 'Gesamtkosten', sv: 'Totala Kostnader', ru: 'Общие затраты' },
  net_profit: { en: 'Net Profit', no: 'Nettoresultat', es: 'Beneficio Neto', it: 'Utile Netto', fr: 'Bénéfice Net', de: 'Nettogewinn', sv: 'Nettovinst', ru: 'Чистая прибыль' },
  profit_margin: { en: 'Profit Margin', no: 'Driftsmargin', es: 'Margen de Beneficio', it: 'Margine di Profitto', fr: 'Marge Bénéficiaire', de: 'Gewinnmarge', sv: 'Vinstmarginal', ru: 'Рентабельность' },
  revenue_vs_costs: { en: 'Revenue vs. Costs', no: 'Inntekter vs. Kostnader', es: 'Ingresos vs. Costos', it: 'Ricavi vs. Costi', fr: 'Revenus vs. Coûts', de: 'Einnahmen vs. Kosten', sv: 'Intäkter vs. Kostnader', ru: 'Доходы против расходов' },
  revenue_distribution: { en: 'Revenue Distribution', no: 'Inntektsfordeling', es: 'Distribución de Ingresos', it: 'Distribuzione dei Ricavi', fr: 'Répartition des Revenus', de: 'Umsatzverteilung', sv: 'Intäktsfördelning', ru: 'Распределение доходов' },
  cost_distribution: { en: 'Cost Distribution', no: 'Kostnadsfordeling', es: 'Distribución de Costos', it: 'Distribuzione dei Costi', fr: 'Répartition des Coûts', de: 'Kostenverteilung', sv: 'Kostnadsfördelning', ru: 'Распределение затрат' },
  REVENUE: { en: 'Revenue', no: 'Inntekter', es: 'Ingresos', it: 'Ricavi', fr: 'Revenus', de: 'Einnahmen', sv: 'Intäkter', ru: 'Доходы' },
  COSTS: { en: 'Costs', no: 'Kostnader', es: 'Costos', it: 'Costi', fr: 'Coûts', de: 'Kosten', sv: 'Kostnader', ru: 'Расходы' },
  
  // Navigation & old keys (to be slowly phased out as components are refactored)
  dashboard: { en: "Dashboard", no: "Dashboard", es: "Panel", it: "Dashboard", fr: "Tableau de bord", de: "Dashboard", sv: "Översikt", ru: "Панель приборов" },
  consultant: { en: "AI Field Consultant", no: "AI Feltkonsulent", es: "Consultor AI", it: "Consulente AI", fr: "Consultant IA", de: "KI-Feldberater", sv: "AI Fältkonsult", ru: "Полевой консультант ИИ" },
  pruning: { en: "AI Pruning Advisor", no: "Beskjæringsekspert", es: "Asesor de Poda", it: "Esperto Potatura", fr: "Expert Taille", de: "KI-Schnittberater", sv: "AI Beskärningsrådgivare", ru: "Советник по обрезке ИИ" },
  map: { en: "Farm Map", no: "Gårdskart", es: "Mapa Agrícola", it: "Mappa Aziendale", fr: "Carte de l\'Exploitation", de: "Hofkarte", sv: "Gårdskarta", ru: "Карта фермы" },
  weather: { en: "Weather & Climate", no: "Vær & Klima", es: "Clima", it: "Meteo e Clima", fr: "Météo et Climat", de: "Wetter & Klima", sv: "Väder & Klimat", ru: "Погода и климат" },
  production: { en: "Production", no: "Produksjon", es: "Producción", it: "Produzione", fr: "Production", de: "Produktion", sv: "Produktion", ru: "Производство" },
  economy: { en: "Economy", no: "Økonomi", es: "Economía", it: "Economia", fr: "Économie", de: "Wirtschaft", sv: "Ekonomi", ru: "Экономика" },
  fleet: { en: "Fleet", no: "Maskinpark", es: "Maquinaria", it: "Parco Macchine", fr: "Flotte", de: "Flotte", sv: "Maskinpark", ru: "Автопарк" },
  irrigation: { en: "Irrigation", no: "Vanning", es: "Riego", it: "Irrigazione", fr: "Irrigation", de: "Bewässerung", sv: "Bevattning", ru: "Орошение" },
  tasks: { en: "Tasks", no: "Oppgaver", es: "Tareas", it: "Compiti", fr: "Tâches", de: "Aufgaben", sv: "Uppgifter", ru: "Задачи" },
  settings: { en: "Settings", no: "Innstillinger", es: "Ajustes", it: "Impostazioni", fr: "Paramètres", de: "Einstellungen", sv: "Inställningar", ru: "Настройки" },
  logout: { en: "Log Out", no: "Logg ut", es: "Cerrar Sesión", it: "Esci", fr: "Déconnexion", de: "Abmelden", sv: "Logga ut", ru: "Выйти" },
  admin: { en: "SaaS Admin", no: "SaaS Admin", es: "Admin SaaS", it: "Admin SaaS", fr: "Admin SaaS", de: "SaaS-Admin", sv: "SaaS Admin", ru: "SaaS Admin" },
  total_yield: { en: "Total Yield", no: "Total Avling", es: "Cosecha Total", it: "Raccolto Totale", fr: "Rendement Total", de: "Gesamtertrag", sv: "Total Skörd", ru: "Общий урожай" },
  water_usage: { en: "Water Usage", no: "Vannforbruk", es: "Uso de Agua", it: "Consumo Idrico", fr: "Consommation d\'eau", de: "Wasserverbrauch", sv: "Vattenförbrukning", ru: "Потребление воды" },
  operating_cost: { en: "Operating Cost", no: "Driftskostnad", es: "Coste Operativo", it: "Costi Operativi", fr: "Coût d\'exploitation", de: "Betriebskosten", sv: "Driftskostnad", ru: "Эксплуатационные расходы" },
  iot_sensors: { en: "IoT Sensors", no: "IoT Sensorer", es: "Sensores IoT", it: "Sensori IoT", fr: "Capteurs IoT", de: "IoT-Sensoren", sv: "IoT-Sensorer", ru: "Датчики IoT" },
  economic_analysis: { en: "Economic Analysis", no: "Økonomisk Analyse", es: "Análisis Económico", it: "Analisi Economica", fr: "Analyse Économique", de: "Wirtschaftsanalyse", sv: "Ekonomisk Analys", ru: "Экономический анализ" },
  weather_now: { en: "Weather Now", no: "Været Nå", es: "Clima Ahora", it: "Meteo Ora", fr: "Météo Actuelle", de: "Wetter jetzt", sv: "Väder nu", ru: "Погода сейчас" },
  harvest_per_sector: { en: "Harvest per sector", no: "Avling per sektor", es: "Cosecha por sector", it: "Raccolto per settore", fr: "Récolte par secteur", de: "Ernte pro Sektor", sv: "Skörd per sektor", ru: "Урожай по секторам" },
  ai_intelligence: { en: "AI Intelligence", no: "AI Intelligens", es: "Inteligencia AI", it: "Intelligenza AI", fr: "Intelligence IA", de: "KI-Intelligenz", sv: "AI-Intelligens", ru: "Интеллект ИИ" },
  update_analysis: { en: "Update Analysis", no: "Oppdater analyse", es: "Actualizar Análisis", it: "Aggiorna Analisi", fr: "Mettre à jour l\'analyse", de: "Analyse aktualisieren", sv: "Uppdatera analys", ru: "Обновить анализ" },
  active_alerts: { en: "Active Alerts", no: "Aktive Varsler", es: "Alertas Activas", it: "Avvisi Attivi", fr: "Alertes Actives", de: "Aktive Alarme", sv: "Aktiva varningar", ru: "Активные оповещения" },
  perfect_spraying: { en: "Perfect for spraying", no: "Perfekt for sprøyting", es: "Perfecto para fumigar", it: "Perfetto per trattamenti", fr: "Parfait pour la pulvérisation", de: "Perfekt zum Sprühen", sv: "Perfekt för besprutning", ru: "Идеально для опрыскивания" },
  no_api_key: { en: "No API key configured. AI analysis is unavailable.", no: "Ingen API-nøkkel konfigurert. AI-analyse er ikke tilgjengelig.", es: "Sin clave API. El análisis de IA no está disponible.", it: "Nessuna chiave API configurata. L\'analisi AI non è disponibile.", fr: "Aucune clé API configurée. L\'analyse IA n\'est pas disponible.", de: "Kein API-Schlüssel konfiguriert. KI-Analyse ist nicht verfügbar.", sv: "Ingen API-nyckel konfigurerad. AI-analys är inte tillgänglig.", ru: "API-ключ не настроен. Анализ ИИ недоступен." },
  go_to_settings: { en: "Go to Settings → API Keys to add your Gemini or Claude key.", no: "Gå til Innstillinger → API-nøkler for å legge inn din Gemini- eller Claude-nøkkel.", es: "Ve a Ajustes → Claves API para añadir tu clave Gemini o Claude.", it: "Vai a Impostazioni → Chiavi API per aggiungere la tua chiave Gemini o Claude.", fr: "Allez dans Paramètres → Clés API pour ajouter votre clé Gemini ou Claude.", de: "Gehen Sie zu Einstellungen → API-Schlüssel, um Ihren Gemini- oder Claude-Schlüssel hinzuzufügen.", sv: "Gå till Inställningar → API-nycklar för att lägga till din Gemini- eller Claude-nyckel.", ru: "Перейдите в Настройки → Ключи API, чтобы добавить свой ключ Gemini или Claude." },
};

// Transformed translations
const transformedTranslations: Record<Language, Record<string, string>> = {
  en: {}, no: {}, es: {}, it: {}, fr: {}, de: {}, sv: {}, ru: {}
};

const languages: Language[] = ['en', 'no', 'es', 'it', 'fr', 'de', 'sv', 'ru'];

for (const key in translations) {
  for (const lang of languages) {
    transformedTranslations[lang][key] = translations[key][lang];
  }
}

export const getTranslation = (key: string, lang: Language): string => {
  return transformedTranslations[lang]?.[key] || transformedTranslations['en']?.[key] || key;
};

// Hook for easy use in components
import { useMemo } from 'react';

// This hook provides a consistent interface for our translation needs.
export const useTranslation = (language: Language) => {
  const t = useMemo(() => (key: string) => getTranslation(key, language), [language]);
  return { t, currentLanguage: language };
};
