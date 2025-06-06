import type {
  CodeDefinition,
  DocNode as ADFDoc,
  EmDefinition,
  LinkDefinition,
  PanelType as ADFPanelType,
  StrongDefinition,
  SubSupDefinition,
  TextDefinition,
} from "@atlaskit/adf-schema/schema";
import Chance from "chance";
import { u } from "unist-builder";
import { expect, it } from "vitest";

import { fromADF as convert } from ".";

const seed = process.env.SEED;
const random = seed ? new Chance(seed) : new Chance();

type MarkDefinition =
  | StrongDefinition
  | EmDefinition
  | CodeDefinition
  | LinkDefinition
  | SubSupDefinition;

function textWithMarks(text: string, marks: MarkDefinition[]): TextDefinition {
  return {
    type: "text",
    text,
    marks,
  };
}

function doc(content: ADFDoc["content"]): ADFDoc {
  return { version: 1, type: "doc", content };
}

it("converts empty documents", () => {
  expect(convert(doc([]))).toEqual(u("root", []));
});

it("converts simple documents", () => {
  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            textWithMarks("World", [{ type: "strong" }]),
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("paragraph", [u("text", "Hello "), u("strong", [u("text", "World")])]),
    ]),
  );
});

(
  [
    ["strong text", "strong", "strong"],
    ["emphasized text", "em", "emphasis"],
    ["strikethrough text", "strike", "delete"],
  ] as const
).forEach(([description, mark, type]) => {
  it(`converts ${description}`, () => {
    const text = random.word();

    expect(
      convert(
        doc([
          {
            type: "paragraph",
            content: [
              { type: "text", text: "formatted: " },
              { type: "text", marks: [{ type: mark }], text },
            ],
          },
        ]),
      ),
    ).toEqual(
      u("root", [
        u("paragraph", [u("text", "formatted: "), u(type, [u("text", text)])]),
      ]),
    );
  });
});

it("converts strong emphasized text", () => {
  const text = random.word();

  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "strong & emphasized: " },
            textWithMarks(text, [{ type: "em" }, { type: "strong" }]),
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("paragraph", [
        u("text", "strong & emphasized: "),
        u("strong", [u("emphasis", [u("text", text)])]),
      ]),
    ]),
  );
});

it("converts inline code", () => {
  const text = random.hash();

  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is " },
            textWithMarks(text, [{ type: "code" }]),
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [u("paragraph", [u("text", "This is "), u("inlineCode", text)])]),
  );
});

(
  [
    ["subscript text", "sub"],
    ["superscript text", "sup"],
  ] as const
).forEach(([description, type]) => {
  it(`converts ${description}`, () => {
    expect(
      convert(
        doc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
              },
              textWithMarks("2", [{ type: "subsup", attrs: { type } }]),
            ],
          },
        ]),
      ),
    ).toEqual(
      u("root", [
        u("paragraph", [u("text", "x"), u("html", `<${type}>2</${type}>`)]),
      ]),
    );
  });
});

it("converts links", () => {
  const text = random.word();
  const url = random.url();

  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            textWithMarks(text, [{ type: "link", attrs: { href: url } }]),
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [u("paragraph", [u("link", { url }, [u("text", text)])])]),
  );
});

[1, 2, 3, 4, 5, 6].forEach((level) => {
  it(`converts headings (${level})`, () => {
    const text = random.sentence({ words: 3 });

    expect(
      convert(
        doc([
          {
            type: "heading",
            attrs: { level },
            content: [{ type: "text", text }],
          },
        ]),
      ),
    ).toEqual(u("root", [u("heading", { depth: level }, [u("text", text)])]));
  });
});

it("converts code blocks", () => {
  expect(
    convert(
      doc([
        {
          type: "codeBlock",
          attrs: {
            language: "typescript",
          },
          content: [
            {
              type: "text",
              text: 'import { fromADF } from "mdast-util-from-adf";',
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u(
        "code",
        { lang: "typescript" },
        'import { fromADF } from "mdast-util-from-adf";',
      ),
    ]),
  );
});

(
  [
    ["lists (bullet)", "bulletList", false],
    ["lists (ordered)", "orderedList", true],
  ] as const
).forEach(([description, type, ordered]) => {
  it(`converts ${description}`, () => {
    expect(
      convert(
        doc([
          {
            type,
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "one" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "two" }],
                  },
                ],
              },
            ],
          },
        ]),
      ),
    ).toEqual(
      u("root", [
        u("list", { ordered, spread: false }, [
          u("listItem", { spread: false }, [
            u("paragraph", [u("text", "one")]),
          ]),
          u("listItem", { spread: false }, [
            u("paragraph", [u("text", "two")]),
          ]),
        ]),
      ]),
    );
  });
});

