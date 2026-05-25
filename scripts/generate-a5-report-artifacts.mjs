import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const sourcePath = path.join(root, "A5_TECH_REALIZATION_REPORT.md");
const baseName = "A5_TECH_REALIZATION_REPORT";
const htmlPath = path.join(root, `${baseName}.html`);
const docxPath = path.join(root, `${baseName}.docx`);
const pptxPath = path.join(root, `${baseName}.pptx`);
const pdfPath = path.join(root, `${baseName}.pdf`);

const markdown = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stripInlineMarkdown(value) {
  return String(value)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function renderInlineHtml(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="link">$1</span>');
}

function parseMarkdown(md) {
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: stripInlineMarkdown(heading[2]),
        raw: heading[2],
      });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const current = lines[i].trim();
        const cells = current
          .slice(1, current.endsWith("|") ? -1 : undefined)
          .split("|")
          .map((cell) => stripInlineMarkdown(cell));
        const isSeparator = cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
        if (!isSeparator) rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        blocks.push({ type: "table", rows });
      }
      continue;
    }

    const bullet = /^-\s+(.+)$/.exec(line);
    if (bullet) {
      blocks.push({ type: "bullet", text: stripInlineMarkdown(bullet[1]), raw: bullet[1] });
      i += 1;
      continue;
    }

    const ordered = /^(\d+)\.\s+(.+)$/.exec(line);
    if (ordered) {
      blocks.push({
        type: "ordered",
        number: ordered[1],
        text: stripInlineMarkdown(ordered[2]),
        raw: ordered[2],
      });
      i += 1;
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !/^- /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }

    const raw = paragraph.join(" ");
    blocks.push({ type: "paragraph", text: stripInlineMarkdown(raw), raw });
  }

  return blocks;
}

const blocks = parseMarkdown(markdown);

function renderHtml(blocksToRender) {
  const parts = [];
  for (const block of blocksToRender) {
    if (block.type === "heading") {
      const level = Math.min(block.level, 3);
      parts.push(`<h${level}>${renderInlineHtml(block.raw)}</h${level}>`);
    } else if (block.type === "paragraph") {
      parts.push(`<p>${renderInlineHtml(block.raw)}</p>`);
    } else if (block.type === "bullet") {
      parts.push(`<ul><li>${renderInlineHtml(block.raw)}</li></ul>`);
    } else if (block.type === "ordered") {
      parts.push(`<ol start="${escapeHtml(block.number)}"><li>${renderInlineHtml(block.raw)}</li></ol>`);
    } else if (block.type === "table") {
      const [head, ...body] = block.rows;
      parts.push("<table>");
      parts.push(`<thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>`);
      parts.push("<tbody>");
      for (const row of body) {
        parts.push(`<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`);
      }
      parts.push("</tbody></table>");
    }
  }

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A5 기술 실현 수준 보고서</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #5d6678;
      --line: #d8dee9;
      --panel: #f7f9fc;
      --accent: #0f766e;
      --soft: #eef7f5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: var(--ink);
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif;
      line-height: 1.62;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 48px 28px 72px;
    }
    h1 {
      margin: 0 0 18px;
      padding-bottom: 18px;
      border-bottom: 3px solid var(--accent);
      font-size: 34px;
      line-height: 1.22;
      letter-spacing: 0;
    }
    h2 {
      margin: 42px 0 14px;
      font-size: 24px;
      border-left: 5px solid var(--accent);
      padding-left: 12px;
    }
    h3 {
      margin: 28px 0 10px;
      font-size: 19px;
      color: #1f3d4d;
    }
    p { margin: 10px 0; }
    strong { color: #0b5f59; }
    code {
      padding: 2px 5px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--panel);
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.92em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px;
      table-layout: fixed;
      font-size: 14px;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 10px 11px;
      vertical-align: top;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    th {
      background: var(--soft);
      color: #153b39;
      text-align: left;
      font-weight: 700;
    }
    tr:nth-child(even) td { background: #fbfcfe; }
    ul, ol { margin: 8px 0 8px 22px; padding: 0; }
    li { margin: 4px 0; }
    .link { color: var(--accent); }
    @media print {
      body { background: #fff; }
      main { max-width: none; padding: 24mm 18mm; }
      h1, h2, h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    ${parts.join("\n    ")}
  </main>
</body>
</html>
`;
}

function crc32Buffer(buffer) {
  let table = crc32Buffer.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    crc32Buffer.table = table;
  }

  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function zipFiles(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name.replaceAll("\\", "/"), "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32Buffer(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function wordText(text, options = {}) {
  const style = options.style ? `<w:pStyle w:val="${options.style}"/>` : "";
  const spacing = options.spacing ? `<w:spacing w:after="${options.spacing}"/>` : "";
  const bullet = options.prefix ? `${options.prefix} ` : "";
  const runProps = options.bold ? "<w:rPr><w:b/></w:rPr>" : "";
  return `<w:p><w:pPr>${style}${spacing}</w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(bullet + text)}</w:t></w:r></w:p>`;
}

function wordTable(rows) {
  const columnCount = Math.max(...rows.map((row) => row.length));
  const grid = Array.from({ length: columnCount }, () => '<w:gridCol w:w="2600"/>').join("");
  const renderedRows = rows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: columnCount }, (_, index) => row[index] ?? "")
        .map((cell) => {
          const fill = rowIndex === 0 ? '<w:shd w:fill="EAF6F3"/>' : "";
          const bold = rowIndex === 0;
          return `<w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/>${fill}</w:tcPr>${wordText(cell, { bold })}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D8DEE9"/><w:left w:val="single" w:sz="4" w:color="D8DEE9"/><w:bottom w:val="single" w:sz="4" w:color="D8DEE9"/><w:right w:val="single" w:sz="4" w:color="D8DEE9"/><w:insideH w:val="single" w:sz="4" w:color="D8DEE9"/><w:insideV w:val="single" w:sz="4" w:color="D8DEE9"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${renderedRows}</w:tbl>`;
}

function buildDocx() {
  const body = [];
  for (const block of blocks) {
    if (block.type === "heading") {
      const style = block.level === 1 ? "Title" : block.level === 2 ? "Heading1" : "Heading2";
      body.push(wordText(block.text, { style, spacing: block.level === 1 ? 360 : 180 }));
    } else if (block.type === "paragraph") {
      body.push(wordText(block.text, { spacing: 120 }));
    } else if (block.type === "bullet") {
      body.push(wordText(block.text, { prefix: "•", spacing: 80 }));
    } else if (block.type === "ordered") {
      body.push(wordText(block.text, { prefix: `${block.number}.`, spacing: 80 }));
    } else if (block.type === "table") {
      body.push(wordTable(block.rows));
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body.join("\n")}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:sz w:val="21"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="0F766E"/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="172033"/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="1F3D4D"/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>`;

  return zipFiles([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "word/document.xml", data: documentXml },
    { name: "word/styles.xml", data: stylesXml },
    {
      name: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>A5 기술 실현 수준 보고서</dc:title><dc:creator>Codex</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026-05-25T14:16:00+09:00</dcterms:created></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Codex</Application></Properties>`,
    },
  ]);
}

