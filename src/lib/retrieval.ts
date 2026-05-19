export interface Chunk {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  index: number;
}

interface TermIndex {
  [term: string]: { chunkId: string; count: number }[];
}

const projectIndexes = new Map<string, { chunks: Chunk[]; index: TermIndex; totalDocs: number }>();

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by","from",
  "as","is","was","are","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","can","need","this",
  "that","these","those","it","its","they","them","their","we","us","our","you",
  "your","he","she","him","her","his","not","no","nor","so","if","then","than",
  "too","very","just","about","above","after","again","all","also","any","because",
  "before","between","both","each","few","more","most","other","some","such","only",
  "own","same","into","over","under","up","out","off","down","here","there","when",
  "where","why","how","what","which","who","whom",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t) && isNaN(Number(t)));
}

function buildIndex(chunks: Chunk[]): TermIndex {
  const index: TermIndex = {};
  for (const chunk of chunks) {
    const tokens = tokenize(chunk.content);
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
    for (const [term, count] of counts) {
      if (!index[term]) index[term] = [];
      index[term].push({ chunkId: chunk.id, count });
    }
  }
  return index;
}

export function chunkText(text: string, fileName: string, fileId: string, maxSize: number = 800): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let current: string[] = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (currentLen + trimmed.length > maxSize && current.length > 0) {
      chunks.push({
        id: `${fileId}-${chunks.length}`,
        fileId, fileName,
        content: current.join("\n\n"),
        index: chunks.length,
      });
      current = [];
      currentLen = 0;
    }
    current.push(trimmed);
    currentLen += trimmed.length;
  }

  if (current.length > 0) {
    chunks.push({
      id: `${fileId}-${chunks.length}`,
      fileId, fileName,
      content: current.join("\n\n"),
      index: chunks.length,
    });
  }

  return chunks;
}

export function indexProjectFiles(projectId: string, fileContents: { id: string; name: string; content: string }[]): void {
  const allChunks: Chunk[] = [];
  for (const file of fileContents) {
    const chunks = chunkText(file.content, file.name, file.id);
    allChunks.push(...chunks);
  }
  const index = buildIndex(allChunks);
  projectIndexes.set(projectId, { chunks: allChunks, index, totalDocs: allChunks.length });
}

export function queryProjectChunks(projectId: string, query: string, topK: number = 5): Chunk[] {
  const idx = projectIndexes.get(projectId);
  if (!idx || idx.chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scores = new Map<string, number>();
  const chunkMap = new Map<string, Chunk>();
  for (const chunk of idx.chunks) chunkMap.set(chunk.id, chunk);

  for (const term of queryTokens) {
    const postings = idx.index[term];
    if (!postings) continue;
    const idf = Math.log((idx.totalDocs + 1) / (postings.length + 1)) + 1;
    const maxTf = Math.max(...postings.map((p) => p.count));
    for (const posting of postings) {
      scores.set(posting.chunkId, (scores.get(posting.chunkId) || 0) + (posting.count / maxTf) * idf);
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([chunkId]) => chunkMap.get(chunkId)!)
    .filter(Boolean);
}

export function clearProjectIndex(projectId: string): void {
  projectIndexes.delete(projectId);
}