it("converts lists (task)", () => {
  expect(
    convert(
      doc([
        {
          type: "taskList",
          attrs: {
            localId: "11244654-2201-4973-b974-522b697d2327",
          },
          content: [
            {
              type: "taskItem",
              attrs: {
                localId: "8acdda43-05dd-4eb0-881d-33e7c59c699f",
                state: "DONE",
              },
              content: [{ type: "text", text: "Completed" }],
            },
            {
              type: "taskItem",
              attrs: {
                localId: "89571672-56da-406b-a8b8-6c9156556167",
                state: "TODO",
              },
              content: [{ type: "text", text: "To be done" }],
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("list", { ordered: false, spread: false }, [
        u("listItem", { checked: true, spread: false }, [
          u("paragraph", [u("text", "Completed")]),
        ]),
        u("listItem", { checked: false, spread: false }, [
          u("paragraph", [u("text", "To be done")]),
        ]),
      ]),
    ]),
  );
});

it("converts lists (decision)", () => {
  expect(
    convert(
      doc([
        {
          type: "decisionList",
          attrs: {
            localId: "11244654-2201-4973-b974-522b697d2327",
          },
          content: [
            {
              type: "decisionItem",
              attrs: {
                localId: "8acdda43-05dd-4eb0-881d-33e7c59c699f",
                state: "DECIDED",
              },
              content: [{ type: "text", text: "Decided" }],
            },
            {
              type: "decisionItem",
              attrs: {
                localId: "89571672-56da-406b-a8b8-6c9156556167",
                state: "UNDECIDED",
              },
              content: [{ type: "text", text: "Undecided" }],
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("list", { ordered: false, spread: false }, [
        u("listItem", { checked: true, spread: false }, [
          u("paragraph", [u("text", "Decided")]),
        ]),
        u("listItem", { checked: false, spread: false }, [
          u("paragraph", [u("text", "Undecided")]),
        ]),
      ]),
    ]),
  );
});

it("converts block quotes", () => {
  const text = random.sentence();

  expect(
    convert(
      doc([
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        },
      ]),
    ),
  ).toEqual(u("root", [u("blockquote", [u("paragraph", [u("text", text)])])]));
});

it("converts dividers", () => {
  expect(
    convert(
      doc([
        { type: "paragraph", content: [{ type: "text", text: "Before" }] },
        { type: "rule" },
        { type: "paragraph", content: [{ type: "text", text: "After" }] },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("paragraph", [u("text", "Before")]),
      u("thematicBreak"),
      u("paragraph", [u("text", "After")]),
    ]),
  );
});

it("converts emoji", () => {
  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            {
              type: "emoji",
              attrs: {
                shortName: ":projector:",
                id: "1f4fd",
                text: "📽",
              },
            },
            {
              type: "emoji",
              attrs: {
                shortName: ":boom:",
                id: "0000",
              },
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [u("paragraph", [u("text", "📽"), u("text", ":boom:")])]),
  );
});

it("converts mentions", () => {
  const name = random.first();

  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: {
                id: "557058:aafbc62f-3aa7-444a-8c18-42168d05183d",
                text: name,
                accessLevel: "",
              },
            },
          ],
        },
      ]),
    ),
  ).toEqual(u("root", [u("paragraph", [u("text", `@${name}`)])]));
});

it("converts dates", () => {
  const timestamp = "2021-11-03T12:54:08.354Z";

  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [{ type: "date", attrs: { timestamp } }],
        },
      ]),
    ),
  ).toEqual(u("root", [u("paragraph", [u("text", timestamp)])]));
});

(
  [
    ["media (single)", "mediaSingle"],
    ["media (group)", "mediaGroup"],
  ] as const
).forEach(([description, type]) => {
  it(`converts ${description}`, () => {
    const id = random.guid();

    expect(
      convert(
        doc([
          {
            type,
            attrs: { layout: "center" },
            content: [
              {
                type: "media",
                attrs: {
                  id,
                  type: "file",
                  collection: "",
                  width: 1632,
                  height: 1372,
                },
              },
            ],
          },
        ]),
      ),
    ).toEqual(u("root", [u("html", `<!-- media: file ${id} -->`)]));
  });
});

it("converts cards (block)", () => {
  const url = random.url();

  expect(
    convert(
      doc([
        {
          type: "blockCard",
          attrs: { url },
        },
      ]),
    ),
  ).toEqual(
    u("root", [u("paragraph", [u("link", { url }, [u("text", url)])])]),
  );
});

