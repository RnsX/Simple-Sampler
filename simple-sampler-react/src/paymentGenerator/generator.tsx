import { useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import JSZip from "jszip";
import type { SepaInstantPayment } from "../SEPA/SEPA.ts";
import { serializeToPacs008 } from "../SEPA/SEPA_SCT_INST_serializer.ts";
import { PaymentEditor } from "../paymentBuilder/PaymentEditor.tsx";
import {
  buildPayment,
  compactXml,
  defaultBicForCountry,
  initialBuilderState,
  randomIban,
  randomId,
  type BuilderState,
} from "../paymentBuilder/state.ts";

type CompanyEntity = {
  Name: string;
  Address: string;
  Country: string;
};

type PersonEntity = {
  Id: string;
  Locality: string;
  Type: string;
  Value: string;
};

const PAGE_SIZE = 10;

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split(",")
        .map((cell) => cell.trim().replaceAll('"', "")),
    );
}

function parseCompaniesCsv(text: string): CompanyEntity[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) {
    return [];
  }

  const nameIndex = header.findIndex((value) => value === "Name");
  const addressIndex = header.findIndex((value) => value === "Address");
  const countryIndex = header.findIndex((value) => value === "Country");

  return rows
    .map((row) => ({
      Name: row[nameIndex] ?? "",
      Address: row[addressIndex] ?? "",
      Country: (row[countryIndex] ?? "").toUpperCase(),
    }))
    .filter((company) => company.Name);
}

function parsePersonsCsv(text: string): PersonEntity[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) {
    return [];
  }

  const idIndex = header.findIndex((value) => value.toLowerCase() === "id");
  const localityIndex = header.findIndex((value) => value === "Locality");
  const typeIndex = header.findIndex((value) => value === "Type");
  const valueIndex = header.findIndex((value) => value === "Value");

  return rows
    .map((row) => ({
      Id: row[idIndex] ?? "",
      Locality: row[localityIndex] ?? "",
      Type: row[typeIndex] ?? "",
      Value: row[valueIndex] ?? "",
    }))
    .filter((person) => person.Value);
}

function sample<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function localityToCountry(locality: string): string {
  switch (locality.toLowerCase()) {
    case "latvia":
      return "LV";
    case "lithuania":
      return "LT";
    case "estonia":
      return "EE";
    case "russia":
      return "RU";
    default:
      return "LV";
  }
}

