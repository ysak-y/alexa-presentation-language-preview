import { LocalPackageImporter } from "../../../../utils/LocalPackageImporter";
import { expect } from "chai";
import * as sinon from "sinon";
import * as fs from "fs";

describe("LocalPackageImporter", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("#inflateAplPayload", () => {
    it("updates apl payload", () => {
      const newPayload = {
        document: {
          mainTemplate: {},
        },
        datasources: {},
      };

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);
      expect(payload).deep.equal(newPayload);
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

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);
      expect(payload).deep.equal(newPayload);
    });

    it("ignores import element if 'source' property starts with 'https://'", () => {
      const newPayload = {
        document: {
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
            {
              name: "remote-package",
              version: "1.0.0",
              source: "https://example.com",
            },
          ],
          mainTemplate: {},
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon.stub(fs, "readFileSync").returns(Buffer.from(JSON.stringify({})));

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);
      expect(payload.document["import"]).deep.equal([
        {
          name: "remote-package",
          version: "1.0.0",
          source: "https://example.com",
        },
      ]);
    });

    it("ignores import element if 'source' property starts with 'http://'", () => {
      const newPayload = {
        document: {
          import: [
            {
              name: "localPackage",
              version: "1.0.0",
              source: "./local-package.json",
            },
            {
              name: "remote-package",
              version: "1.0.0",
              source: "http://example.com",
            },
          ],
          mainTemplate: {},
        },
        datasources: {},
      };

      sinon.stub(fs, "existsSync").returns(true);
      sinon.stub(fs, "readFileSync").returns(Buffer.from(JSON.stringify({})));

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);
      expect(payload.document["import"]).deep.equal([
        {
          name: "remote-package",
          version: "1.0.0",
          source: "http://example.com",
        },
      ]);
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

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);

      expect(payload).deep.equal({
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

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);

      expect(payload.document["import"]).deep.equal(importItems);
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

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);

      expect(payload.document["mainTemplate"]).deep.equal({
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

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);

      expect(payload.document["version"]).deep.equal(versionOfPayload);
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

      function callinflateAplPayload() {
        packageImporter.inflateAplPayload("./", newPayload);
      }

      const packageImporter = new LocalPackageImporter();
      expect(callinflateAplPayload).throw();
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

      const packageImporter = new LocalPackageImporter();
      const payload = packageImporter.inflateAplPayload("./", newPayload);
      expect(payload.document.layouts).deep.equal(expectedPayload);
    });
  });
});
