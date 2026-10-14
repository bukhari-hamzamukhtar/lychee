/**
 * The standards and procedure documents the analyst agent answers from.
 *
 * These belong in an Evolus knowledge library, which indexes them and returns
 * sources with each answer. Creating one needs a user-scoped API key that the
 * application key cannot stand in for, so until that exists they are passed to
 * the agent as context on each call. The agent's instructions and its citation
 * behaviour are identical either way; only retrieval differs.
 *
 * Server-side only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "data", "library");

const FILES = [
  { id: "EN61800-3", file: "en61800-3-approval.md", title: "EN 61800-3 EMC approval record" },
  { id: "UL61800-5-1", file: "ul61800-5-1-approval.md", title: "UL 61800-5-1 safety approval record" },
  { id: "QP-014", file: "obsolescence-procedure.md", title: "QP-014 obsolescence and substitution procedure" },
] as const;

export interface LibraryDoc {
  id: string;
  title: string;
  text: string;
}

let cache: LibraryDoc[] | null = null;

export function libraryDocs(): LibraryDoc[] {
  if (cache) return cache;
  cache = FILES.map(({ id, file, title }) => {
    try {
      return { id, title, text: readFileSync(join(DIR, file), "utf8") };
    } catch {
      // A missing document is survivable: the agent cites what it has and says
      // what it could not find, which is the behaviour we want anyway.
      return { id, title, text: "" };
    }
  }).filter((d) => d.text.length > 0);
  return cache;
}

/** Only the documents that mention the part, to keep the prompt tight. */
export function docsMentioning(partId: string): LibraryDoc[] {
  const all = libraryDocs();
  const hits = all.filter((d) => d.text.includes(partId));
  // The procedure applies regardless of whether it names the part.
  const procedure = all.find((d) => d.id === "QP-014");
  if (procedure && !hits.includes(procedure)) hits.push(procedure);
  return hits;
}

export function asContext(docs: LibraryDoc[]): string {
  return docs
    .map((d) => `--- DOCUMENT: ${d.title} (cite as ${d.id}) ---\n${d.text}`)
    .join("\n\n");
}