function randomAmount(): string {
  return (Math.random() * 4000 + 50).toFixed(2);
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createPersonParty(person: PersonEntity) {
  const country = localityToCountry(person.Locality);

  return {
    address: person.Locality,
    bic: defaultBicForCountry(country),
    country,
    iban: randomIban(country),
    name: person.Value,
  };
}

function createCompanyParty(company: CompanyEntity) {
  const country = company.Country || "LV";

  return {
    address: company.Address,
    bic: defaultBicForCountry(country),
    country,
    iban: randomIban(country),
    name: company.Name,
  };
}

function createPaymentStateFromParties(
  debtor:
    | {
        address: string;
        bic: string;
        country: string;
        iban: string;
        name: string;
      }
    | ReturnType<typeof createCompanyParty>,
  creditor:
    | {
        address: string;
        bic: string;
        country: string;
        iban: string;
        name: string;
      }
    | ReturnType<typeof createCompanyParty>,
): BuilderState {
  const now = new Date().toISOString().slice(0, 16);

  return {
    ...initialBuilderState,
    messageId: randomId("MSG"),
    creationDateTime: now,
    paymentInformationId: randomId("PMT"),
    requestedExecutionDateTime: now,
    instructionId: randomId("INSTR"),
    endToEndId: randomId("E2E"),
    amount: randomAmount(),
    debtorName: debtor.name,
    debtorAddress: debtor.address,
    debtorCountry: debtor.country,
    debtorIban: debtor.iban,
    debtorBic: debtor.bic,
    creditorName: creditor.name,
    creditorAddress: creditor.address,
    creditorCountry: creditor.country,
    creditorIban: creditor.iban,
    creditorBic: creditor.bic,
    remittanceLine: `Invoice ${randomId("INV")}`,
  };
}

export default function PaymentGenerator() {
  const [companies, setCompanies] = useState<CompanyEntity[]>([]);
  const [persons, setPersons] = useState<PersonEntity[]>([]);
  const [syntheticPersons, setSyntheticPersons] = useState<PersonEntity[]>([]);
  const [syntheticCount, setSyntheticCount] = useState("25");
  const [paymentCount, setPaymentCount] = useState("20");
  const [generatedPayments, setGeneratedPayments] = useState<BuilderState[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<BuilderState | null>(null);
  const [generatorError, setGeneratorError] = useState("");

  const givenNames = useMemo(
    () => persons.filter((person) => person.Type.toLowerCase() === "given"),
    [persons],
  );
  const surnames = useMemo(
    () => persons.filter((person) => person.Type.toLowerCase() === "surname"),
    [persons],
  );

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return generatedPayments.slice(start, start + PAGE_SIZE);
  }, [currentPage, generatedPayments]);

  const pageCount = Math.max(1, Math.ceil(generatedPayments.length / PAGE_SIZE));

  const handleCompaniesUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setCompanies(parseCompaniesCsv(text));
  };

  const handlePersonsUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setPersons(parsePersonsCsv(text));
  };

  const generateSyntheticPeople = () => {
    if (givenNames.length === 0 || surnames.length === 0) {
      setGeneratorError("Upload person CSV with Given and Surname rows first.");
      return;
    }

    const count = Number.parseInt(syntheticCount, 10);
    if (!Number.isFinite(count) || count <= 0) {
      setGeneratorError("Synthetic person count must be a positive number.");
      return;
    }

    const nextPeople = Array.from({ length: count }, () => {
      const first = sample(givenNames);
      const last = sample(surnames);
      const fullName = `${first.Value} ${last.Value}`.trim();

      return {
        Id: randomId("PERSON"),
        Locality: first.Locality || last.Locality,
        Type: "FullName",
        Value: fullName,
      };
    });

    setSyntheticPersons(nextPeople);
    setGeneratorError("");
  };

  const generatePayments = () => {
    if (companies.length === 0 || (syntheticPersons.length === 0 && (givenNames.length === 0 || surnames.length === 0))) {
      setGeneratorError("Upload company and person data before generating payments.");
      return;
    }

    const count = Number.parseInt(paymentCount, 10);
    if (!Number.isFinite(count) || count <= 0) {
      setGeneratorError("Payment count must be a positive number.");
      return;
    }

    const nextPayments = Array.from({ length: count }, () => {
      const person = syntheticPersons.length > 0
        ? sample(syntheticPersons)
        : (() => {
            const given = sample(givenNames);
            const surname = sample(surnames);

            return {
              Id: randomId("PERSON"),
              Locality: given.Locality || surname.Locality,
              Type: "FullName",
              Value: `${given.Value} ${surname.Value}`.trim(),
            };
          })();
      const debtorIsPerson = Math.random() >= 0.5;
      const creditorIsPerson = Math.random() >= 0.5;
      const debtor = debtorIsPerson ? createPersonParty(person) : createCompanyParty(sample(companies));
      const creditor = creditorIsPerson ? createPersonParty(
        syntheticPersons.length > 0
          ? sample(syntheticPersons)
          : (() => {
              const given = sample(givenNames);
              const surname = sample(surnames);

              return {
                Id: randomId("PERSON"),
                Locality: given.Locality || surname.Locality,
                Type: "FullName",
                Value: `${given.Value} ${surname.Value}`.trim(),
              };
            })(),
      ) : createCompanyParty(sample(companies));

      return createPaymentStateFromParties(debtor, creditor);
    });

    setGeneratedPayments(nextPayments);
    setCurrentPage(1);
    setGeneratorError("");
  };

  const openEditor = (index: number) => {
    setEditingIndex(index);
    setEditingForm(generatedPayments[index] ?? null);
  };

  const saveEditedPayment = () => {
    if (editingIndex === null || editingForm === null) {
      return;
    }

    setGeneratedPayments((current) =>
      current.map((payment, index) => (index === editingIndex ? editingForm : payment)),
    );
    setEditingIndex(null);
    setEditingForm(null);
  };

  const setEditingPaymentForm: Dispatch<SetStateAction<BuilderState>> = (value) => {
    setEditingForm((current) => {
      if (!current) {
        return current;
      }

      return typeof value === "function" ? value(current) : value;
    });
  };

  const downloadSingle = (paymentState: BuilderState, format: "json" | "xml") => {
    const payment = buildPayment(paymentState);
    if (format === "json") {
      downloadText(
        `${payment.messageId}.json`,
        `${JSON.stringify(payment, null, 2)}\n`,
        "application/json",
      );
      return;
    }

    downloadText(
      `${payment.messageId}.xml`,
      `${compactXml(serializeToPacs008(payment))}\n`,
      "application/xml",
    );
  };

  const downloadZip = async () => {
    const zip = new JSZip();

    generatedPayments.forEach((paymentState) => {
      const payment = buildPayment(paymentState);
      zip.file(`${payment.messageId}.json`, `${JSON.stringify(payment, null, 2)}\n`);
      zip.file(`${payment.messageId}.xml`, `${compactXml(serializeToPacs008(payment))}\n`);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payments.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="generator-shell">
      <section className="builder-hero">
        <p className="builder-kicker">SEPA Sample Generator</p>
        <h1>Generate payment sample sets from CSV data</h1>
        <p className="builder-lead">
          Upload company and person sources, synthesize private persons, generate SEPA Instant
          sample payments, edit each record, and export JSON, XML, or a ZIP bundle.
        </p>
      </section>

      <section className="generator-grid">
        <div className="builder-panel generator-panel">
          <h2>Source data</h2>
          <div className="generator-controlGrid">
            <label className="builder-field">
              <span className="builder-label">Companies CSV</span>
              <input className="builder-input" onChange={handleCompaniesUpload} type="file" accept=".csv" />
            </label>
            <label className="builder-field">
              <span className="builder-label">People CSV</span>
              <input className="builder-input" onChange={handlePersonsUpload} type="file" accept=".csv" />
            </label>
          </div>
          <div className="generator-stats">
            <span className="builder-summaryCard">Companies: {companies.length}</span>
            <span className="builder-summaryCard">People: {persons.length}</span>
            <span className="builder-summaryCard">Synthetic people: {syntheticPersons.length}</span>
          </div>
        </div>

        <div className="builder-panel generator-panel">
          <h2>Generation</h2>
          <div className="generator-controlGrid">
            <label className="builder-field">
              <span className="builder-label">Synthetic person count</span>
              <input
                className="builder-input"
                onChange={(event) => setSyntheticCount(event.target.value)}
                type="number"
                value={syntheticCount}
              />
            </label>
            <label className="builder-field">
              <span className="builder-label">Payment count</span>
              <input
                className="builder-input"
                onChange={(event) => setPaymentCount(event.target.value)}
                type="number"
                value={paymentCount}
              />
            </label>
          </div>
          <div className="generator-actions">
            <button className="builder-copyButton" onClick={generateSyntheticPeople} type="button">
              Generate people
            </button>
            <button className="builder-copyButton builder-primaryButton" onClick={generatePayments} type="button">
              Generate payments
            </button>
            <button
              className="builder-copyButton"
              disabled={generatedPayments.length === 0}
              onClick={() => {
                void downloadZip();
              }}
              type="button"
            >
              Download ZIP
            </button>
          </div>
          {generatorError ? <p className="builder-errorText">{generatorError}</p> : null}
        </div>
      </section>

      <section className="builder-panel generator-panel">
        <div className="builder-panelHeader">
          <h2>Generated payments</h2>
          <span className="builder-hint">
            {generatedPayments.length} total, page {currentPage} of {pageCount}
          </span>
        </div>

        <div className="generator-tableWrap">
          <table className="generator-table">
            <thead>
              <tr>
                <th>Message ID</th>
                <th>Debtor</th>
                <th>Creditor</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((paymentState, pageIndex) => {
                const absoluteIndex = (currentPage - 1) * PAGE_SIZE + pageIndex;
                const payment: SepaInstantPayment = buildPayment(paymentState);

                return (
                  <tr key={payment.messageId}>
                    <td>{payment.messageId}</td>
                    <td>{payment.debtor.name}</td>
                    <td>{payment.creditor.name}</td>
                    <td>EUR {payment.amount.instructedAmount.amount.toFixed(2)}</td>
                    <td>
                      <div className="generator-rowActions">
                        <button className="builder-copyButton" onClick={() => openEditor(absoluteIndex)} type="button">
                          Edit
                        </button>
                        <button
                          className="builder-copyButton"
                          onClick={() => downloadSingle(paymentState, "json")}
                          type="button"
                        >
                          JSON
                        </button>
                        <button
                          className="builder-copyButton"
                          onClick={() => downloadSingle(paymentState, "xml")}
                          type="button"
                        >
                          XML
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="generator-pagination">
          <button
            className="builder-copyButton"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="builder-copyButton"
            disabled={currentPage >= pageCount}
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </section>

      <Dialog.Root
        onOpenChange={(open) => {
          if (!open) {
            setEditingIndex(null);
            setEditingForm(null);
          }
        }}
        open={editingForm !== null}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="builder-dialogOverlay" />
          <Dialog.Content className="generator-editorDialog">
            <div className="builder-dialogHeader">
              <Dialog.Title className="builder-dialogTitle">Edit generated payment</Dialog.Title>
              <Dialog.Close asChild>
                <button aria-label="Close editor" className="builder-iconButton" type="button">
                  ×
                </button>
              </Dialog.Close>
            </div>
            {editingForm ? (
              <PaymentEditor
                form={editingForm}
                heroKicker="Generated Sample"
                heroLead="Review and adjust the generated payment before exporting it."
                heroTitle="Edit generated payment"
                setForm={setEditingPaymentForm}
                showLoadFromJson={false}
              />
            ) : null}
            <div className="builder-dialogActions">
              <Dialog.Close asChild>
                <button className="builder-copyButton" type="button">
                  Cancel
                </button>
              </Dialog.Close>
              <button className="builder-copyButton builder-primaryButton" onClick={saveEditedPayment} type="button">
                Save
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
