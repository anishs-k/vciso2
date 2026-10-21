/**
 * DropdownSystem.jsx — Central searchable dropdown framework for the vCISO platform.
 * Provides: SearchableSelect, LocationCascade, and all standard dropdown data.
 * Works with inline styles (no Tailwind dependency).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { th } from '../theme';

/* ─────────────────────────────────────────────────────────
   COLOURS (matches platform theme)
───────────────────────────────────────────────────────── */
const DC = {
  purple:'#7c3aed', purpleL:th('#f5f3ff', { dark: '#2E1065' }), purpleM:th('#ede9fe', { dark: '#2E1065' }),
  ink:th('#0f172a', { dark: '#F1F5F9' }), mid:th('#334155', { dark: '#CBD5E1' }), muted:th('#64748b', { dark: '#94A3B8' }),
  border:th('#e2e8f0', { dark: '#334155' }), bg:th('#f8fafc', { dark: '#0F172A' }), card:th('#ffffff', { dark: '#1E293B' }),
  green:'#16a34a', red:'#dc2626',
};

/* ─────────────────────────────────────────────────────────
   GEO DATA  (Country → State → [Cities])
───────────────────────────────────────────────────────── */
export const GEO_DATA = {
  'India': {
    'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Tirupati','Rajahmundry','Kakinada','Eluru','Anantapur'],
    'Arunachal Pradesh': ['Itanagar','Naharlagun','Pasighat','Bomdila'],
    'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur'],
    'Bihar': ['Patna','Gaya','Bhagalpur','Muzaffarpur','Darbhanga','Purnia','Arrah','Begusarai'],
    'Chhattisgarh': ['Raipur','Bhilai','Durg','Bilaspur','Korba','Jagdalpur'],
    'Goa': ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda'],
    'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Gandhinagar','Bhavnagar','Jamnagar','Anand','Junagadh'],
    'Haryana': ['Faridabad','Gurugram','Panipat','Ambala','Hisar','Rohtak','Karnal','Panchkula','Sonipat'],
    'Himachal Pradesh': ['Shimla','Manali','Dharamsala','Solan','Mandi','Kullu'],
    'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Hazaribagh'],
    'Karnataka': ['Bengaluru','Mysuru','Hubli','Mangaluru','Belagavi','Ballari','Davanagere','Shivamogga','Tumkur','Udupi'],
    'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Palakkad','Alappuzha','Kannur'],
    'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Dewas','Satna'],
    'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Solapur','Thane','Amravati','Navi Mumbai','Kolhapur','Pimpri-Chinchwad'],
    'Manipur': ['Imphal','Thoubal','Bishnupur','Churachandpur'],
    'Meghalaya': ['Shillong','Tura','Jowai'],
    'Mizoram': ['Aizawl','Lunglei','Champhai'],
    'Nagaland': ['Kohima','Dimapur','Mokokchung'],
    'Odisha': ['Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur','Puri'],
    'Punjab': ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Phagwara'],
    'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Alwar','Bikaner','Sikar','Bhilwara','Bharatpur','Pali'],
    'Sikkim': ['Gangtok','Namchi','Gyalshing'],
    'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Tiruppur','Thanjavur'],
    'Telangana': ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Ramagundam'],
    'Tripura': ['Agartala','Dharmanagar','Kailashahar'],
    'Uttar Pradesh': ['Lucknow','Kanpur','Ghaziabad','Agra','Meerut','Varanasi','Prayagraj','Bareilly','Noida','Gorakhpur','Aligarh','Firozabad','Mathura'],
    'Uttarakhand': ['Dehradun','Haridwar','Roorkee','Haldwani','Rishikesh','Nainital'],
    'West Bengal': ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Malda','Kharagpur'],
    'Delhi': ['New Delhi','Central Delhi','North Delhi','South Delhi','East Delhi','West Delhi','Dwarka','Rohini'],
    'Jammu and Kashmir': ['Srinagar','Jammu','Anantnag','Baramulla','Sopore','Udhampur'],
    'Ladakh': ['Leh','Kargil'],
    'Chandigarh': ['Chandigarh'],
    'Puducherry': ['Puducherry','Karaikal','Yanam'],
    'Andaman and Nicobar Islands': ['Port Blair','Diglipur'],
    'Dadra and Nagar Haveli': ['Silvassa'],
    'Daman and Diu': ['Daman','Diu'],
    'Lakshadweep': ['Kavaratti','Agatti'],
  },
  'United States': {
    'Alabama': ['Birmingham','Montgomery','Huntsville','Mobile','Tuscaloosa'],
    'Alaska': ['Anchorage','Fairbanks','Juneau','Sitka'],
    'Arizona': ['Phoenix','Tucson','Scottsdale','Mesa','Chandler','Gilbert','Glendale','Peoria'],
    'Arkansas': ['Little Rock','Fort Smith','Fayetteville','Springdale'],
    'California': ['Los Angeles','San Francisco','San Diego','San Jose','Sacramento','Oakland','Fresno','Irvine','Anaheim','Santa Clara','Sunnyvale'],
    'Colorado': ['Denver','Colorado Springs','Aurora','Fort Collins','Boulder','Lakewood'],
    'Connecticut': ['Bridgeport','New Haven','Hartford','Stamford','Waterbury'],
    'Delaware': ['Wilmington','Dover','Newark'],
    'Florida': ['Miami','Orlando','Tampa','Jacksonville','Fort Lauderdale','Tallahassee','St. Petersburg','Cape Coral'],
    'Georgia': ['Atlanta','Augusta','Columbus','Savannah','Athens','Sandy Springs'],
    'Hawaii': ['Honolulu','Pearl City','Hilo','Kailua'],
    'Idaho': ['Boise','Nampa','Meridian','Idaho Falls'],
    'Illinois': ['Chicago','Aurora','Rockford','Joliet','Naperville','Springfield','Peoria'],
    'Indiana': ['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel'],
    'Iowa': ['Des Moines','Cedar Rapids','Davenport','Sioux City'],
    'Kansas': ['Wichita','Overland Park','Kansas City','Topeka'],
    'Kentucky': ['Louisville','Lexington','Bowling Green','Owensboro'],
    'Louisiana': ['New Orleans','Baton Rouge','Shreveport','Lafayette'],
    'Maine': ['Portland','Lewiston','Bangor','Augusta'],
    'Maryland': ['Baltimore','Frederick','Gaithersburg','Rockville','Annapolis'],
    'Massachusetts': ['Boston','Worcester','Springfield','Cambridge','Lowell'],
    'Michigan': ['Detroit','Grand Rapids','Warren','Ann Arbor','Lansing','Dearborn'],
    'Minnesota': ['Minneapolis','Saint Paul','Rochester','Duluth'],
    'Mississippi': ['Jackson','Gulfport','Hattiesburg','Biloxi'],
    'Missouri': ["Kansas City","St. Louis","Springfield","Columbia"],
    'Montana': ['Billings','Missoula','Great Falls','Helena'],
    'Nebraska': ['Omaha','Lincoln','Bellevue','Grand Island'],
    'Nevada': ['Las Vegas','Henderson','Reno','North Las Vegas'],
    'New Hampshire': ['Manchester','Nashua','Concord','Dover'],
    'New Jersey': ['Newark','Jersey City','Paterson','Elizabeth','Trenton','Edison'],
    'New Mexico': ['Albuquerque','Las Cruces','Santa Fe','Roswell'],
    'New York': ['New York City','Buffalo','Rochester','Yonkers','Syracuse','Albany'],
    'North Carolina': ['Charlotte','Raleigh','Greensboro','Durham','Winston-Salem','Cary'],
    'North Dakota': ['Fargo','Bismarck','Grand Forks','Minot'],
    'Ohio': ['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton'],
    'Oklahoma': ['Oklahoma City','Tulsa','Norman','Broken Arrow'],
    'Oregon': ['Portland','Eugene','Salem','Gresham','Hillsboro'],
    'Pennsylvania': ['Philadelphia','Pittsburgh','Allentown','Erie','Reading','Scranton'],
    'Rhode Island': ['Providence','Cranston','Warwick','Pawtucket'],
    'South Carolina': ['Columbia','Charleston','North Charleston','Greenville'],
    'South Dakota': ['Sioux Falls','Rapid City','Aberdeen'],
    'Tennessee': ['Nashville','Memphis','Knoxville','Chattanooga','Clarksville'],
    'Texas': ['Houston','San Antonio','Dallas','Austin','Fort Worth','El Paso','Arlington','Corpus Christi','Plano','Irving','Lubbock','Frisco'],
    'Utah': ['Salt Lake City','West Valley City','Provo','Ogden','St. George'],
    'Vermont': ['Burlington','South Burlington','Rutland','Montpelier'],
    'Virginia': ['Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Arlington'],
    'Washington': ['Seattle','Spokane','Tacoma','Vancouver','Bellevue','Kirkland','Redmond'],
    'West Virginia': ['Charleston','Huntington','Morgantown','Parkersburg'],
    'Wisconsin': ['Milwaukee','Madison','Green Bay','Kenosha','Racine'],
    'Wyoming': ['Cheyenne','Casper','Laramie','Gillette'],
    'Washington D.C.': ['Washington D.C.'],
  },
  'United Kingdom': {
    'England': ['London','Birmingham','Leeds','Manchester','Sheffield','Liverpool','Bristol','Leicester','Coventry','Bradford','Nottingham','Newcastle','Reading','Oxford','Cambridge'],
    'Scotland': ['Edinburgh','Glasgow','Aberdeen','Dundee','Inverness','Perth','Stirling'],
    'Wales': ['Cardiff','Swansea','Newport','Wrexham','Bangor'],
    'Northern Ireland': ['Belfast','Londonderry','Lisburn','Newry','Armagh'],
  },
  'Australia': {
    'New South Wales': ['Sydney','Newcastle','Wollongong','Maitland','Coffs Harbour','Wagga Wagga'],
    'Victoria': ['Melbourne','Geelong','Ballarat','Bendigo','Shepparton','Mildura'],
    'Queensland': ['Brisbane','Gold Coast','Townsville','Cairns','Sunshine Coast','Toowoomba'],
    'South Australia': ['Adelaide','Mount Gambier','Whyalla','Port Augusta'],
    'Western Australia': ['Perth','Mandurah','Bunbury','Geraldton','Albany'],
    'Tasmania': ['Hobart','Launceston','Devonport','Burnie'],
    'Northern Territory': ['Darwin','Alice Springs','Palmerston','Katherine'],
    'Australian Capital Territory': ['Canberra','Belconnen','Tuggeranong'],
  },
  'Canada': {
    'Ontario': ['Toronto','Ottawa','Mississauga','Brampton','Hamilton','London','Markham','Kitchener','Windsor'],
    'Quebec': ['Montreal','Quebec City','Laval','Gatineau','Longueuil','Sherbrooke'],
    'British Columbia': ['Vancouver','Surrey','Burnaby','Richmond','Kelowna','Victoria','Abbotsford'],
    'Alberta': ['Calgary','Edmonton','Red Deer','Lethbridge','St. Albert','Medicine Hat'],
    'Manitoba': ['Winnipeg','Brandon','Steinbach','Thompson'],
    'Saskatchewan': ['Saskatoon','Regina','Prince Albert','Moose Jaw'],
    'Nova Scotia': ['Halifax','Dartmouth','Sydney','Truro'],
    'New Brunswick': ['Moncton','Saint John','Fredericton','Dieppe'],
    'Newfoundland and Labrador': ["St. John's",'Mount Pearl','Corner Brook'],
    'Prince Edward Island': ['Charlottetown','Summerside','Stratford'],
    'Northwest Territories': ['Yellowknife','Hay River','Inuvik'],
    'Yukon': ['Whitehorse','Dawson City'],
    'Nunavut': ['Iqaluit','Rankin Inlet'],
  },
  'Germany': {
    'Bavaria': ['Munich','Nuremberg','Augsburg','Regensburg','Ingolstadt','Würzburg'],
    'Baden-Württemberg': ['Stuttgart','Karlsruhe','Freiburg','Heidelberg','Mannheim'],
    'North Rhine-Westphalia': ['Cologne','Düsseldorf','Dortmund','Essen','Duisburg','Bochum','Wuppertal','Bonn'],
    'Hesse': ['Frankfurt','Wiesbaden','Kassel','Darmstadt'],
    'Lower Saxony': ['Hanover','Braunschweig','Oldenburg','Osnabrück','Wolfsburg'],
    'Saxony': ['Dresden','Leipzig','Chemnitz'],
    'Berlin': ['Berlin'],
    'Hamburg': ['Hamburg'],
    'Brandenburg': ['Potsdam','Cottbus'],
    'Rhineland-Palatinate': ['Mainz','Ludwigshafen','Koblenz','Trier'],
    'Saxony-Anhalt': ['Magdeburg','Halle'],
    'Thuringia': ['Erfurt','Jena','Gera','Weimar'],
    'Schleswig-Holstein': ['Kiel','Lübeck','Flensburg'],
    'Mecklenburg-Vorpommern': ['Schwerin','Rostock','Stralsund'],
    'Saarland': ['Saarbrücken','Neunkirchen'],
    'Bremen': ['Bremen','Bremerhaven'],
  },
  'France': {
    'Île-de-France': ['Paris','Versailles','Boulogne-Billancourt','Saint-Denis','Argenteuil'],
    'Auvergne-Rhône-Alpes': ['Lyon','Grenoble','Saint-Étienne','Clermont-Ferrand','Annecy'],
    'Nouvelle-Aquitaine': ['Bordeaux','Limoges','Poitiers','Pau','La Rochelle'],
    'Occitanie': ['Toulouse','Montpellier','Nîmes','Perpignan'],
    "Provence-Alpes-Côte d'Azur": ['Marseille','Nice','Toulon','Aix-en-Provence','Cannes'],
    'Grand Est': ['Strasbourg','Reims','Metz','Nancy','Mulhouse'],
    'Hauts-de-France': ['Lille','Amiens','Roubaix','Tourcoing'],
    'Normandie': ['Rouen','Caen','Le Havre','Cherbourg'],
    'Bretagne': ['Rennes','Brest','Quimper','Lorient'],
    'Pays de la Loire': ['Nantes','Le Mans','Angers'],
  },
  'United Arab Emirates': {
    'Abu Dhabi': ['Abu Dhabi City','Al Ain','Ruwais','Khalifa City','Yas Island'],
    'Dubai': ['Dubai City','Deira','Bur Dubai','Jumeirah','Business Bay','Downtown Dubai'],
    'Sharjah': ['Sharjah City','Khor Fakkan','Kalba'],
    'Ajman': ['Ajman City','Masfut'],
    'Ras Al Khaimah': ['Ras Al Khaimah City','Digdaga'],
    'Fujairah': ['Fujairah City','Dibba Al Fujairah'],
    'Umm Al Quwain': ['Umm Al Quwain City'],
  },
  'Singapore': {
    'Central Region': ['Singapore City','Orchard','Marina Bay','Raffles Place','Tanjong Pagar'],
    'East Region': ['Tampines','Bedok','Pasir Ris','Changi'],
    'North Region': ['Woodlands','Sembawang','Yishun'],
    'North-East Region': ['Hougang','Punggol','Sengkang','Ang Mo Kio'],
    'West Region': ['Jurong East','Jurong West','Bukit Batok','Clementi'],
  },
  'Japan': {
    'Tokyo': ['Tokyo','Shibuya','Shinjuku','Akihabara','Harajuku','Roppongi','Ginza'],
    'Osaka': ['Osaka City','Sakai','Toyonaka','Suita'],
    'Kanagawa': ['Yokohama','Kawasaki','Sagamihara','Fujisawa'],
    'Aichi': ['Nagoya','Toyota','Okazaki'],
    'Hokkaido': ['Sapporo','Asahikawa','Hakodate'],
    'Fukuoka': ['Fukuoka City','Kitakyushu','Kurume'],
    'Hyogo': ['Kobe','Himeji','Nishinomiya','Amagasaki'],
    'Kyoto': ['Kyoto City','Uji','Fushimi'],
  },
  'China': {
    'Beijing': ['Beijing City','Chaoyang','Haidian','Dongcheng'],
    'Shanghai': ['Shanghai City','Pudong','Xuhui','Changning','Minhang'],
    'Guangdong': ['Guangzhou','Shenzhen','Dongguan','Foshan','Zhuhai'],
    'Zhejiang': ['Hangzhou','Ningbo','Wenzhou','Jinhua'],
    'Jiangsu': ['Nanjing','Suzhou','Wuxi','Changzhou','Nantong'],
    'Sichuan': ['Chengdu','Mianyang','Leshan'],
    'Hubei': ['Wuhan','Yichang','Xiangyang'],
    'Shandong': ['Jinan','Qingdao','Zibo','Linyi'],
    'Chongqing': ['Chongqing City'],
    'Tianjin': ['Tianjin City'],
  },
  'South Africa': {
    'Gauteng': ['Johannesburg','Pretoria','Ekurhuleni','Soweto','Centurion','Sandton'],
    'Western Cape': ['Cape Town','Stellenbosch','George','Paarl'],
    'KwaZulu-Natal': ['Durban','Pietermaritzburg','Newcastle','Richards Bay'],
    'Eastern Cape': ['East London','Port Elizabeth','Mthatha'],
    'Limpopo': ['Polokwane','Tzaneen','Thohoyandou'],
    'Mpumalanga': ['Mbombela','Witbank','Secunda'],
    'North West': ['Rustenburg','Mahikeng','Klerksdorp'],
    'Free State': ['Bloemfontein','Welkom','Kroonstad'],
  },
  'Netherlands': {
    'North Holland': ['Amsterdam','Haarlem','Zaandam','Alkmaar'],
    'South Holland': ['The Hague','Rotterdam','Leiden','Delft','Dordrecht'],
    'North Brabant': ['Eindhoven','Tilburg','Breda'],
    'Utrecht': ['Utrecht','Amersfoort','Veenendaal'],
    'Gelderland': ['Nijmegen','Arnhem','Apeldoorn'],
  },
  'Sweden': {
    'Stockholm County': ['Stockholm','Södertälje','Nacka'],
    'Västra Götaland': ['Gothenburg','Mölndal','Borås','Trollhättan'],
    'Skåne': ['Malmö','Helsingborg','Lund','Kristianstad'],
    'Östergötland': ['Linköping','Norrköping'],
    'Uppsala': ['Uppsala','Enköping'],
  },
  'Ireland': {
    'Leinster': ['Dublin','Swords','Drogheda','Dundalk','Navan','Bray'],
    'Munster': ['Cork','Limerick','Waterford','Killarney','Tralee'],
    'Connacht': ['Galway','Sligo','Castlebar','Ballina'],
    'Ulster': ['Donegal','Monaghan','Cavan'],
  },
  'New Zealand': {
    'Auckland Region': ['Auckland','Manukau','North Shore','Waitakere'],
    'Wellington Region': ['Wellington','Lower Hutt','Upper Hutt','Porirua'],
    'Canterbury Region': ['Christchurch','Timaru','Ashburton'],
    'Waikato Region': ['Hamilton','Cambridge','Te Awamutu'],
    'Otago Region': ['Dunedin','Queenstown','Invercargill'],
  },
  'Malaysia': {
    'Kuala Lumpur': ['Kuala Lumpur City','Chow Kit','Bukit Bintang','Bangsar'],
    'Selangor': ['Petaling Jaya','Shah Alam','Klang','Subang Jaya'],
    'Penang': ['George Town','Butterworth','Bukit Mertajam'],
    'Johor': ['Johor Bahru','Skudai','Pasir Gudang'],
    'Sarawak': ['Kuching','Miri','Sibu'],
    'Sabah': ['Kota Kinabalu','Sandakan','Tawau'],
    'Perak': ['Ipoh','Taiping','Teluk Intan'],
  },
  'Indonesia': {
    'DKI Jakarta': ['Jakarta Pusat','Jakarta Selatan','Jakarta Utara','Jakarta Barat','Jakarta Timur'],
    'West Java': ['Bandung','Bekasi','Bogor','Depok'],
    'East Java': ['Surabaya','Malang','Sidoarjo','Gresik'],
    'Central Java': ['Semarang','Solo','Yogyakarta','Magelang'],
    'Bali': ['Denpasar','Badung','Gianyar','Tabanan'],
  },
  'Philippines': {
    'Metro Manila': ['Manila','Quezon City','Makati','Taguig','Pasig','Caloocan','Pasay'],
    'Cebu': ['Cebu City','Mandaue','Lapu-Lapu'],
    'Davao': ['Davao City','Tagum','Digos'],
    'Central Luzon': ['Angeles','San Fernando','Olongapo','Cabanatuan'],
  },
  'Pakistan': {
    'Punjab': ['Lahore','Faisalabad','Rawalpindi','Gujranwala','Multan','Sialkot'],
    'Sindh': ['Karachi','Hyderabad','Sukkur','Larkana'],
    'Khyber Pakhtunkhwa': ['Peshawar','Mardan','Abbottabad'],
    'Balochistan': ['Quetta','Turbat','Gwadar'],
    'Islamabad Capital Territory': ['Islamabad'],
  },
  'Bangladesh': {
    'Dhaka Division': ['Dhaka','Narayanganj','Gazipur'],
    'Chittagong Division': ['Chittagong','Comilla','Noakhali'],
    'Rajshahi Division': ['Rajshahi','Bogura','Pabna'],
    'Khulna Division': ['Khulna','Jessore','Satkhira'],
    'Sylhet Division': ['Sylhet','Moulvibazar','Habiganj'],
  },
  'Sri Lanka': {
    'Western Province': ['Colombo','Sri Jayawardenepura Kotte','Gampaha','Negombo'],
    'Central Province': ['Kandy','Matale','Nuwara Eliya'],
    'Southern Province': ['Galle','Matara','Hambantota'],
    'Northern Province': ['Jaffna','Vavuniya','Mannar'],
  },
  'Kenya': {
    'Nairobi': ['Nairobi City','Westlands','Eastleigh','Karen'],
    'Mombasa': ['Mombasa City','Mvita','Likoni'],
    'Kisumu': ['Kisumu City','Kondele'],
    'Nakuru': ['Nakuru City','Naivasha'],
  },
  'Nigeria': {
    'Lagos': ['Lagos City','Ikeja','Victoria Island','Lekki','Surulere'],
    'Abuja FCT': ['Abuja','Garki','Wuse','Maitama'],
    'Rivers': ['Port Harcourt','Obio-Akpor'],
    'Kano': ['Kano City','Fagge','Dala'],
    'Oyo': ['Ibadan','Ogbomoso'],
  },
  'Brazil': {
    'São Paulo': ['São Paulo City','Campinas','Guarulhos','Santos','Ribeirão Preto','Sorocaba'],
    'Rio de Janeiro': ['Rio de Janeiro City','Niterói','Nova Iguaçu','Duque de Caxias'],
    'Minas Gerais': ['Belo Horizonte','Uberlândia','Contagem','Juiz de Fora'],
    'Bahia': ['Salvador','Feira de Santana','Vitória da Conquista'],
    'Paraná': ['Curitiba','Londrina','Maringá'],
    'Rio Grande do Sul': ['Porto Alegre','Caxias do Sul','Canoas'],
  },
};