const slideData = [
  {
    title: "A5 기술 실현 수준",
    bullets: [
      "작성 기준: 2026-05-25 14:16 KST",
      "폐쇄몰 화면/데이터 구조/통합 경계가 구현된 베타 기술 검증 단계",
      "MVP 데모 기준 60~70%, 상용 운영 기준 35~45%",
    ],
  },
  {
    title: "현재 실현된 영역",
    bullets: [
      "고객/태블릿/관리자/기업/조리원 주요 화면 구현",
      "Firestore products 읽기와 mock fallback 구현",
      "CMS Firestore/Storage helper와 A5 컬렉션 정렬",
      "Firebase Functions payments ready/confirm/webhook/cancel skeleton 준비",
    ],
  },
  {
    title: "검증 결과",
    bullets: [
      "통과: check:env, check:no-secrets, route check 69개, Functions build",
      "실패: root lint - functions/lib 생성 JS가 검사 대상에 포함",
      "실패: root build - OrderStatus 타입과 refunded 상태 불일치",
    ],
  },
  {
    title: "운영 차단 경계",
    bullets: [
      "실제 PG 승인/취소/환불 API 미연결",
      "주문/결제/재고 Firestore transaction 미완료",
      "Custom Claims와 seed/admin 계정 권한 검증 필요",
      "Alimtalk, 배송, 외부 재고, A4 API 계약 대기",
    ],
  },
  {
    title: "다음 우선순위",
    bullets: [
      "OrderStatus 불일치 수정 후 next build 복구",
      "functions/lib를 ESLint ignore에 추가",
      "Firebase claims 준비 후 CMS/Storage write 1건씩 검증",
      "PG sandbox 문서/키 확보 후 mock confirm을 실제 adapter로 교체",
    ],
  },
  {
    title: "결론",
    bullets: [
      "볼 수 있는 폐쇄몰과 일부 Firebase 베타 연결은 도달",
      "상용 결제 운영 가능 상태는 아님",
      "build/lint 복구, Firebase 권한, PG transaction 구현이 다음 관문",
    ],
  },
];

