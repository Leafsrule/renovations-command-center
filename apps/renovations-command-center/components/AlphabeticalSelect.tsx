import {
  Children,
  isValidElement,
  type ReactNode,
  type ComponentPropsWithRef,
} from "react";
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children)
        : String(child),
    )
    .join("");
}
export function AlphabeticalSelect({
  children,
  ...props
}: ComponentPropsWithRef<"select">) {
  const choices = Children.toArray(children);
  const placeholder = (node: ReactNode) =>
    isValidElement<{ value?: unknown; children?: ReactNode }>(node) &&
    (node.props.value === "" ||
      text(node.props.children).startsWith("Choose "));
  choices.sort(
    (a, b) =>
      Number(placeholder(b)) - Number(placeholder(a)) ||
      text(a).localeCompare(text(b), "en", {
        sensitivity: "base",
        numeric: true,
      }),
  );
  return <select {...props}>{choices}</select>;
}
