import { describe, it, expect } from "vitest";
import { TOTPGenerator } from "./totp";

//const secret = "7N4X4QMWPNQVVIGK3U64LYQCMIW53LW6";
//const secret = "KON4IP2F5PCJH3OJD7RXVWJOGGIPF3NV";
const secret = "HCDHJ3TIPFYDLLXN2JE3S54OOPVPJ47L";
//const secretBase32 = "G5HDIWBUKFGVOUCOKFLFMSKHJMZVKNRUJRMVCQ2NJFLTKM2MK43A====";
//const secretBase32 = "JNHU4NCJKAZEMNKQINFEQM2PJJCDOUSYKZLUUT2HI5EVARRTJZLA====";
//const secretBase32 = "JBBUISCKGNKESUCGLFCEYTCYJYZEURJTKM2TIT2PKBLFASRUG5GA====";
const secretBase32 = "HCDHJ3TIPFYDLLXN2JE3S54OOPVPJ47L";
describe("TOTP Tests", () => {
  it.skip("should decode a base32 encrypted string", () => {
    const generator = new TOTPGenerator(secretBase32);
    const decoded = generator["base32Decode"](secretBase32);
    expect(decoded.toString()).toEqual(secret);
  });
  it("should generate a TOTP", () => {
    const generator = new TOTPGenerator(secretBase32);
    const currentTime = Math.floor(Date.now() / 1000);
    const totp = generator.generate();
    console.log(`Current code ${totp}`);
    console.log(`Previous code ${generator.generate(currentTime - 30)}`);
    console.log(`Next code ${generator.generate(currentTime + 30)}`);
    console.log(generator.getTimeWindow());
  });
});
