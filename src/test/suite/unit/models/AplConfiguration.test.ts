import { expect } from "chai";
import * as sinon from "sinon";
import { AplConfiguration } from "../../../../models/AplConfiguration";
import * as fs from "fs";

describe("AplConfiguration", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("#setAndInflateAplPayload", () => {
    it("updates apl payload", () => {
      const newPayload = {
        document: {
          mainTemplate: {},
        },
        datasources: {},
      };

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);
      expect(aplConfiguration.aplPayload).deep.equal(newPayload);
    });

    it("ignores import element if it doesn't have 'source' property", () => {
      const newPayload = {
        document: {
          import: [
            {
              name: "alexa-layouts",
              version: "1.5.0",
            },
          ],
          mainTemplate: {},
        },
        datasources: {},
      };

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);
      expect(aplConfiguration.aplPayload).deep.equal(newPayload);
    });

    it("merges document from local if element has 'source' property and remove element from 'import'", () => {
      const targetDocument = {
        layouts: {},
      };
      const newPayload = {
        document: {
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
          ],
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon
        .stub(fs, "readFileSync")
        .returns(Buffer.from(JSON.stringify(targetDocument)));

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);

      expect(aplConfiguration.aplPayload).deep.equal({
        document: {
          import: [],
          layouts: {},
        },
        datasources: {},
      });
    });

    it("remains to 'import' property if element has 'source' property and it is url form", () => {
      const importItems = [
        {
          name: "localPackage",
          version: "1.0.0",
          source: "https://example.com/local-package.json",
        },
      ];

      const newPayload = {
        document: {
          import: importItems,
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon.stub(fs, "readFileSync").returns(Buffer.from(JSON.stringify({})));

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);

      expect(aplConfiguration.aplPayload.document["import"]).deep.equal(
        importItems
      );
    });

    it("doesn't merge 'mainTemplate' from local package", () => {
      const targetDocument = {
        mainTemplate: {
          parameters: [],
          items: [
            {
              type: "Container",
            },
          ],
        },
      };
      const newPayload = {
        document: {
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
          ],
          mainTemplate: {
            items: [
              {
                type: "Container",
              },
            ],
          },
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon
        .stub(fs, "readFileSync")
        .returns(Buffer.from(JSON.stringify(targetDocument)));

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);

      expect(aplConfiguration.aplPayload.document["mainTemplate"]).deep.equal({
        items: [
          {
            type: "Container",
          },
        ],
      });
    });

    it("doesn't merge if property doesn't have object value", () => {
      const versionOfPayload = "2022.1";
      const targetDocument = {
        version: "1.9",
      };
      const newPayload = {
        document: {
          version: versionOfPayload,
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
          ],
          mainTemplate: {
            items: [
              {
                type: "Container",
              },
            ],
          },
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon
        .stub(fs, "readFileSync")
        .returns(Buffer.from(JSON.stringify(targetDocument)));

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);

      expect(aplConfiguration.aplPayload.document["version"]).deep.equal(
        versionOfPayload
      );
    });

    it("throws error if failed to load local package", () => {
      const newPayload = {
        document: {
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
          ],
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon.stub(fs, "readFileSync").throws();

      function callSetAndInflateAplPayload() {
        aplConfiguration.setAndInflateAplPayload("./", newPayload);
      }

      const aplConfiguration = new AplConfiguration();
      expect(callSetAndInflateAplPayload).throw();
    });

    it("remains property of original document even if imported package has same property", () => {
      const targetDocument = {
        layouts: {
          CustomLayout: {
            parameters: [],
            items: [
              {
                type: "Container",
                items: [],
              },
            ],
          },
        },
      };

      const expectedPayload = {
        CustomLayout: {
          parameters: [],
          items: [
            {
              type: "Text",
            },
          ],
        },
      };

      const newPayload = {
        document: {
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
          ],
          layouts: expectedPayload,
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon
        .stub(fs, "readFileSync")
        .returns(Buffer.from(JSON.stringify(targetDocument)));

      const aplConfiguration = new AplConfiguration();
      aplConfiguration.setAndInflateAplPayload("./", newPayload);
      expect(aplConfiguration.aplPayload.document.layouts).deep.equal(
        expectedPayload
      );
    });
  });
});