export const COUNTRIES = Object.keys(GEO_DATA).sort();

/* ─────────────────────────────────────────────────────────
   STANDARD DROPDOWN DATASETS
───────────────────────────────────────────────────────── */
export const DROPDOWN_DATA = {
  industries: [
    'IT Services','SaaS / Software','Cloud Services','Cybersecurity','FinTech',
    'Finance & Banking','Insurance','Healthcare','Pharmaceuticals',
    'Manufacturing','Automotive','Aerospace & Defense',
    'Education','E-Learning','Government / Public Sector',
    'Telecom','Media & Entertainment','E-commerce / Retail',
    'Logistics & Supply Chain','Energy & Utilities','Oil & Gas',
    'Hospitality & Tourism','Real Estate','Construction',
    'Legal Services','Consulting','Non-Profit / NGO','Other',
  ],
  companySizes: ['1–10','11–50','51–200','201–500','501–1,000','1,000–5,000','5,000+'],
  businessTypes: ['Private Limited','Public Limited','Partnership','LLP','Sole Proprietorship','Government','Non-Profit','Trust','Other'],
  contractTypes: ['Monthly','Quarterly','Semi-Annual','Annual','Multi-Year','Custom'],
  subscriptionPlans: ['Starter','Professional','Enterprise','Custom / Enterprise+'],
  timezones: [
    'UTC','UTC-12 (IDLW)','UTC-11 (SST)','UTC-10 (HST)','UTC-9 (AKST)','UTC-8 (PST)',
    'UTC-7 (MST)','UTC-6 (CST)','UTC-5 (EST)','UTC-4 (AST)','UTC-3 (BRT)',
    'UTC-2','UTC-1 (CVT)','UTC+0 (GMT/WET)','UTC+1 (CET)','UTC+2 (EET)',
    'UTC+3 (MSK)','UTC+3:30 (IRST)','UTC+4 (GST)','UTC+4:30 (AFT)',
    'UTC+5 (PKT)','UTC+5:30 (IST)','UTC+5:45 (NPT)','UTC+6 (BST)',
    'UTC+6:30 (MMT)','UTC+7 (WIB)','UTC+8 (SGT/HKT/CST)','UTC+9 (JST/KST)',
    'UTC+9:30 (ACST)','UTC+10 (AEST)','UTC+10:30 (LHST)','UTC+11 (SBT)',
    'UTC+12 (NZST)','UTC+13 (NZDT)','UTC+14 (LINT)',
  ],
  languages: [
    'English','Hindi','Spanish','French','German','Portuguese','Arabic','Chinese (Mandarin)',
    'Japanese','Korean','Italian','Russian','Dutch','Swedish','Norwegian','Danish',
    'Finnish','Polish','Turkish','Vietnamese','Thai','Malay','Indonesian','Tagalog',
    'Bengali','Urdu','Tamil','Telugu','Kannada','Gujarati','Marathi','Punjabi',
  ],
  currencies: [
    { code:'USD', symbol:'$',    label:'USD — US Dollar',          rate:1.0 },
    { code:'EUR', symbol:'€',    label:'EUR — Euro',               rate:0.894 },
    { code:'GBP', symbol:'£',    label:'GBP — British Pound',      rate:0.787 },
    { code:'INR', symbol:'₹',    label:'INR — Indian Rupee',       rate:94.596 },
    { code:'AED', symbol:'د.إ', label:'AED — UAE Dirham',         rate:3.6725 },
    { code:'AUD', symbol:'A$',   label:'AUD — Australian Dollar',  rate:1.557 },
    { code:'CAD', symbol:'C$',   label:'CAD — Canadian Dollar',    rate:1.362 },
    { code:'SGD', symbol:'S$',   label:'SGD — Singapore Dollar',   rate:1.298 },
    { code:'JPY', symbol:'¥',    label:'JPY — Japanese Yen',       rate:149.5 },
    { code:'CNY', symbol:'¥',    label:'CNY — Chinese Yuan',       rate:7.24 },
    { code:'BRL', symbol:'R$',   label:'BRL — Brazilian Real',     rate:4.97 },
    { code:'ZAR', symbol:'R',    label:'ZAR — South African Rand', rate:18.6 },
    { code:'MYR', symbol:'RM',   label:'MYR — Malaysian Ringgit',  rate:4.68 },
    { code:'IDR', symbol:'Rp',   label:'IDR — Indonesian Rupiah',  rate:15800 },
  ],
  paymentMethods: ['Bank Transfer','Wire Transfer','UPI','Credit Card','Debit Card','Cheque','PayPal','Stripe','Razorpay','NEFT','RTGS','IMPS','SWIFT','ACH','Other'],
  invoiceStatuses: ['Draft','Sent','Viewed','Paid','Partially Paid','Overdue','Cancelled'],
  contractStatuses: ['Draft','Active','Pending Renewal','Renewed','Expired','Terminated'],
  billingFrequencies: ['Monthly','Quarterly','Semi-Annual','Annual'],
  userRoles: ['Super Admin','Admin','Manager','Analyst','Viewer','vCISO','Auditor','Compliance Officer','IT Manager','Board Director','Partner','Client'],
  departments: ['IT','Security','Compliance','Finance','HR','Legal','Operations','Engineering','Sales','Marketing','Customer Success','Executive'],
  designations: ['CEO','CTO','CISO','CFO','COO','VP Engineering','VP Security','Director IT','IT Manager','Security Analyst','Compliance Manager','DevOps Engineer','Network Engineer','Software Engineer','Project Manager','Business Analyst','Other'],
  riskLevels: ['Critical','High','Medium','Low','Informational'],
  riskCategories: ['Operational','Technical','Compliance','Financial','Strategic','Reputational','Third Party','Physical','Human','Data Privacy'],
  assetTypes: ['Server','Workstation','Laptop','Mobile Device','Network Device','Firewall','Router','Switch','Database','Application','Cloud Service','IoT Device','Printer','Storage','Virtual Machine','Container','API','Other'],
  operatingSystems: ['Windows Server 2022','Windows Server 2019','Windows Server 2016','Windows 11','Windows 10','Ubuntu 22.04 LTS','Ubuntu 20.04 LTS','CentOS 7','RHEL 8','RHEL 9','Debian 12','macOS Ventura','macOS Monterey','Android','iOS','Other'],
  cloudProviders: ['AWS','Microsoft Azure','Google Cloud','IBM Cloud','Oracle Cloud','Alibaba Cloud','Linode / Akamai','DigitalOcean','Rackspace','VMware','On-Premise','Hybrid','Other'],
  vendorCategories: ['Cloud Provider','Security Vendor','Software Vendor','Hardware Vendor','Telecom','Managed Services','Consulting','Legal','Financial','HR & Payroll','Other'],
  integrationTypes: ['API','Webhook','SIEM Integration','SSO / SAML','Active Directory','LDAP','REST API','GraphQL','Database Connector','File Transfer (SFTP)','Other'],
  complianceFrameworks: ['ISO 27001','SOC 2 Type II','GDPR','HIPAA','PCI DSS','NIST CSF','NIST 800-53','CIS Controls','DPDP (India)','RBI IT Framework','SEBI Cybersecurity','IRDAI Guidelines','CERT-In Compliance','ISO 22301','FedRAMP','CMMC','CSA STAR','Other'],
  securityModules: ['Asset Management','Risk Management','Vulnerability Management','Compliance Management','Incident Response','Threat Intelligence','Vendor Risk Management','Security Awareness','SIEM / Log Management','Endpoint Security','Network Security','Application Security','Cloud Security','Data Loss Prevention','Identity & Access Management','Other'],
};

