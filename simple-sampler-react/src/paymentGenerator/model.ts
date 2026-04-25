export type CompanyEntity = {
  Name: string;
  Address: string;
  Country: string; // ISO2 country code
};

export type PersonEntity = {
  Id: string;
  Locality: string; // Latvia, Lithuania, Estonia, Russia
  Type: string;
  Value: string;
};

// Generate list of payment files 
// Download each
// Download all zip
// Download all (files)
// Preview each
// Modify in preview
//
// Payment builder and generator navigation through left sidebar
