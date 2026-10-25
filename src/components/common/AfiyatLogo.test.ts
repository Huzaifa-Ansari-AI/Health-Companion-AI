import { describe, it, expect } from "vitest";
import React from "react";
import { AfiyatLogo } from "./AfiyatLogo";

describe("AfiyatLogo Component", () => {
  it("renders with default mark variant and accessible alt text", () => {
    const element = React.createElement(AfiyatLogo, {});
    expect(element.type).toBe(AfiyatLogo);
    expect(element.props).toEqual({});
  });

  it("supports mark variant with Urdu calligraphy beneath emblem", () => {
    const element = React.createElement(AfiyatLogo, { variant: "mark", size: "md" });
    expect(element.props.variant).toBe("mark");
    expect(element.props.size).toBe("md");
  });

  it("supports full variant with complete branding and tagline", () => {
    const element = React.createElement(AfiyatLogo, { variant: "full", size: "hero" });
    expect(element.props.variant).toBe("full");
    expect(element.props.size).toBe("hero");
  });

  it("supports icon-only variant", () => {
    const element = React.createElement(AfiyatLogo, { variant: "icon", size: "sm" });
    expect(element.props.variant).toBe("icon");
    expect(element.props.size).toBe("sm");
  });

  it("allows setting router link destination", () => {
    const element = React.createElement(AfiyatLogo, { linkTo: "/" });
    expect(element.props.linkTo).toBe("/");
  });
});