it("converts cards (inline)", () => {
  const url = random.url();

  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [{ type: "inlineCard", attrs: { url } }],
        },
      ]),
    ),
  ).toEqual(
    u("root", [u("paragraph", [u("link", { url }, [u("text", url)])])]),
  );
});

it("converts cards (embed)", () => {
  const url = random.url();

  expect(
    convert(
      doc([
        {
          type: "embedCard",
          attrs: { layout: "center", url },
        },
      ]),
    ),
  ).toEqual(u("root", [u("link", { url }, [u("text", url)])]));
});

(["info", "note", "success", "warning", "error"] as ADFPanelType[]).forEach(
  (type) => {
    it(`converts panels (${type})`, () => {
      const text = random.string();

      expect(
        convert(
          doc([
            {
              type: "panel",
              attrs: { panelType: type },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text }],
                },
              ],
            },
          ]),
        ),
      ).toEqual(u("root", [u("paragraph", [u("text", text)])]));
    });
  },
);

it("converts layout containers", () => {
  const content = random.string();

  expect(
    convert(
      doc([
        {
          type: "layoutSection",
          content: [
            {
              type: "layoutColumn",
              attrs: { width: 100 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: content }],
                },
              ],
            },
          ],
        },
      ]),
    ),
  ).toEqual(u("root", [u("paragraph", [u("text", content)])]));
});

it("converts expand", () => {
  const text = random.string();

  expect(
    convert(
      doc([
        {
          type: "expand",
          attrs: {},
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text }],
            },
          ],
        },
      ]),
    ),
  ).toEqual(u("root", [u("paragraph", [u("text", text)])]));
});

it("converts nested expand", () => {
  const text = random.string();

  expect(
    convert({
      version: 1,
      type: "doc",
      content: [
        {
          type: "nestedExpand",
          attrs: {},
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text }],
            },
          ],
        } as any,
      ],
    }),
  ).toEqual(u("root", [u("paragraph", [u("text", text)])]));
});

it("converts tables (basic)", () => {
  expect(
    convert(
      doc([
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell content" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("table", [
        u("tableRow", [
          u("tableCell", [u("paragraph", [u("text", "Cell content")])]),
        ]),
      ]),
    ]),
  );
});

it("converts tables (with headers)", () => {
  expect(
    convert(
      doc([
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Data 1" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Data 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("table", [
        u("tableRow", [
          u("tableCell", [u("paragraph", [u("text", "Header 1")])]),
          u("tableCell", [u("paragraph", [u("text", "Header 2")])]),
        ]),
        u("tableRow", [
          u("tableCell", [u("paragraph", [u("text", "Data 1")])]),
          u("tableCell", [u("paragraph", [u("text", "Data 2")])]),
        ]),
      ]),
    ]),
  );
});

it("converts tables (with formatted content)", () => {
  expect(
    convert(
      doc([
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Normal " },
                        textWithMarks("bold", [{ type: "strong" }]),
                        { type: "text", text: " text" },
                      ],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [textWithMarks("italic", [{ type: "em" }])],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("table", [
        u("tableRow", [
          u("tableCell", [
            u("paragraph", [
              u("text", "Normal "),
              u("strong", [u("text", "bold")]),
              u("text", " text"),
            ]),
          ]),
          u("tableCell", [
            u("paragraph", [u("emphasis", [u("text", "italic")])]),
          ]),
        ]),
      ]),
    ]),
  );
});

it("ignores placeholder nodes", () => {
  expect(
    convert(
      doc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Before placeholder" },
            {
              type: "placeholder",
              attrs: {
                text: "ミーティング参加者を @メンション名でリストします。",
              },
            },
            { type: "text", text: "After placeholder" },
          ],
        },
      ]),
    ),
  ).toEqual(
    u("root", [
      u("paragraph", [
        u("text", "Before placeholder"),
        u("text", "After placeholder"),
      ]),
    ]),
  );
});

it("ignores placeholder nodes in complex document", () => {
  expect(
    convert({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: {
            level: 2,
          },
          content: [
            {
              type: "emoji",
              attrs: {
                id: "1f5d3",
                text: "🗓",
                shortName: ":calendar_spiral:",
              },
            },
            {
              text: " 日付",
              type: "text",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "placeholder",
              attrs: {
                text: "ミーティング参加者を @メンション名でリストします。",
              },
            },
          ],
        },
      ],
      version: 1,
    }),
  ).toEqual(
    u("root", [
      u("heading", { depth: 2 }, [u("text", "🗓"), u("text", " 日付")]),
      u("paragraph", []),
    ]),
  );
});
