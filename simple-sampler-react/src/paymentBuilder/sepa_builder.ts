import { createElement, useState } from "react";
export { PaymentEditor } from "./PaymentEditor.tsx";
export * from "./state.ts";

import { PaymentEditor } from "./PaymentEditor.tsx";
import { initialBuilderState } from "./state.ts";

export default function SepaBuilder() {
  const [form, setForm] = useState(initialBuilderState);

  return createElement(PaymentEditor, { form, setForm });
}
