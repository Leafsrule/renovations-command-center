// @vitest-environment jsdom
import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AlphabeticalSelect } from "./AlphabeticalSelect";
afterEach(cleanup);
it("sorts visible labels across mapped and static options without changing values or selection", () => {
  const change = vi.fn();
  const view = render(
    <AlphabeticalSelect value="stock" onChange={change}>
      <option value="">Choose status</option>
      <option value="stock">Stock</option>
      {[
        { value: "partial", label: "Partially Received" },
        { value: "received", label: "Received" },
      ].map((x) => (
        <option key={x.value} value={x.value}>
          {x.label}
        </option>
      ))}
      <option value="ordered">Ordered</option>
    </AlphabeticalSelect>,
  );
  const select = view.getByRole("combobox") as HTMLSelectElement;
  expect(Array.from(select.options).map((o) => o.text)).toEqual([
    "Choose status",
    "Ordered",
    "Partially Received",
    "Received",
    "Stock",
  ]);
  expect(select.value).toBe("stock");
  fireEvent.change(select, { target: { value: "ordered" } });
  expect(change).toHaveBeenCalledOnce();
});