function txBox(id, x, y, w, h, text, fontSize, bold = false, color = "172033") {
  const safe = escapeXml(text);
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:rPr lang="ko-KR" sz="${fontSize}" ${bold ? 'b="1"' : ""}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/></a:rPr><a:t>${safe}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function slideXml(slide, index) {
  const bulletShapes = slide.bullets
    .map((bullet, bulletIndex) =>
      txBox(10 + bulletIndex, 950000, 1750000 + bulletIndex * 720000, 10400000, 520000, `• ${bullet}`, 2200, false, "253247"),
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="220000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="0F766E"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>
      ${txBox(3, 680000, 560000, 10900000, 820000, slide.title, 3300, true, "0F766E")}
      ${txBox(4, 680000, 1260000, 10900000, 320000, `A5 기술 실현 수준 보고서 · ${index + 1}/${slideData.length}`, 1250, false, "667085")}
      ${bulletShapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function buildPptx() {
  const slideFiles = slideData.map((slide, index) => ({
    name: `ppt/slides/slide${index + 1}.xml`,
    data: slideXml(slide, index),
  }));
  const slideRels = slideData.map((_, index) => ({
    name: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
  }));
  const slideOverrides = slideData
    .map(
      (_, index) =>
        `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    )
    .join("");
  const slideIds = slideData
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  const presentationRels = [
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`,
    ...slideData.map(
      (_, index) =>
        `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`,
    ),
  ].join("");

  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slideOverrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "ppt/presentation.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presentationRels}</Relationships>`,
    },
    {
      name: "ppt/slideMasters/slideMaster1.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
    },
    {
      name: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`,
    },
    {
      name: "ppt/slideLayouts/slideLayout1.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    },
    {
      name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
    },
    {
      name: "ppt/theme/theme1.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="A5"><a:themeElements><a:clrScheme name="A5"><a:dk1><a:srgbClr val="172033"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="253247"/></a:dk2><a:lt2><a:srgbClr val="F7F9FC"/></a:lt2><a:accent1><a:srgbClr val="0F766E"/></a:accent1><a:accent2><a:srgbClr val="2563EB"/></a:accent2><a:accent3><a:srgbClr val="D97706"/></a:accent3><a:accent4><a:srgbClr val="BE123C"/></a:accent4><a:accent5><a:srgbClr val="475569"/></a:accent5><a:accent6><a:srgbClr val="16A34A"/></a:accent6><a:hlink><a:srgbClr val="0F766E"/></a:hlink><a:folHlink><a:srgbClr val="0F766E"/></a:folHlink></a:clrScheme><a:fontScheme name="A5"><a:majorFont><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/></a:majorFont><a:minorFont><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/></a:minorFont></a:fontScheme><a:fmtScheme name="A5"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
    },
    {
      name: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>A5 기술 실현 수준 보고서</dc:title><dc:creator>Codex</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026-05-25T14:16:00+09:00</dcterms:created></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Codex</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slideData.length}</Slides></Properties>`,
    },
    ...slideFiles,
    ...slideRels,
  ];

  return zipFiles(files);
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function renderPdf() {
  fs.rmSync(pdfPath, { force: true });

  const browser = findBrowser();
  let browserStatus = "skipped: Chrome/Edge executable was not found";

  if (browser) {
    const userDataDir = path.join(root, ".tmp-a5-report-browser");
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.mkdirSync(userDataDir, { recursive: true });

    const args = [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-software-rasterizer",
      "--disable-gpu-sandbox",
      "--disable-dev-shm-usage",
      "--disable-features=VizDisplayCompositor",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ];

    let result = spawnSync(browser, args, { encoding: "utf8", timeout: 60000 });

    if (result.status !== 0) {
      const fallbackArgs = args.map((arg) => (arg === "--headless=new" ? "--headless" : arg));
      result = spawnSync(browser, fallbackArgs, { encoding: "utf8", timeout: 60000 });
    }

    fs.rmSync(userDataDir, { recursive: true, force: true });

    if (result.status === 0 && fs.existsSync(pdfPath)) {
      return "created";
    }

    browserStatus = `browser failed: ${(result.stderr || result.stdout || "unknown browser error").trim()}`;
  }

  const wordStatus = renderPdfWithWord();
  return wordStatus === "created" ? "created by Word fallback" : `${browserStatus}; Word fallback ${wordStatus}`;
}

function psString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function renderPdfWithWord() {
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `$pdfPath = ${psString(pdfPath)}`,
    `$docxPath = ${psString(docxPath)}`,
    "$word = New-Object -ComObject Word.Application",
    "$word.Visible = $false",
    "$doc = $word.Documents.Open($docxPath)",
    "$doc.ExportAsFixedFormat($pdfPath, 17)",
    "$doc.Close($false)",
    "$word.Quit()",
  ].join("; ");

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    timeout: 120000,
  });

  if (result.status === 0 && fs.existsSync(pdfPath)) {
    return "created";
  }

  return `failed: ${(result.stderr || result.stdout || "unknown Word COM error").trim()}`;
}

fs.writeFileSync(htmlPath, renderHtml(blocks), "utf8");
fs.writeFileSync(docxPath, buildDocx());
fs.writeFileSync(pptxPath, buildPptx());
const pdfStatus = renderPdf();

console.log("Created:");
for (const file of [htmlPath, docxPath, pptxPath]) {
  console.log(`- ${file}`);
}
console.log(`- ${pdfPath}: ${pdfStatus}`);
