import { createElement, Fragment, useState, type ChangeEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Separator from "@radix-ui/react-separator";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import type { SepaInstantPayment } from "../SEPA/SEPA.ts";
import { serializeToPacs008 } from "../SEPA/SEPA_SCT_INST_serializer.ts";

type BuilderState = {
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

const initialDateTime = new Date().toISOString().slice(0, 16);

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function randomizeIbanNumbers(value: string): string {
  return value.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
}

const initialState: BuilderState = {
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

function toIsoDateTime(localDateTime: string): string {
  if (!localDateTime) {
    return new Date().toISOString();
  }

  return new Date(localDateTime).toISOString();
}

function compactXml(xml: string): string {
  return xml
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .join("\n");
}

function toLocalDateTime(value?: string): string {
  if (!value) {
    return initialDateTime;
  }

  return new Date(value).toISOString().slice(0, 16);
}

function paymentToState(payment: SepaInstantPayment): BuilderState {
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

function buildPayment(state: BuilderState): SepaInstantPayment {
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

function inputField(
  id: string,
  label: string,
  value: string,
  onChange: (event: ChangeEvent<HTMLInputElement>) => void,
  options?: {
    action?: {
      ariaLabel: string;
      onClick: () => void;
    };
    hint?: string;
    placeholder?: string;
    type?: string;
  },
) {
  return createElement(
    "div",
    { className: "builder-field", key: id },
    createElement(Label.Root, { className: "builder-label", htmlFor: id }, label),
    createElement(
      "div",
      { className: "builder-inputRow" },
      createElement("input", {
        id,
        className: "builder-input",
        onChange,
        placeholder: options?.placeholder,
        type: options?.type ?? "text",
        value,
      }),
      options?.action
        ? createElement(
            "button",
            {
              "aria-label": options.action.ariaLabel,
              className: "builder-iconButton",
              onClick: options.action.onClick,
              type: "button",
            },
            createElement(
              "svg",
              {
                "aria-hidden": "true",
                className: "builder-icon",
                fill: "none",
                height: "16",
                viewBox: "0 0 16 16",
                width: "16",
              },
              createElement("path", {
                d: "M13.5 3.5v3h-3",
                stroke: "currentColor",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "1.5",
              }),
              createElement("path", {
                d: "M12.2 9.2a4.5 4.5 0 1 1-1-4.7l2.3 2.1",
                stroke: "currentColor",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "1.5",
              }),
            ),
          )
        : null,
    ),
    options?.hint
      ? createElement("p", { className: "builder-hint" }, options.hint)
      : null,
  );
}

function textAreaField(
  id: string,
  label: string,
  value: string,
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void,
  hint?: string,
) {
  return createElement(
    "div",
    { className: "builder-field builder-field-full", key: id },
    createElement(Label.Root, { className: "builder-label", htmlFor: id }, label),
    createElement("textarea", {
      id,
      className: "builder-textarea",
      onChange,
      rows: 4,
      value,
    }),
    hint ? createElement("p", { className: "builder-hint" }, hint) : null,
  );
}

function switchField(
  id: string,
  label: string,
  checked: boolean,
  onCheckedChange: (checked: boolean) => void,
  hint: string,
) {
  return createElement(
    "label",
    { className: "builder-switchRow", htmlFor: id, key: id },
    createElement(
      "div",
      { className: "builder-switchText" },
      createElement("span", { className: "builder-switchLabel" }, label),
      createElement("span", { className: "builder-hint" }, hint),
    ),
    createElement(
      Switch.Root,
      {
        checked,
        className: "builder-switch",
        id,
        onCheckedChange,
      },
      createElement(Switch.Thumb, { className: "builder-switchThumb" }),
    ),
  );
}

export default function SepaBuilder() {
  const [form, setForm] = useState<BuilderState>(initialState);
  const [copyState, setCopyState] = useState<"idle" | "json" | "xml">("idle");
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState("");

  const payment = buildPayment(form);
  const paymentJson = JSON.stringify(payment, null, 2);
  const paymentXml = compactXml(serializeToPacs008(payment));

  const updateField =
    (key: keyof BuilderState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    };

  const updateSwitch =
    (key: keyof BuilderState) =>
    (checked: boolean) => {
      setForm((current) => ({
        ...current,
        [key]: checked,
      }));
    };

  const copyText = async (value: string, type: "json" | "xml") => {
    await navigator.clipboard.writeText(value);
    setCopyState(type);
    window.setTimeout(() => {
      setCopyState("idle");
    }, 1200);
  };

  const generateIds = () => {
    setForm((current) => ({
      ...current,
      messageId: randomId("MSG"),
      paymentInformationId: randomId("PMT"),
      instructionId: randomId("INSTR"),
      endToEndId: randomId("E2E"),
      transactionId: current.includeTransactionId ? randomId("TX") : current.transactionId,
    }));
  };

  const generateIban =
    (key: "debtorIban" | "creditorIban") => () => {
      setForm((current) => ({
        ...current,
        [key]: randomizeIbanNumbers(current[key]),
      }));
    };

  const loadFromJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as SepaInstantPayment;
      setForm(paymentToState(parsed));
      setJsonError("");
      setIsLoadDialogOpen(false);
    } catch {
      setJsonError("Invalid payment JSON.");
    }
  };

  return createElement(
    "main",
    { className: "builder-shell" },
    createElement(
      "section",
      { className: "builder-hero" },
      createElement("p", { className: "builder-kicker" }, "SEPA Instant Payment Builder"),
      createElement("h1", null, "Compose a payment from the SEPA model"),
      createElement(
        "p",
        { className: "builder-lead" },
      ),
      createElement(
        "div",
        { className: "builder-summary" },
        createElement(
          "div",
          { className: "builder-summaryCard" },
          createElement("span", { className: "builder-summaryLabel" }, "Control sum"),
          createElement(
            "strong",
            { className: "builder-summaryValue" },
            "EUR ",
            payment.amount.instructedAmount.amount.toFixed(2),
          ),
        ),
        createElement(
          "div",
          { className: "builder-summaryCard" },
          createElement("span", { className: "builder-summaryLabel" }, "Message ID"),
          createElement("strong", { className: "builder-summaryValue" }, payment.messageId),
        ),
        createElement(
          "div",
          { className: "builder-summaryCard" },
          createElement("span", { className: "builder-summaryLabel" }, "Settlement"),
          createElement(
            "strong",
            { className: "builder-summaryValue" },
            payment.settlementPriority ?? "Default",
          ),
        ),
      ),
      createElement(
        "div",
        { className: "builder-toolbar" },
        createElement(
          Dialog.Root,
          {
            onOpenChange: (open) => {
              setIsLoadDialogOpen(open);
              if (open) {
                setJsonDraft(paymentJson);
                setJsonError("");
              }
            },
            open: isLoadDialogOpen,
          },
          createElement(
            Dialog.Trigger,
            { asChild: true },
            createElement(
              "button",
              {
                className: "builder-copyButton",
                type: "button",
              },
              "Load from JSON",
            ),
          ),
          createElement(
            Dialog.Portal,
            null,
            createElement(Dialog.Overlay, { className: "builder-dialogOverlay" }),
            createElement(
              Dialog.Content,
              { className: "builder-dialogContent" },
              createElement(
                "div",
                { className: "builder-dialogHeader" },
                createElement(Dialog.Title, { className: "builder-dialogTitle" }, "Load from JSON"),
                createElement(
                  Dialog.Close,
                  { asChild: true },
                  createElement(
                    "button",
                    {
                      "aria-label": "Close dialog",
                      className: "builder-iconButton",
                      type: "button",
                    },
                    "×",
                  ),
                ),
              ),
              textAreaField(
                "payment-json",
                "Payment JSON",
                jsonDraft,
                (event) => {
                  setJsonDraft(event.target.value);
                  if (jsonError) {
                    setJsonError("");
                  }
                },
              ),
              jsonError
                ? createElement("p", { className: "builder-errorText" }, jsonError)
                : null,
              createElement(
                "div",
                { className: "builder-dialogActions" },
                createElement(
                  Dialog.Close,
                  { asChild: true },
                  createElement(
                    "button",
                    {
                      className: "builder-copyButton",
                      type: "button",
                    },
                    "Cancel",
                  ),
                ),
                createElement(
                  "button",
                  {
                    className: "builder-copyButton builder-primaryButton",
                    onClick: loadFromJson,
                    type: "button",
                  },
                  "Load",
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    createElement(
      "section",
      { className: "builder-layout" },
      createElement(
        "div",
        { className: "builder-panel" },
        createElement(
          Tabs.Root,
          { className: "builder-tabs", defaultValue: "payment" },
          createElement(
            Tabs.List,
            { "aria-label": "SEPA payment sections", className: "builder-tabList" },
            createElement(
              Tabs.Trigger,
              { className: "builder-tabTrigger", value: "payment" },
              "Payment",
            ),
            createElement(
              Tabs.Trigger,
              { className: "builder-tabTrigger", value: "parties" },
              "Parties",
            ),
            createElement(
              Tabs.Trigger,
              { className: "builder-tabTrigger", value: "options" },
              "Options",
            ),
          ),
          createElement(
            Tabs.Content,
            { className: "builder-tabContent", value: "payment" },
            createElement(
              "div",
              { className: "builder-panelHeader" },
              createElement("h2", null, "Payment identifiers"),
              createElement(
                "button",
                {
                  className: "builder-copyButton",
                  onClick: generateIds,
                  type: "button",
                },
                "Generate",
              ),
            ),
            createElement(
              "div",
              { className: "builder-grid" },
              inputField("messageId", "Message ID", form.messageId, updateField("messageId")),
              inputField(
                "paymentInformationId",
                "Payment information ID",
                form.paymentInformationId,
                updateField("paymentInformationId"),
              ),
              inputField(
                "creationDateTime",
                "Creation date time",
                form.creationDateTime,
                updateField("creationDateTime"),
                { type: "datetime-local" },
              ),
              inputField(
                "requestedExecutionDateTime",
                "Requested execution date time",
                form.requestedExecutionDateTime,
                updateField("requestedExecutionDateTime"),
                { type: "datetime-local" },
              ),
              inputField(
                "instructionId",
                "Instruction ID",
                form.instructionId,
                updateField("instructionId"),
              ),
              inputField(
                "endToEndId",
                "End-to-end ID",
                form.endToEndId,
                updateField("endToEndId"),
              ),
              inputField("amount", "Amount", form.amount, updateField("amount"), {
                hint: "EUR only in the current model.",
                type: "number",
              }),
              inputField(
                "remittanceLine",
                "Unstructured remittance",
                form.remittanceLine,
                updateField("remittanceLine"),
                {
                  hint: "Mapped to remittanceInformation.unstructured[0].",
                },
              ),
            ),
          ),
          createElement(
            Tabs.Content,
            { className: "builder-tabContent", value: "parties" },
            createElement(
              Fragment,
              null,
              createElement("h2", null, "Debtor"),
              createElement(
                "div",
                { className: "builder-grid" },
                inputField("debtorName", "Name", form.debtorName, updateField("debtorName")),
                inputField(
                  "debtorAddress",
                  "Address",
                  form.debtorAddress,
                  updateField("debtorAddress"),
                ),
                inputField(
                  "debtorCountry",
                  "Country",
                  form.debtorCountry,
                  updateField("debtorCountry"),
                  { placeholder: "DE" },
                ),
                inputField("debtorIban", "IBAN", form.debtorIban, updateField("debtorIban"), {
                  action: {
                    ariaLabel: "Generate debtor IBAN numbers",
                    onClick: generateIban("debtorIban"),
                  },
                }),
                inputField("debtorBic", "BIC", form.debtorBic, updateField("debtorBic")),
              ),
              createElement(Separator.Root, { className: "builder-separator", decorative: true }),
              createElement("h2", null, "Creditor"),
              createElement(
                "div",
                { className: "builder-grid" },
                inputField(
                  "creditorName",
                  "Name",
                  form.creditorName,
                  updateField("creditorName"),
                ),
                inputField(
                  "creditorAddress",
                  "Address",
                  form.creditorAddress,
                  updateField("creditorAddress"),
                ),
                inputField(
                  "creditorCountry",
                  "Country",
                  form.creditorCountry,
                  updateField("creditorCountry"),
                  { placeholder: "LV" },
                ),
                inputField(
                  "creditorIban",
                  "IBAN",
                  form.creditorIban,
                  updateField("creditorIban"),
                  {
                    action: {
                      ariaLabel: "Generate creditor IBAN numbers",
                      onClick: generateIban("creditorIban"),
                    },
                  },
                ),
                inputField("creditorBic", "BIC", form.creditorBic, updateField("creditorBic")),
              ),
            ),
          ),
          createElement(
            Tabs.Content,
            { className: "builder-tabContent", value: "options" },
            createElement(
              Fragment,
              null,
              createElement(
                "div",
                { className: "builder-switchGroup" },
                switchField(
                  "includeCategoryPurpose",
                  "Include category purpose",
                  form.includeCategoryPurpose,
                  updateSwitch("includeCategoryPurpose"),
                  "Adds CtgyPurp in payment type information.",
                ),
                switchField(
                  "includePurposeCode",
                  "Include purpose code",
                  form.includePurposeCode,
                  updateSwitch("includePurposeCode"),
                  "Adds Purp at transaction level.",
                ),
                switchField(
                  "includeTransactionId",
                  "Include transaction ID",
                  form.includeTransactionId,
                  updateSwitch("includeTransactionId"),
                  "Writes TxId into the payment identifier block.",
                ),
                switchField(
                  "includeStructuredRemittance",
                  "Include structured remittance",
                  form.includeStructuredRemittance,
                  updateSwitch("includeStructuredRemittance"),
                  "Adds creditor reference data under Strd.",
                ),
                switchField(
                  "includeRegulatoryReporting",
                  "Include regulatory reporting",
                  form.includeRegulatoryReporting,
                  updateSwitch("includeRegulatoryReporting"),
                  "Serializes newline-separated regulatory detail entries.",
                ),
                switchField(
                  "settlementPriority",
                  "High settlement priority",
                  form.settlementPriority,
                  updateSwitch("settlementPriority"),
                  "Maps to settlementPriority = HIGH.",
                ),
              ),
              createElement(Separator.Root, { className: "builder-separator", decorative: true }),
              createElement(
                "div",
                { className: "builder-grid" },
                inputField(
                  "categoryPurpose",
                  "Category purpose",
                  form.categoryPurpose,
                  updateField("categoryPurpose"),
                  { placeholder: "SALA" },
                ),
                inputField(
                  "purposeCode",
                  "Purpose code",
                  form.purposeCode,
                  updateField("purposeCode"),
                  { placeholder: "GDDS" },
                ),
                inputField(
                  "transactionId",
                  "Transaction ID",
                  form.transactionId,
                  updateField("transactionId"),
                ),
                inputField(
                  "creditorReference",
                  "Creditor reference",
                  form.creditorReference,
                  updateField("creditorReference"),
                  { placeholder: "RF18539007547034" },
                ),
              ),
              textAreaField(
                "additionalRemittanceInformation",
                "Additional structured remittance information",
                form.additionalRemittanceInformation,
                updateField("additionalRemittanceInformation"),
              ),
              textAreaField(
                "regulatoryDetails",
                "Regulatory reporting details",
                form.regulatoryDetails,
                updateField("regulatoryDetails"),
                "Use one line per detail entry.",
              ),
            ),
          ),
        ),
      ),
      createElement(
        "div",
        { className: "builder-previewStack" },
        createElement(
          "section",
          { className: "builder-panel" },
          createElement(
            "div",
            { className: "builder-panelHeader" },
            createElement("h2", null, "pacs.008 Preview"),
            createElement(
              "button",
              {
                className: "builder-copyButton",
                onClick: () => {
                  void copyText(paymentXml, "xml");
                },
                type: "button",
              },
              copyState === "xml" ? "Copied" : "Copy",
            ),
          ),
          createElement("pre", { className: "builder-code" }, paymentXml),
        ),
        createElement(
          "section",
          { className: "builder-panel" },
          createElement(
            "div",
            { className: "builder-panelHeader" },
            createElement("h2", null, "Model Preview"),
            createElement(
              "button",
              {
                className: "builder-copyButton",
                onClick: () => {
                  void copyText(paymentJson, "json");
                },
                type: "button",
              },
              copyState === "json" ? "Copied" : "Copy",
            ),
          ),
          createElement("pre", { className: "builder-code" }, paymentJson),
        ),
      ),
    ),
  );
}
