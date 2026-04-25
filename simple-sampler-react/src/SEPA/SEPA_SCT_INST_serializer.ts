import type { SepaInstantPayment } from "./SEPA.ts";

// ---- XML helpers ----
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function t(name: string, value?: string | number): string {
  if (value === undefined || value === null) return "";
  return `<${name}>${esc(String(value))}</${name}>`;
}

// ---- Party Identification (FULL) ----
function serializeParty(p?: any, tagName?: string): string {
  if (!p || !tagName) return "";

  return `
    <${tagName}>
      <Nm>${esc(p.name)}</Nm>

      ${p.postalAddress ? `
        <PstlAdr>
          ${t("AdrLine", p.postalAddress.address)}
          ${t("StrtNm", p.postalAddress.streetName)}
          ${t("BldgNb", p.postalAddress.buildingNumber)}
          ${t("PstCd", p.postalAddress.postCode)}
          ${t("TwnNm", p.postalAddress.townName)}
          ${t("CtrySubDvsn", p.postalAddress.countrySubDivision)}
          ${t("Ctry", p.postalAddress.country)}
          ${(p.postalAddress.addressLine || []).map((l: string) => t("AdrLine", l)).join("")}
        </PstlAdr>
      ` : ""}

      ${(p.organisationId || p.privateId) ? `
        <Id>
          ${p.organisationId ? `
            <OrgId>
              ${t("BICOrBEI", p.organisationId.bicOrBei)}
              ${t("LEI", p.organisationId.lei)}
              ${p.organisationId.otherId ? `<Othr><Id>${esc(p.organisationId.otherId)}</Id></Othr>` : ""}
            </OrgId>
          ` : ""}

          ${p.privateId ? `
            <PrvtId>
              ${p.privateId.dateOfBirth ? `
                <DtAndPlcOfBirth>
                  ${t("BirthDt", p.privateId.dateOfBirth)}
                  ${t("CtryOfBirth", p.privateId.countryOfBirth)}
                </DtAndPlcOfBirth>
              ` : ""}
              ${p.privateId.otherId ? `<Othr><Id>${esc(p.privateId.otherId)}</Id></Othr>` : ""}
            </PrvtId>
          ` : ""}
        </Id>
      ` : ""}
    </${tagName}>
  `;
}

// ---- Account ----
function serializeAccount(acc: any, tagName: string): string {
  return `
    <${tagName}>
      <Id><IBAN>${esc(acc.iban)}</IBAN></Id>
    </${tagName}>
  `;
}

// ---- Agent ----
function serializeAgent(agent: any, tagName: string): string {
  return `
    <${tagName}>
      <FinInstnId>
        <BICFI>${esc(agent.bic)}</BICFI>
        ${agent.clearingSystemMemberId ? `
          <ClrSysMmbId>
            <MmbId>${esc(agent.clearingSystemMemberId)}</MmbId>
          </ClrSysMmbId>
        ` : ""}
      </FinInstnId>
    </${tagName}>
  `;
}

// ---- Remittance ----
function serializeRemittance(r?: any): string {
  if (!r) return "";

  return `
    <RmtInf>
      ${(r.unstructured || []).map((u: string) => `<Ustrd>${esc(u)}</Ustrd>`).join("")}
      ${(r.structured || []).map((s: any) => `
        <Strd>
          ${s.creditorReference ? `
            <CdtrRefInf>
              <Ref>${esc(s.creditorReference)}</Ref>
            </CdtrRefInf>
          ` : ""}
          ${t("AddtlRmtInf", s.additionalRemittanceInformation)}
        </Strd>
      `).join("")}
    </RmtInf>
  `;
}

// ---- Regulatory ----
function serializeRegulatory(r?: any): string {
  if (!r?.details?.length) return "";
  return `
    <RgltryRptg>
      ${r.details.map((d: string) => `<Dtls><Inf>${esc(d)}</Inf></Dtls>`).join("")}
    </RgltryRptg>
  `;
}

// ---- MAIN ----
export function serializeToPacs008(payment: SepaInstantPayment): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>

    <GrpHdr>
      ${t("MsgId", payment.messageId)}
      ${t("CreDtTm", payment.creationDateTime)}
      ${t("NbOfTxs", payment.numberOfTransactions)}
      ${t("CtrlSum", payment.controlSum)}
      <SttlmInf><SttlmMtd>CLRG</SttlmMtd></SttlmInf>
    </GrpHdr>

    <CdtTrfTxInf>

      <PmtId>
        ${t("InstrId", payment.instructionId)}
        ${t("EndToEndId", payment.endToEndId)}
        ${t("TxId", payment.transactionId)}
      </PmtId>

      <PmtTpInf>
        <SvcLvl><Cd>${payment.serviceLevel}</Cd></SvcLvl>
        <LclInstrm><Cd>${payment.localInstrument}</Cd></LclInstrm>
        ${payment.categoryPurpose ? `<CtgyPurp><Cd>${esc(payment.categoryPurpose)}</Cd></CtgyPurp>` : ""}
      </PmtTpInf>

      <IntrBkSttlmAmt Ccy="${payment.amount.instructedAmount.currency}">
        ${payment.amount.instructedAmount.amount}
      </IntrBkSttlmAmt>

      ${t("IntrBkSttlmDt", payment.creationDateTime.split("T")[0])}
      ${t("ReqdExctnDtTm", payment.requestedExecutionDateTime)}

      <ChrgBr>${payment.chargeBearer}</ChrgBr>

      ${serializeParty(payment.debtor, "Dbtr")}
      ${serializeAccount(payment.debtorAccount, "DbtrAcct")}
      ${serializeAgent(payment.debtorAgent, "DbtrAgt")}

      ${serializeParty(payment.ultimateDebtor, "UltmtDbtr")}

      ${serializeParty(payment.creditor, "Cdtr")}
      ${serializeAccount(payment.creditorAccount, "CdtrAcct")}
      ${serializeAgent(payment.creditorAgent, "CdtrAgt")}

      ${serializeParty(payment.ultimateCreditor, "UltmtCdtr")}

      ${payment.purposeCode ? `<Purp><Cd>${esc(payment.purposeCode)}</Cd></Purp>` : ""}

      ${serializeRemittance(payment.remittanceInformation)}
      ${serializeRegulatory(payment.regulatoryReporting)}

    </CdtTrfTxInf>

  </FIToFICstmrCdtTrf>
</Document>`;
}
