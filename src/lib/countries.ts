export type Country = {
  code: string;
  name: { en: string; fr: string };
  currency: string;
  phoneCode: string;
};

export const COUNTRIES: Country[] = [
  { code: "DZ", name: { en: "Algeria", fr: "Algérie" }, currency: "DZD", phoneCode: "+213" },
  { code: "AO", name: { en: "Angola", fr: "Angola" }, currency: "AOA", phoneCode: "+244" },
  { code: "BJ", name: { en: "Benin", fr: "Bénin" }, currency: "XOF", phoneCode: "+229" },
  { code: "BW", name: { en: "Botswana", fr: "Botswana" }, currency: "BWP", phoneCode: "+267" },
  { code: "BF", name: { en: "Burkina Faso", fr: "Burkina Faso" }, currency: "XOF", phoneCode: "+226" },
  { code: "BI", name: { en: "Burundi", fr: "Burundi" }, currency: "BIF", phoneCode: "+257" },
  { code: "CM", name: { en: "Cameroon", fr: "Cameroun" }, currency: "XAF", phoneCode: "+237" },
  { code: "CA", name: { en: "Canada", fr: "Canada" }, currency: "CAD", phoneCode: "+1" },
  { code: "CF", name: { en: "Central African Republic", fr: "République centrafricaine" }, currency: "XAF", phoneCode: "+236" },
  { code: "TD", name: { en: "Chad", fr: "Tchad" }, currency: "XAF", phoneCode: "+235" },
  { code: "CD", name: { en: "DR Congo", fr: "RD Congo" }, currency: "CDF", phoneCode: "+243" },
  { code: "CG", name: { en: "Congo", fr: "Congo" }, currency: "XAF", phoneCode: "+242" },
  { code: "CI", name: { en: "Côte d'Ivoire", fr: "Côte d'Ivoire" }, currency: "XOF", phoneCode: "+225" },
  { code: "EG", name: { en: "Egypt", fr: "Égypte" }, currency: "EGP", phoneCode: "+20" },
  { code: "ET", name: { en: "Ethiopia", fr: "Éthiopie" }, currency: "ETB", phoneCode: "+251" },
  { code: "FR", name: { en: "France", fr: "France" }, currency: "EUR", phoneCode: "+33" },
  { code: "GA", name: { en: "Gabon", fr: "Gabon" }, currency: "XAF", phoneCode: "+241" },
  { code: "GH", name: { en: "Ghana", fr: "Ghana" }, currency: "GHS", phoneCode: "+233" },
  { code: "GN", name: { en: "Guinea", fr: "Guinée" }, currency: "GNF", phoneCode: "+224" },
  { code: "KE", name: { en: "Kenya", fr: "Kenya" }, currency: "KES", phoneCode: "+254" },
  { code: "MG", name: { en: "Madagascar", fr: "Madagascar" }, currency: "MGA", phoneCode: "+261" },
  { code: "ML", name: { en: "Mali", fr: "Mali" }, currency: "XOF", phoneCode: "+223" },
  { code: "MA", name: { en: "Morocco", fr: "Maroc" }, currency: "MAD", phoneCode: "+212" },
  { code: "MZ", name: { en: "Mozambique", fr: "Mozambique" }, currency: "MZN", phoneCode: "+258" },
  { code: "NE", name: { en: "Niger", fr: "Niger" }, currency: "XOF", phoneCode: "+227" },
  { code: "NG", name: { en: "Nigeria", fr: "Nigéria" }, currency: "NGN", phoneCode: "+234" },
  { code: "RW", name: { en: "Rwanda", fr: "Rwanda" }, currency: "RWF", phoneCode: "+250" },
  { code: "SN", name: { en: "Senegal", fr: "Sénégal" }, currency: "XOF", phoneCode: "+221" },
  { code: "ZA", name: { en: "South Africa", fr: "Afrique du Sud" }, currency: "ZAR", phoneCode: "+27" },
  { code: "TZ", name: { en: "Tanzania", fr: "Tanzanie" }, currency: "TZS", phoneCode: "+255" },
  { code: "TG", name: { en: "Togo", fr: "Togo" }, currency: "XOF", phoneCode: "+228" },
  { code: "TN", name: { en: "Tunisia", fr: "Tunisie" }, currency: "TND", phoneCode: "+216" },
  { code: "UG", name: { en: "Uganda", fr: "Ouganda" }, currency: "UGX", phoneCode: "+256" },
  { code: "US", name: { en: "United States", fr: "États-Unis" }, currency: "USD", phoneCode: "+1" },
  { code: "GB", name: { en: "United Kingdom", fr: "Royaume-Uni" }, currency: "GBP", phoneCode: "+44" },
  { code: "ZM", name: { en: "Zambia", fr: "Zambie" }, currency: "ZMW", phoneCode: "+260" },
  { code: "ZW", name: { en: "Zimbabwe", fr: "Zimbabwe" }, currency: "ZWL", phoneCode: "+263" },
];

export const getCurrencyByCountry = (countryCode: string): string => {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country?.currency || "USD";
};
