import type { SepaInstantPayment } from "../SEPA/SEPA.ts";

export type BuilderState = {
  messageId: string;
  creationDateTime: string;
  paymentInformationId: string;
  requestedExecutionDateTime: string;
  categoryPurpose: string;
  purposeCode: string;
  instructionId: string;
  endToEndId: string;
  transactionId: string;
  amount: string;
  debtorName: string;
  debtorAddress: string;
  debtorIban: string;
  debtorBic: string;
  debtorCountry: string;
  creditorName: string;
  creditorAddress: string;
  creditorIban: string;
  creditorBic: string;
  creditorCountry: string;
  remittanceLine: string;
  creditorReference: string;
  additionalRemittanceInformation: string;
  regulatoryDetails: string;
  includeCategoryPurpose: boolean;
  includePurposeCode: boolean;
  includeTransactionId: boolean;
  includeStructuredRemittance: boolean;
  includeRegulatoryReporting: boolean;
  settlementPriority: boolean;
};

export const initialDateTime = new Date().toISOString().slice(0, 16);

export function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function randomizeIbanNumbers(value: string): string {
  return value.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
}

export function randomIban(countryCode: string, digitCount = 18): string {
  const safeCountry = (countryCode || "LV").toUpperCase().slice(0, 2);
  const digits = Array.from({ length: digitCount }, () =>
    String(Math.floor(Math.random() * 10)),
  ).join("");

  return `${safeCountry}${digits}`;
}

export function defaultBicForCountry(countryCode: string): string {
  const safeCountry = (countryCode || "LV").toUpperCase().slice(0, 2);
  return `BANK${safeCountry}XX`;
}

export const initialBuilderState: BuilderState = {
  messageId: "MSG-20260425-001",
  creationDateTime: initialDateTime,
  paymentInformationId: "PMT-20260425-001",
  requestedExecutionDateTime: initialDateTime,
  categoryPurpose: "",
  purposeCode: "",
  instructionId: "INSTR-20260425-001",
  endToEndId: "E2E-20260425-001",
  transactionId: "",
  amount: "125.00",
  debtorName: "Simple Sampler GmbH",
  debtorAddress: "",
  debtorIban: "DE89370400440532013000",
  debtorBic: "DEUTDEFF",
  debtorCountry: "DE",
  creditorName: "Nordic Supplies SIA",
  creditorAddress: "",
  creditorIban: "LV80BANK0000435195001",
  creditorBic: "BANKLV22",
  creditorCountry: "LV",
  remittanceLine: "Invoice 2026-041",
  creditorReference: "",
  additionalRemittanceInformation: "",
  regulatoryDetails: "",
  includeCategoryPurpose: false,
  includePurposeCode: false,
  includeTransactionId: false,
  includeStructuredRemittance: false,
  includeRegulatoryReporting: false,
  settlementPriority: true,
};

export function toIsoDateTime(localDateTime: string): string {
  if (!localDateTime) {
    return new Date().toISOString();
  }

  return new Date(localDateTime).toISOString();
}

export function toLocalDateTime(value?: string): string {
  if (!value) {
    return initialDateTime;
  }

  return new Date(value).toISOString().slice(0, 16);
}

export function compactXml(xml: string): string {
  return xml
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .join("\n");
}

