import { useState, type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Separator from "@radix-ui/react-separator";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import { serializeToPacs008 } from "../SEPA/SEPA_SCT_INST_serializer.ts";
import {
  buildPayment,
  compactXml,
  paymentToState,
  randomId,
  randomizeIbanNumbers,
  type BuilderState,
} from "./state.ts";

type PaymentEditorProps = {
  form: BuilderState;
  setForm: Dispatch<SetStateAction<BuilderState>>;
  heroKicker?: string;
  heroLead?: string;
  heroTitle?: string;
  headerActions?: ReactNode;
  showHero?: boolean;
  showLoadFromJson?: boolean;
};

function InputField({
  action,
  id,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
  hint,
}: {
  action?: { ariaLabel: string; onClick: () => void };
  id: string;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="builder-field">
      <Label.Root className="builder-label" htmlFor={id}>
        {label}
      </Label.Root>
      <div className="builder-inputRow">
        <input
          id={id}
          className="builder-input"
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {action ? (
          <button
            aria-label={action.ariaLabel}
            className="builder-iconButton"
            onClick={action.onClick}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="builder-icon"
              fill="none"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <path
                d="M13.5 3.5v3h-3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <path
                d="M12.2 9.2a4.5 4.5 0 1 1-1-4.7l2.3 2.1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        ) : null}
      </div>
      {hint ? <p className="builder-hint">{hint}</p> : null}
    </div>
  );
}

function TextAreaField({
  id,
  label,
  onChange,
  value,
  hint,
}: {
  id: string;
  label: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  value: string;
  hint?: string;
}) {
  return (
    <div className="builder-field builder-field-full">
      <Label.Root className="builder-label" htmlFor={id}>
        {label}
      </Label.Root>
      <textarea id={id} className="builder-textarea" onChange={onChange} rows={4} value={value} />
      {hint ? <p className="builder-hint">{hint}</p> : null}
    </div>
  );
}

function SwitchField({
  checked,
  hint,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  hint: string;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="builder-switchRow" htmlFor={id}>
      <div className="builder-switchText">
        <span className="builder-switchLabel">{label}</span>
        <span className="builder-hint">{hint}</span>
      </div>
      <Switch.Root checked={checked} className="builder-switch" id={id} onCheckedChange={onCheckedChange}>
        <Switch.Thumb className="builder-switchThumb" />
      </Switch.Root>
    </label>
  );
}

export function PaymentEditor({
  form,
  setForm,
  heroKicker = "SEPA Instant Payment Builder",
  heroLead = "Edit payment data, inspect the model payload, and review serialized pacs.008 XML.",
  heroTitle = "Compose a payment from the SEPA model",
  headerActions,
  showHero = true,
  showLoadFromJson = true,
}: PaymentEditorProps) {
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
      const parsed = JSON.parse(jsonDraft);
      setForm(paymentToState(parsed));
      setJsonError("");
      setIsLoadDialogOpen(false);
    } catch {
      setJsonError("Invalid payment JSON.");
    }
  };

  return (
    <div className="builder-shell">
      {showHero ? (
        <section className="builder-hero">
          <p className="builder-kicker">{heroKicker}</p>
          <h1>{heroTitle}</h1>
          <p className="builder-lead">{heroLead}</p>
          <div className="builder-summary">
            <div className="builder-summaryCard">
              <span className="builder-summaryLabel">Control sum</span>
              <strong className="builder-summaryValue">
                EUR {payment.amount.instructedAmount.amount.toFixed(2)}
              </strong>
            </div>
            <div className="builder-summaryCard">
              <span className="builder-summaryLabel">Message ID</span>
              <strong className="builder-summaryValue">{payment.messageId}</strong>
            </div>
            <div className="builder-summaryCard">
              <span className="builder-summaryLabel">Settlement</span>
              <strong className="builder-summaryValue">{payment.settlementPriority ?? "Default"}</strong>
            </div>
          </div>
          <div className="builder-toolbar">
            {showLoadFromJson ? (
              <Dialog.Root
                onOpenChange={(open) => {
                  setIsLoadDialogOpen(open);
                  if (open) {
                    setJsonDraft(paymentJson);
                    setJsonError("");
                  }
                }}
                open={isLoadDialogOpen}
              >
                <Dialog.Trigger asChild>
                  <button className="builder-copyButton" type="button">
                    Load from JSON
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="builder-dialogOverlay" />
                  <Dialog.Content className="builder-dialogContent">
                    <div className="builder-dialogHeader">
                      <Dialog.Title className="builder-dialogTitle">Load from JSON</Dialog.Title>
                      <Dialog.Close asChild>
                        <button aria-label="Close dialog" className="builder-iconButton" type="button">
                          ×
                        </button>
                      </Dialog.Close>
                    </div>
                    <TextAreaField
                      id="payment-json"
                      label="Payment JSON"
                      onChange={(event) => {
                        setJsonDraft(event.target.value);
                        if (jsonError) {
                          setJsonError("");
                        }
                      }}
                      value={jsonDraft}
                    />
                    {jsonError ? <p className="builder-errorText">{jsonError}</p> : null}
                    <div className="builder-dialogActions">
                      <Dialog.Close asChild>
                        <button className="builder-copyButton" type="button">
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button className="builder-copyButton builder-primaryButton" onClick={loadFromJson} type="button">
                        Load
                      </button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            ) : null}
            {headerActions}
          </div>
        </section>
      ) : null}

      <section className="builder-layout">
        <div className="builder-panel">
          <Tabs.Root className="builder-tabs" defaultValue="payment">
            <Tabs.List aria-label="SEPA payment sections" className="builder-tabList">
              <Tabs.Trigger className="builder-tabTrigger" value="payment">
                Payment
              </Tabs.Trigger>
              <Tabs.Trigger className="builder-tabTrigger" value="parties">
                Parties
              </Tabs.Trigger>
              <Tabs.Trigger className="builder-tabTrigger" value="options">
                Options
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content className="builder-tabContent" value="payment">
              <div className="builder-panelHeader">
                <h2>Payment identifiers</h2>
                <button className="builder-copyButton" onClick={generateIds} type="button">
                  Generate
                </button>
              </div>
              <div className="builder-grid">
                <InputField id="messageId" label="Message ID" onChange={updateField("messageId")} value={form.messageId} />
                <InputField
                  id="paymentInformationId"
                  label="Payment information ID"
                  onChange={updateField("paymentInformationId")}
                  value={form.paymentInformationId}
                />
                <InputField
                  id="creationDateTime"
                  label="Creation date time"
                  onChange={updateField("creationDateTime")}
                  type="datetime-local"
                  value={form.creationDateTime}
                />
                <InputField
                  id="requestedExecutionDateTime"
                  label="Requested execution date time"
                  onChange={updateField("requestedExecutionDateTime")}
                  type="datetime-local"
                  value={form.requestedExecutionDateTime}
                />
                <InputField
                  id="instructionId"
                  label="Instruction ID"
                  onChange={updateField("instructionId")}
                  value={form.instructionId}
                />
                <InputField
                  id="endToEndId"
                  label="End-to-end ID"
                  onChange={updateField("endToEndId")}
                  value={form.endToEndId}
                />
                <InputField
                  hint="EUR only in the current model."
                  id="amount"
                  label="Amount"
                  onChange={updateField("amount")}
                  type="number"
                  value={form.amount}
                />
                <InputField
                  hint="Mapped to remittanceInformation.unstructured[0]."
                  id="remittanceLine"
                  label="Unstructured remittance"
                  onChange={updateField("remittanceLine")}
                  value={form.remittanceLine}
                />
              </div>
            </Tabs.Content>

            <Tabs.Content className="builder-tabContent" value="parties">
              <h2>Debtor</h2>
              <div className="builder-grid">
                <InputField id="debtorName" label="Name" onChange={updateField("debtorName")} value={form.debtorName} />
                <InputField
                  id="debtorAddress"
                  label="Address"
                  onChange={updateField("debtorAddress")}
                  value={form.debtorAddress}
                />
                <InputField
                  id="debtorCountry"
                  label="Country"
                  onChange={updateField("debtorCountry")}
                  placeholder="DE"
                  value={form.debtorCountry}
                />
                <InputField
                  action={{
                    ariaLabel: "Generate debtor IBAN numbers",
                    onClick: generateIban("debtorIban"),
                  }}
                  id="debtorIban"
                  label="IBAN"
                  onChange={updateField("debtorIban")}
                  value={form.debtorIban}
                />
                <InputField id="debtorBic" label="BIC" onChange={updateField("debtorBic")} value={form.debtorBic} />
              </div>

              <Separator.Root className="builder-separator" decorative />

              <h2>Creditor</h2>
              <div className="builder-grid">
                <InputField id="creditorName" label="Name" onChange={updateField("creditorName")} value={form.creditorName} />
                <InputField
                  id="creditorAddress"
                  label="Address"
                  onChange={updateField("creditorAddress")}
                  value={form.creditorAddress}
                />
                <InputField
                  id="creditorCountry"
                  label="Country"
                  onChange={updateField("creditorCountry")}
                  placeholder="LV"
                  value={form.creditorCountry}
                />
                <InputField
                  action={{
                    ariaLabel: "Generate creditor IBAN numbers",
                    onClick: generateIban("creditorIban"),
                  }}
                  id="creditorIban"
                  label="IBAN"
                  onChange={updateField("creditorIban")}
                  value={form.creditorIban}
                />
                <InputField id="creditorBic" label="BIC" onChange={updateField("creditorBic")} value={form.creditorBic} />
              </div>
            </Tabs.Content>

            <Tabs.Content className="builder-tabContent" value="options">
              <div className="builder-switchGroup">
                <SwitchField
                  checked={form.includeCategoryPurpose}
                  hint="Adds CtgyPurp in payment type information."
                  id="includeCategoryPurpose"
                  label="Include category purpose"
                  onCheckedChange={updateSwitch("includeCategoryPurpose")}
                />
                <SwitchField
                  checked={form.includePurposeCode}
                  hint="Adds Purp at transaction level."
                  id="includePurposeCode"
                  label="Include purpose code"
                  onCheckedChange={updateSwitch("includePurposeCode")}
                />
                <SwitchField
                  checked={form.includeTransactionId}
                  hint="Writes TxId into the payment identifier block."
                  id="includeTransactionId"
                  label="Include transaction ID"
                  onCheckedChange={updateSwitch("includeTransactionId")}
                />
                <SwitchField
                  checked={form.includeStructuredRemittance}
                  hint="Adds creditor reference data under Strd."
                  id="includeStructuredRemittance"
                  label="Include structured remittance"
                  onCheckedChange={updateSwitch("includeStructuredRemittance")}
                />
                <SwitchField
                  checked={form.includeRegulatoryReporting}
                  hint="Serializes newline-separated regulatory detail entries."
                  id="includeRegulatoryReporting"
                  label="Include regulatory reporting"
                  onCheckedChange={updateSwitch("includeRegulatoryReporting")}
                />
                <SwitchField
                  checked={form.settlementPriority}
                  hint="Maps to settlementPriority = HIGH."
                  id="settlementPriority"
                  label="High settlement priority"
                  onCheckedChange={updateSwitch("settlementPriority")}
                />
              </div>

              <Separator.Root className="builder-separator" decorative />

              <div className="builder-grid">
                <InputField
                  id="categoryPurpose"
                  label="Category purpose"
                  onChange={updateField("categoryPurpose")}
                  placeholder="SALA"
                  value={form.categoryPurpose}
                />
                <InputField
                  id="purposeCode"
                  label="Purpose code"
                  onChange={updateField("purposeCode")}
                  placeholder="GDDS"
                  value={form.purposeCode}
                />
                <InputField
                  id="transactionId"
                  label="Transaction ID"
                  onChange={updateField("transactionId")}
                  value={form.transactionId}
                />
                <InputField
                  id="creditorReference"
                  label="Creditor reference"
                  onChange={updateField("creditorReference")}
                  placeholder="RF18539007547034"
                  value={form.creditorReference}
                />
              </div>

              <TextAreaField
                id="additionalRemittanceInformation"
                label="Additional structured remittance information"
                onChange={updateField("additionalRemittanceInformation")}
                value={form.additionalRemittanceInformation}
              />
              <TextAreaField
                hint="Use one line per detail entry."
                id="regulatoryDetails"
                label="Regulatory reporting details"
                onChange={updateField("regulatoryDetails")}
                value={form.regulatoryDetails}
              />
            </Tabs.Content>
          </Tabs.Root>
        </div>

        <div className="builder-previewStack">
          <section className="builder-panel">
            <div className="builder-panelHeader">
              <h2>pacs.008 Preview</h2>
              <button
                className="builder-copyButton"
                onClick={() => {
                  void copyText(paymentXml, "xml");
                }}
                type="button"
              >
                {copyState === "xml" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="builder-code">{paymentXml}</pre>
          </section>

          <section className="builder-panel">
            <div className="builder-panelHeader">
              <h2>Model Preview</h2>
              <button
                className="builder-copyButton"
                onClick={() => {
                  void copyText(paymentJson, "json");
                }}
                type="button"
              >
                {copyState === "json" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="builder-code">{paymentJson}</pre>
          </section>
        </div>
      </section>
    </div>
  );
}
