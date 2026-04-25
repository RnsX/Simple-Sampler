// ---- Core primitives ----
type BIC = string;      // ISO 9362
type IBAN = string;     // ISO 13616
type Currency = "EUR";  // SCT Inst is EUR-only

// ---- Address ----
interface PostalAddress {
  address?: string;
  streetName?: string;
  buildingNumber?: string;
  postCode?: string;
  townName?: string;
  countrySubDivision?: string;
  country: string; // ISO 3166-1 alpha-2
  addressLine?: string[];
}

// ---- Party ----
interface PartyIdentification {
  name: string;
  iban?: IBAN;
  bic?: BIC;
  postalAddress?: PostalAddress;

  // Optional identification
  organisationId?: {
    bicOrBei?: string;
    lei?: string;
    otherId?: string;
  };

  privateId?: {
    dateOfBirth?: string;
    countryOfBirth?: string;
    otherId?: string;
  };
}

// ---- Account ----
interface CashAccount {
  iban: IBAN;
  currency?: Currency;
}

// ---- Agent (Bank) ----
interface FinancialInstitution {
  bic: BIC;
  clearingSystemMemberId?: string;
  name?: string;
}

// ---- Amount ----
interface Amount {
  instructedAmount: {
    currency: Currency;
    amount: number;
  };
}

// ---- Remittance ----
interface StructuredRemittance {
  creditorReference?: string; // RF reference
  additionalRemittanceInformation?: string;
}

interface RemittanceInformation {
  unstructured?: string[]; // max 140 chars each
  structured?: StructuredRemittance[];
}

// ---- Charges ----
type ChargeBearer = "SLEV"; // mandatory in SEPA

// ---- Regulatory ----
interface RegulatoryReporting {
  details?: string[];
}

// ---- Main SCT Inst payment object ----
export interface SepaInstantPayment {
  // --- Header ---
  messageId: string;
  creationDateTime: string; // ISO datetime
  numberOfTransactions: number;
  controlSum: number;

  // --- Payment Information ---
  paymentInformationId: string;
  paymentMethod: "TRF";
  serviceLevel: "SEPA";
  localInstrument: "INST"; 
  categoryPurpose?: string;

  requestedExecutionDateTime: string;  // should be immmediate

  // --- Debtor ---
  debtor: PartyIdentification;
  debtorAccount: CashAccount;
  debtorAgent: FinancialInstitution;

  // --- Ultimate Debtor ---
  ultimateDebtor?: PartyIdentification;

  // --- Creditor ---
  creditor: PartyIdentification;
  creditorAccount: CashAccount;
  creditorAgent: FinancialInstitution;

  // --- Ultimate Creditor ---
  ultimateCreditor?: PartyIdentification;

  // --- Transaction ---
  amount: Amount;
  chargeBearer: ChargeBearer;

  // --- Purpose ---
  purposeCode?: string;

  // --- Remittance ---
  remittanceInformation?: RemittanceInformation;

  // --- Regulatory ---
  regulatoryReporting?: RegulatoryReporting;

  // --- Additional SCT Inst specifics ---
  instructionId: string;
  endToEndId: string;
  transactionId?: string;

  // --- Timing / SLA ---
  settlementPriority?: "HIGH"; 
}
