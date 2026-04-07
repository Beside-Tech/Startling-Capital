export type CountryRegion = {
  name: string;
  code: string;
  regions: string[];
};

export const COUNTRIES_WITH_REGIONS: CountryRegion[] = [
  {
    name: "Australia",
    code: "AU",
    regions: [
      "Australian Capital Territory", "New South Wales", "Northern Territory",
      "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia",
    ],
  },
  {
    name: "Brazil",
    code: "BR",
    regions: [
      "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
      "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
      "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará",
      "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
      "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
      "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
    ],
  },
  {
    name: "Canada",
    code: "CA",
    regions: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
      "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
    ],
  },
  {
    name: "China",
    code: "CN",
    regions: [
      "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong",
      "Guangxi", "Guizhou", "Hainan", "Hebei", "Heilongjiang", "Henan",
      "Hong Kong", "Hubei", "Hunan", "Inner Mongolia", "Jiangsu",
      "Jiangxi", "Jilin", "Liaoning", "Macau", "Ningxia", "Qinghai",
      "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan", "Tianjin",
      "Tibet", "Xinjiang", "Yunnan", "Zhejiang",
    ],
  },
  {
    name: "Ethiopia",
    code: "ET",
    regions: [
      "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz",
      "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama",
      "Somali", "South Ethiopia", "Southwest Ethiopia", "Tigray",
    ],
  },
  {
    name: "Ghana",
    code: "GH",
    regions: [
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern",
      "Greater Accra", "North East", "Northern", "Oti", "Savannah",
      "Upper East", "Upper West", "Volta", "Western", "Western North",
    ],
  },
  {
    name: "India",
    code: "IN",
    regions: [
      "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
      "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli",
      "Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
      "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
      "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
      "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
      "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
      "Uttar Pradesh", "Uttarakhand", "West Bengal",
    ],
  },
  {
    name: "Kenya",
    code: "KE",
    regions: [
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet",
      "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
      "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga",
      "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia",
      "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit",
      "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
      "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
      "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River",
      "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu",
      "Vihiga", "Wajir", "West Pokot",
    ],
  },
  {
    name: "Mexico",
    code: "MX",
    regions: [
      "Aguascalientes", "Baja California", "Baja California Sur",
      "Campeche", "Chiapas", "Chihuahua", "Ciudad de México",
      "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero",
      "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos",
      "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
      "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
      "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
    ],
  },
  {
    name: "Nigeria",
    code: "NG",
    regions: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
      "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
      "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa",
      "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
      "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
      "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ],
  },
  {
    name: "Rwanda",
    code: "RW",
    regions: ["Kigali City", "Northern Province", "Southern Province", "Eastern Province", "Western Province"],
  },
  {
    name: "Senegal",
    code: "SN",
    regions: [
      "Dakar", "Diourbel", "Fatick", "Kaffrine", "Kaolack",
      "Kédougou", "Kolda", "Louga", "Matam", "Saint-Louis",
      "Sédhiou", "Tambacounda", "Thiès", "Ziguinchor",
    ],
  },
  {
    name: "South Africa",
    code: "ZA",
    regions: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
      "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
    ],
  },
  {
    name: "Tanzania",
    code: "TZ",
    regions: [
      "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa",
      "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi",
      "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara",
      "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani",
      "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida",
      "Songwe", "Tabora", "Tanga", "Zanzibar Central", "Zanzibar North",
      "Zanzibar South",
    ],
  },
  {
    name: "Uganda",
    code: "UG",
    regions: [
      "Bugisu", "Bukedi", "Bunyoro", "Busoga", "Central Region",
      "Eastern Region", "Elgon", "Karamoja", "Kigezi", "Lango",
      "Northern Region", "Rwenzori", "Sebei", "Toro", "Teso", "West Nile",
    ],
  },
  {
    name: "United Kingdom",
    code: "GB",
    regions: [
      "England", "Scotland", "Wales", "Northern Ireland",
      "London", "South East", "North West", "South West",
      "East of England", "West Midlands", "East Midlands",
      "Yorkshire and The Humber", "North East",
    ],
  },
  {
    name: "United States",
    code: "US",
    regions: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
      "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
      "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
      "New Hampshire", "New Jersey", "New Mexico", "New York",
      "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
      "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
      "Washington", "West Virginia", "Wisconsin", "Wyoming",
      "District of Columbia",
    ],
  },
  {
    name: "Zambia",
    code: "ZM",
    regions: [
      "Central", "Copperbelt", "Eastern", "Luapula", "Lusaka",
      "Muchinga", "North-Western", "Northern", "Southern", "Western",
    ],
  },
  {
    name: "Zimbabwe",
    code: "ZW",
    regions: [
      "Bulawayo", "Harare", "Manicaland", "Mashonaland Central",
      "Mashonaland East", "Mashonaland West", "Masvingo", "Matabeleland North",
      "Matabeleland South", "Midlands",
    ],
  },
];

const OTHER_COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Central African Republic", "Chad",
  "Chile", "Colombia", "Comoros", "Congo (Brazzaville)", "Congo (DRC)",
  "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Fiji", "Finland", "Gabon",
  "Gambia", "Georgia", "Germany", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kiribati", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives",
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "United Arab Emirates",
  "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam",
  "Yemen",
];

export const ALL_COUNTRIES: CountryRegion[] = [
  ...COUNTRIES_WITH_REGIONS,
  ...OTHER_COUNTRIES.map((name) => ({ name, code: name.slice(0, 2).toUpperCase(), regions: [] })),
].sort((a, b) => a.name.localeCompare(b.name));

export function getCountryByName(name: string): CountryRegion | undefined {
  return ALL_COUNTRIES.find((c) => c.name === name);
}

export function getRegionsForCountry(countryName: string): string[] {
  return getCountryByName(countryName)?.regions ?? [];
}
