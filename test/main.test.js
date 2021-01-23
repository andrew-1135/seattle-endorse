/* eslint-disable no-undef */
// eslint-disable-next-line import/no-unresolved
import { expect } from "@esm-bundle/chai";
import * as main from "./exported-main";

describe("findSingleNumber", () => {
  it("Finds a single number", () => {
    expect(main.findSingleNumber("Senate 5")).to.equal("5");
  });
});

describe("expandExecutive", () => {
  it("Expands an executive office", () => {
    expect(main.expandExecutive("Lt. Governor")).to.equal("Lieutenant Governor");
  });
});

describe("expandMeasure", () => {
  it("Expands a ballot measure", () => {
    expect(main.expandMeasure("Prop. 1")).to.equal("Proposition No.\u00A01");
  });
});

describe("fullToKebab", () => {
  it("Converts normal text to kebab-case", () => {
    const result = main.fullToKebab("United States Senator");
    expect(result).to.equal("united-states-senator");
  });
});

describe("camelToKebab", () => {
  it("Converts camelCase to kebab-case", () => {
    expect(main.camelToKebab("partyName")).to.equal("party-name");
  });
});

describe("newTextContent", () => {
  it("Creates a new element with text content", () => {
    const newElem = main.newTextContent("p", "Hello there!");
    expect(newElem.nodeName).to.equal("P");
    expect(newElem.textContent).to.equal("Hello there!");
  });
});
