import { describe, it, expect } from "vitest";
import React from "react";
import { CustomTagInput } from "./CustomTagInput";

describe("CustomTagInput Component", () => {
  it("creates component element with tags array and callbacks", () => {
    const onAdd = () => {};
    const onRemove = () => {};
    const tags = ["Frequent headaches", "Mild dizziness"];

    const element = React.createElement(CustomTagInput, {
      tags,
      onAddTag: onAdd,
      onRemoveTag: onRemove,
      placeholder: "Add symptoms...",
    });

    expect(element.type).toBe(CustomTagInput);
    expect(element.props.tags).toEqual(tags);
    expect(element.props.placeholder).toBe("Add symptoms...");
  });

  it("accepts custom badgeVariantClassName and disabled state", () => {
    const element = React.createElement(CustomTagInput, {
      tags: ["Gutka"],
      onAddTag: () => {},
      onRemoveTag: () => {},
      disabled: true,
      badgeVariantClassName: "bg-amber-50 text-amber-900",
    });

    expect(element.props.disabled).toBe(true);
    expect(element.props.badgeVariantClassName).toBe("bg-amber-50 text-amber-900");
  });
});