export function paymentToState(payment: SepaInstantPayment): BuilderState {
  return {
    messageId: payment.messageId,
    creationDateTime: toLocalDateTime(payment.creationDateTime),
    paymentInformationId: payment.paymentInformationId,
    requestedExecutionDateTime: toLocalDateTime(payment.requestedExecutionDateTime),
    categoryPurpose: payment.categoryPurpose ?? "",
    purposeCode: payment.purposeCode ?? "",
    instructionId: payment.instructionId,
    endToEndId: payment.endToEndId,
    transactionId: payment.transactionId ?? "",
    amount: String(payment.amount.instructedAmount.amount),
    debtorName: payment.debtor.name,
    debtorAddress: payment.debtor.postalAddress?.address ?? "",
    debtorIban: payment.debtorAccount.iban,
    debtorBic: payment.debtorAgent.bic,
    debtorCountry: payment.debtor.postalAddress?.country ?? "",
    creditorName: payment.creditor.name,
    creditorAddress: payment.creditor.postalAddress?.address ?? "",
    creditorIban: payment.creditorAccount.iban,
    creditorBic: payment.creditorAgent.bic,
    creditorCountry: payment.creditor.postalAddress?.country ?? "",
    remittanceLine: payment.remittanceInformation?.unstructured?.[0] ?? "",
    creditorReference:
      payment.remittanceInformation?.structured?.[0]?.creditorReference ?? "",
    additionalRemittanceInformation:
      payment.remittanceInformation?.structured?.[0]?.additionalRemittanceInformation ?? "",
    regulatoryDetails: payment.regulatoryReporting?.details?.join("\n") ?? "",
    includeCategoryPurpose: Boolean(payment.categoryPurpose),
    includePurposeCode: Boolean(payment.purposeCode),
    includeTransactionId: Boolean(payment.transactionId),
    includeStructuredRemittance: Boolean(payment.remittanceInformation?.structured?.length),
    includeRegulatoryReporting: Boolean(payment.regulatoryReporting?.details?.length),
    settlementPriority: payment.settlementPriority === "HIGH",
  };
}

export function buildPayment(state: BuilderState): SepaInstantPayment {
  const amount = Number.parseFloat(state.amount);
  const hasStructuredRemittance =
    state.includeStructuredRemittance &&
    Boolean(state.creditorReference || state.additionalRemittanceInformation);
  const hasRegulatoryDetails =
    state.includeRegulatoryReporting && Boolean(state.regulatoryDetails.trim());

  return {
    messageId: state.messageId,
    creationDateTime: toIsoDateTime(state.creationDateTime),
    numberOfTransactions: 1,
    controlSum: Number.isFinite(amount) ? amount : 0,
    paymentInformationId: state.paymentInformationId,
    paymentMethod: "TRF",
    serviceLevel: "SEPA",
    localInstrument: "INST",
    categoryPurpose: state.includeCategoryPurpose
      ? state.categoryPurpose || undefined
      : undefined,
    requestedExecutionDateTime: toIsoDateTime(state.requestedExecutionDateTime),
    debtor: {
      name: state.debtorName,
      postalAddress: {
        address: state.debtorAddress || undefined,
        country: state.debtorCountry,
      },
    },
    debtorAccount: {
      iban: state.debtorIban,
      currency: "EUR",
    },
    debtorAgent: {
      bic: state.debtorBic,
    },
    creditor: {
      name: state.creditorName,
      postalAddress: {
        address: state.creditorAddress || undefined,
        country: state.creditorCountry,
      },
    },
    creditorAccount: {
      iban: state.creditorIban,
      currency: "EUR",
    },
    creditorAgent: {
      bic: state.creditorBic,
    },
    amount: {
      instructedAmount: {
        currency: "EUR",
        amount: Number.isFinite(amount) ? amount : 0,
      },
    },
    chargeBearer: "SLEV",
    purposeCode: state.includePurposeCode ? state.purposeCode || undefined : undefined,
    remittanceInformation:
      state.remittanceLine || hasStructuredRemittance
        ? {
            unstructured: state.remittanceLine ? [state.remittanceLine] : undefined,
            structured: hasStructuredRemittance
              ? [
                  {
                    creditorReference: state.creditorReference || undefined,
                    additionalRemittanceInformation:
                      state.additionalRemittanceInformation || undefined,
                  },
                ]
              : undefined,
          }
        : undefined,
    regulatoryReporting: hasRegulatoryDetails
      ? {
          details: state.regulatoryDetails
            .split("\n")
            .map((detail) => detail.trim())
            .filter(Boolean),
        }
      : undefined,
    instructionId: state.instructionId,
    endToEndId: state.endToEndId,
    transactionId: state.includeTransactionId ? state.transactionId || undefined : undefined,
    settlementPriority: state.settlementPriority ? "HIGH" : undefined,
  };
}