/* ─────────────────────────────────────────────────────────
   SEARCHABLE SELECT COMPONENT (inline-styles, no Tailwind)
───────────────────────────────────────────────────────── */
export function SearchableSelect({
  value, onChange, options = [], placeholder = '— Select —',
  disabled = false, clearable = true, style = {}, id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Support both string[] and {value, label}[]
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const filtered = query
    ? normalised.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalised;

  const displayLabel = value
    ? (normalised.find(o => o.value === value)?.label || value)
    : null;

  function select(val) { onChange(val); setOpen(false); setQuery(''); }
  function clear(e) { e.stopPropagation(); onChange(''); setOpen(false); }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <div
        id={id}
        onClick={() => { if (!disabled) { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); } }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', fontSize: '13px',
          border: `1px solid ${open ? DC.purple : DC.border}`,
          borderRadius: th('2px', { classic: '8px', dark: '8px' }), background: disabled ? DC.bg : th('white', { dark: '#1E293B' }),
          color: displayLabel ? DC.ink : DC.muted,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          boxShadow: open ? `0 0 0 3px ${DC.purple}18` : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          minHeight: '38px', boxSizing: 'border-box', userSelect: 'none',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {clearable && value && !disabled && (
            <span
              onClick={clear}
              style={{ fontSize: '14px', color: DC.muted, lineHeight: 1, padding: '0 2px', cursor: 'pointer' }}
              title="Clear"
            >✕</span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DC.muted} strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: DC.card, border: `1px solid ${DC.border}`, borderRadius: th('2px', { classic: '10px', dark: '10px' }),
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px', borderBottom: `1px solid ${DC.border}` }}>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && filtered.length === 1) select(filtered[0].value);
              }}
              style={{
                width: '100%', padding: '7px 10px', fontSize: '13px',
                border: `1px solid ${DC.border}`, borderRadius: th('2px', { classic: '6px', dark: '6px' }),
                background: DC.bg, color: DC.ink, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Options list */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '12px 14px', fontSize: '13px', color: DC.muted }}>No results found</div>
              : filtered.map(opt => (
                <div
                  key={opt.value}
                  onMouseDown={() => select(opt.value)}
                  style={{
                    padding: '9px 14px', fontSize: '13px', cursor: 'pointer',
                    background: opt.value === value ? DC.purpleL : 'transparent',
                    color: opt.value === value ? DC.purple : DC.ink,
                    fontWeight: opt.value === value ? 700 : 400,
                    borderBottom: `1px solid ${DC.border}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = DC.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = opt.value === value ? DC.purpleL : 'transparent'; }}
                >
                  {opt.label}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LOCATION CASCADE  (Country → State → City)
───────────────────────────────────────────────────────── */
export function LocationCascade({
  country, state, city,
  onCountryChange, onStateChange, onCityChange,
  labelStyle = {}, rowStyle = {},
  compact = false, // true = single row, false = stacked labels
}) {
  const stateOptions = country ? Object.keys(GEO_DATA[country] || {}).sort() : [];
  const cityOptions  = (country && state) ? (GEO_DATA[country]?.[state] || []).sort() : [];

  const gap = compact ? '8px' : '12px';
  const grid = compact
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap }
    : { display: 'flex', flexDirection: 'column', gap };

  const lbl = {
    fontSize: '12px', fontWeight: 700, color: th('#64748b', { dark: '#94A3B8' }),
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px',
    ...labelStyle,
  };

  function handleCountry(v) {
    onCountryChange(v);
    onStateChange && onStateChange('');
    onCityChange && onCityChange('');
  }
  function handleState(v) {
    onStateChange(v);
    onCityChange && onCityChange('');
  }

  return (
    <div style={{ ...grid, ...rowStyle }}>
      <div>
        {!compact && <div style={lbl}>Country</div>}
        <SearchableSelect
          value={country} onChange={handleCountry}
          options={COUNTRIES} placeholder="Select Country"
        />
      </div>
      <div>
        {!compact && <div style={lbl}>State / Province</div>}
        <SearchableSelect
          value={state} onChange={handleState}
          options={stateOptions}
          placeholder={country ? 'Select State' : 'Select country first'}
          disabled={!country || stateOptions.length === 0}
        />
      </div>
      <div>
        {!compact && <div style={lbl}>City</div>}
        <SearchableSelect
          value={city} onChange={v => onCityChange && onCityChange(v)}
          options={cityOptions}
          placeholder={state ? 'Select City' : 'Select state first'}
          disabled={!state || cityOptions.length === 0}
        />
      </div>
    </div>
  );
}

export default { SearchableSelect, LocationCascade, GEO_DATA, COUNTRIES, DROPDOWN_DATA };
