import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUIDE_DIR = resolve(__dirname, '../../fastapi-learning-guide');
const OUTPUT_DIR = resolve(__dirname, '../src/data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'code-snippets.json');

const FENCE_RE = /^```(\w*)/;
const CONTEXT_PREFIX_RE = /^(?:Tema:|Subtopic:)\s*/i;

function cleanContext(raw) {
  return raw.replace(CONTEXT_PREFIX_RE, '').trim();
}

function extractSubtopics(markdown, fileSlug, fileOrder) {
  const rawSubtopics = [];
  const lines = markdown.split('\n');
  let i = 0;
  let currentSubtopic = null;
  let snippetOrder = 0;
  let inCodeBlock = false;
  let description = '';
  let collectingDescription = false;

  while (i < lines.length) {
    const line = lines[i];

    // Detect ## heading → new subtopic
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      // Save previous subtopic
      if (currentSubtopic && currentSubtopic.snippets.length > 0) {
        rawSubtopics.push(currentSubtopic);
      }
      const title = cleanContext(h2Match[1].trim()).replace(/^\d+\.\s*/, '');
      currentSubtopic = {
        title,
        snippets: [],
      };
      collectingDescription = true;
      description = '';
    }

    // Detect ### heading → snippet context
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match && currentSubtopic) {
      collectingDescription = true;
      description = '';
    }

    // Detect code fence
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch && !inCodeBlock && currentSubtopic) {
      inCodeBlock = true;
      const lang = fenceMatch[1] || '';
      const codeLines = [];
      // Get context from previous h3 or h2 heading
      let context = '';
      let j = i - 1;
      while (j >= 0) {
        const prev = lines[j];
        const h3 = prev.match(/^###\s+(.+)/);
        if (h3) { context = cleanContext(h3[1].trim()); break; }
        const h2 = prev.match(/^##\s+(.+)/);
        if (h2) { break; }
        j--;
      }

      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      inCodeBlock = false;
      const code = codeLines.join('\n').trim();
      if (code) {
        currentSubtopic.snippets.push({
          id: `${fileSlug}-${snippetOrder}`,
          order: snippetOrder,
          lang: lang || 'text',
          code,
          context,
          description: description.trim(),
        });
        snippetOrder++;
        collectingDescription = true;
        description = '';
      }
    } else if (!inCodeBlock && collectingDescription && currentSubtopic) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('---') && !trimmed.startsWith('>') && !trimmed.match(/^#{1,3}\s/) && !trimmed.startsWith('|') && !trimmed.match(/^- /)) {
        if (description) description += ' ';
        description += trimmed;
      }
    }

    i++;
  }

  // Save last subtopic
  if (currentSubtopic && currentSubtopic.snippets.length > 0) {
    rawSubtopics.push(currentSubtopic);
  }

  // Number subtopics sequentially (skip empty ones)
  const subtopics = rawSubtopics.map((st, idx) => ({
    number: `${String(fileOrder).padStart(2, '0')}.${idx + 1}`,
    title: st.title,
    snippets: st.snippets,
  }));

  return subtopics;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : '';
}

function extractOrder(filename) {
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function slugify(filename) {
  return filename.replace(/\.md$/, '');
}

const files = readdirSync(GUIDE_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

const result = { files: [] };

for (const file of files) {
  const content = readFileSync(join(GUIDE_DIR, file), 'utf-8');
  const slug = slugify(file);
  const title = extractTitle(content);
  const order = extractOrder(file);
  const subtopics = extractSubtopics(content, slug, order);
  const totalSnippets = subtopics.reduce((s, t) => s + t.snippets.length, 0);

  result.files.push({
    slug,
    title,
    file,
    fileOrder: order,
    subtopics,
  });

  console.log(`📄 ${file} — ${subtopics.length} subtemas, ${totalSnippets} snippets`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

const totalSubtopics = result.files.reduce((s, f) => s + f.subtopics.length, 0);
const totalSnippets = result.files.reduce((s, f) => s + f.subtopics.reduce((s2, t) => s2 + t.snippets.length, 0), 0);
console.log(`\n✅ Done! ${result.files.length} files, ${totalSubtopics} subtemas, ${totalSnippets} snippets → ${OUTPUT_FILE}`);
