---
url: "/projects/markitdown/"
title: "Microsoft MarkItDown 0.1.6: A Practical Document-to-Markdown Guide"
date: 2025-04-21T15:41:21+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Open Source
  - Python
  - LLM
  - RAG
  - Project Learning
categories:
  - Development
description: >
  Learn MarkItDown 0.1.6 for document-to-Markdown workflows, choose local, OCR, or Azure conversion, and test output quality before building a RAG pipeline.
aliases:
  - /posts/ai-projects/markitdown/
tldr:
  - "MarkItDown is an ingestion tool for turning many document formats into compact Markdown; it is not a layout-preserving publishing converter."
  - "Built-in extraction, the markitdown-ocr plugin, LLM image descriptions, Azure Document Intelligence, and Azure Content Understanding solve different problems."
  - "Choose a conversion path from document evidence, then measure coverage, reading order, tables, cost, latency, and failure behavior on your own corpus."
faq:
  - q: "What is Microsoft MarkItDown?"
    a: "MarkItDown is an open-source Python package from Microsoft that converts files such as PDF, DOCX, PPTX, XLSX, HTML, images, audio, EPUB, and ZIP archives into Markdown for text analysis and LLM workflows. It prioritizes useful content and lightweight structure rather than visual fidelity."
  - q: "Does MarkItDown 0.1.6 include OCR?"
    a: "Version 0.1.6 adds an OCR layer, but the practical OCR path is the separate markitdown-ocr plugin. It uses an OpenAI-compatible vision model to read embedded images in PDF, DOCX, PPTX, and XLSX, including full-page fallback for scanned PDFs. Plugins remain disabled unless explicitly enabled."
  - q: "What is the difference between MarkItDown OCR and Azure Document Intelligence?"
    a: "The markitdown-ocr plugin sends document images to an LLM vision endpoint and inserts recognized text into the normal conversion flow. Azure Document Intelligence is a billable cloud layout service intended for scanned PDFs, tables, and complex page structure. They are separate paths with different costs and failure modes."
  - q: "When should I use Azure Content Understanding?"
    a: "Use Azure Content Understanding when you need multimodal conversion across documents, images, audio, or video, structured field extraction, or custom analyzers. It can emit analyzer fields as YAML front matter. It is broader than the Document Intelligence integration and every routed conversion is a billable API call."
  - q: "How should I evaluate MarkItDown for RAG?"
    a: "Build a small representative corpus and score text coverage, reading order, heading and list preservation, table usability, duplicate content, latency, cost, and deterministic failure behavior. Compare downstream retrieval answers as well as the Markdown itself; attractive output is not proof of good retrieval."
cover:
  image: /images/covers/ai-agent/2025/markItdown.jpeg
  alt: "Documents flowing through a measured conversion pipeline into structured Markdown"
---

> A document converter is a bridge, not a source of truth. The important question is not whether the output looks clean at first glance, but whether the bridge preserves the evidence your next system needs.

MarkItDown is easy to demonstrate: install a package, pass it a file, receive Markdown. The difficult work begins one minute later. A PDF may contain selectable text, scanned pages, diagrams, tables, or all four. A slide deck may hide essential numbers inside screenshots. A spreadsheet may be understandable only through formulas, merged cells, and spatial relationships. No single conversion mode handles every case equally well.

This guide uses **MarkItDown 0.1.6**, released on May 26, 2026, as its factual baseline. It focuses on three questions:

1. How do I use MarkItDown without unnecessary complexity?
2. How do I choose among local extraction, OCR, and Azure services?
3. Where will the output fail, and how can I detect that before it reaches a RAG index?

The goal is not to make MarkItDown appear universal. It is to make its trade-offs visible.

## What MarkItDown Is—and Is Not

[MarkItDown](https://github.com/microsoft/markitdown) is an open-source Python utility for converting many common formats into Markdown. The official project lists support for PDF, Word, PowerPoint, Excel, images, audio, HTML, CSV, JSON, XML, ZIP archives, EPUB, YouTube URLs, and other inputs depending on installed extras.

Its target is machine-friendly text. Markdown preserves useful signals—headings, lists, links, tables, and code—without carrying the full visual model of a PDF or Office file. That makes it convenient for:

- preparing material for LLM prompts;
- creating text chunks for retrieval;
- normalizing mixed document collections;
- building searchable research archives;
- inspecting content in version control;
- extracting text before a separate analysis step.

MarkItDown is not a desktop-publishing converter. It does not promise pixel-perfect layout, identical pagination, exact typography, or a reversible round trip. If your requirement is “the result must look exactly like the source,” Markdown is probably the wrong target format.

This distinction matters most with PDFs. A PDF records how marks appear on pages; it does not necessarily encode a clean logical reading order. Two files that both end in `.pdf` may require entirely different extraction strategies.

## Install Only What You Need

MarkItDown requires Python 3.10 or later. For a quick evaluation, create an isolated environment and install all optional converters:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "markitdown[all]==0.1.6"
```

For a production service, install only the extras your corpus needs. Smaller environments reduce dependency conflicts, image size, and security surface:

```bash
# A document-oriented worker
python -m pip install \
  "markitdown[pdf,docx,pptx,xlsx]==0.1.6"

# Add Azure Document Intelligence support
python -m pip install \
  "markitdown[az-doc-intel]==0.1.6"

# Add Azure Content Understanding support
python -m pip install \
  "markitdown[az-content-understanding]==0.1.6"
```

Pinning the version is not ceremony. Conversion output is data-pipeline behavior: a parser upgrade can change headings, tables, whitespace, or reading order and therefore change chunk boundaries and retrieval results. Treat converter versions like schema versions.

### Command-line use

The smallest useful commands are:

```bash
# Write converted content to stdout
markitdown report.docx

# Save the result
markitdown report.docx -o report.md

# Convert stdin
curl -sS https://example.com | markitdown > example.md
```

Before a batch run, test one file from each important document family. A successful exit code proves that conversion completed; it does not prove that the important content survived.

### Python use

The regular API returns a result whose `text_content` contains the Markdown:

```python
from markitdown import MarkItDown

converter = MarkItDown(enable_plugins=False)
result = converter.convert("report.docx")

with open("report.md", "w", encoding="utf-8") as output:
    output.write(result.text_content)
```

MarkItDown 0.1.x performs conversions in memory. `convert_stream()` expects a binary stream, which is useful for uploads and object storage:

```python
from io import BytesIO
from markitdown import MarkItDown

converter = MarkItDown(enable_plugins=False)

payload = BytesIO(uploaded_bytes)
result = converter.convert_stream(payload, extension=".xlsx")
markdown = result.text_content
```

Keep the original filename, MIME type, converter version, and a checksum beside the output. Markdown without provenance becomes difficult to debug later.

## The Five Conversion Paths

MarkItDown 0.1.6 exposes several capabilities that are often collapsed into the word “OCR.” They should remain separate in your architecture.

### 1. Built-in, format-specific conversion

This is the default local path. It uses converters appropriate to the input format and requires no LLM or Azure service. It is usually the first choice for:

- text-based Office documents;
- ordinary HTML and structured text;
- spreadsheets whose useful content is in cells;
- born-digital PDFs with a simple reading order;
- workflows that require local processing and predictable marginal cost.

Its weakness is evidence that is not represented as ordinary document text. A screenshot inside a DOCX, a scan-only PDF, or a visually encoded chart may contribute little or nothing to the result. Local conversion can also flatten complex columns and tables.

Start here because it is cheap and inspectable, not because it is always sufficient.

### 2. LLM descriptions for images

MarkItDown can accept an OpenAI-compatible client and model to describe images. The official README currently identifies this capability for image and PPTX conversion:

```python
import os
from markitdown import MarkItDown
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

converter = MarkItDown(
    enable_plugins=False,
    llm_client=client,
    llm_model="gpt-4o",
    llm_prompt="Describe the diagram faithfully. Preserve labels and uncertainty.",
)

result = converter.convert("architecture.png")
print(result.text_content)
```

Image description and OCR overlap, but they are not identical. Description asks, “What does this image communicate?” OCR asks, “What text appears here?” A description may summarize a chart while omitting exact labels; OCR may recover labels while missing the chart’s relationship. Choose the prompt according to the evidence you need.

Both approaches send image content to a model endpoint. Review privacy, residency, retention, and cost before enabling them.

### 3. The `markitdown-ocr` plugin

The [official `markitdown-ocr` package](https://github.com/microsoft/markitdown/tree/main/packages/markitdown-ocr) extends PDF, DOCX, PPTX, and XLSX conversion. It extracts embedded images, sends them to an OpenAI-compatible vision model, and inserts recognized text into the converted document. For scanned PDFs it also provides a full-page OCR fallback.

Install the plugin and a compatible client:

```bash
python -m pip install markitdown-ocr openai
markitdown --list-plugins
```

Plugins are **disabled by default**. Installing one does not silently activate it. Enable plugins explicitly:

```bash
markitdown scanned-report.pdf \
  --use-plugins \
  --llm-client openai \
  --llm-model gpt-4o \
  -o scanned-report.md
```

Or use Python:

```python
import os
from markitdown import MarkItDown
from openai import OpenAI

converter = MarkItDown(
    enable_plugins=True,
    llm_client=OpenAI(api_key=os.environ["OPENAI_API_KEY"]),
    llm_model="gpt-4o",
)

result = converter.convert("scanned-report.pdf")
print(result.text_content)
```

If the plugin loads without an `llm_client`, OCR is skipped and the standard converter is used. That graceful fallback avoids a crash, but it can also hide a configuration mistake. In production, add an acceptance check for expected OCR markers or text coverage rather than assuming that “plugin installed” means “OCR occurred.”

This OCR path is an LLM service layer, not a bundled traditional OCR engine. It introduces network dependency, model variability, possible hallucination, and per-request cost. It is useful when images contain meaningful text and an approved vision endpoint is available.

### 4. Azure Document Intelligence

Azure Document Intelligence is a separate cloud conversion option. In the MarkItDown integration, it is intended for document layout extraction—particularly scanned PDFs, complicated tables, and multi-column pages where the built-in parser is insufficient.

```bash
markitdown complex-report.pdf \
  -o complex-report.md \
  -d \
  -e "https://YOUR-RESOURCE.cognitiveservices.azure.com/"
```

The Python form is:

```python
from markitdown import MarkItDown

converter = MarkItDown(
    docintel_endpoint="https://YOUR-RESOURCE.cognitiveservices.azure.com/"
)
result = converter.convert("complex-report.pdf")
print(result.text_content)
```

Document Intelligence is not the `markitdown-ocr` plugin. It is an Azure layout-analysis service, uses Azure credentials and billing, and has its own regional availability and data-governance considerations. Prefer it when document geometry—tables, paragraphs, columns, page structure—is central to the task.

### 5. Azure Content Understanding

Azure Content Understanding, added to MarkItDown in the 0.1.6 release line, is broader than document conversion. It can route documents, images, audio, and video to prebuilt or custom analyzers. It can also expose structured analyzer fields as YAML front matter.

```bash
markitdown meeting.mp4 \
  --use-cu \
  --cu-endpoint "https://YOUR-CU-ENDPOINT/"
```

The Python API can use automatic analyzer selection:

```python
from markitdown import MarkItDown

converter = MarkItDown(
    cu_endpoint="https://YOUR-CU-ENDPOINT/"
)

document = converter.convert("contract.pdf")
meeting = converter.convert("meeting.mp4")
```

For domain-specific extraction, configure a custom analyzer:

```python
converter = MarkItDown(
    cu_endpoint="https://YOUR-CU-ENDPOINT/",
    cu_analyzer_id="my-contract-analyzer",
)
result = converter.convert("contract.pdf")
print(result.markdown)
```

Content Understanding is the choice when conversion is only part of the problem: perhaps you need invoice fields, contract clauses, or one API across documents and media. Every routed conversion is a billable Azure call. Restrict routed file types when only a subset needs the service.

Do not treat Content Understanding as “better OCR.” It is a multimodal analysis and structured-extraction path with a larger operational contract.

## A Practical Selection Framework

Choose the least complex path that preserves the evidence your application needs.

| Document evidence | Start with | Escalate when |
|---|---|---|
| DOCX/PPTX/XLSX with ordinary native text | Built-in converter | Important content lives in screenshots or embedded images |
| Born-digital PDF with simple paragraphs | Built-in PDF converter | Reading order, tables, or columns are damaged |
| Scan-only PDF | `markitdown-ocr` or Document Intelligence | Vision OCR is inconsistent, or geometric layout matters |
| Office files with text inside images | `markitdown-ocr` | You require a governed Azure layout service |
| Standalone image or slide visual | LLM image description | Exact text recovery or deterministic OCR is required |
| Complex PDF tables and page layout | Azure Document Intelligence | You also need domain fields or non-document modalities |
| Documents plus audio/video | Azure Content Understanding | A narrower local tool can satisfy a constrained subset |
| High-fidelity publishing conversion | Pandoc or another publishing workflow | Markdown cannot represent the required layout |

Four constraints should decide the final architecture:

1. **Evidence:** Is meaning carried by text, geometry, images, audio, or domain fields?
2. **Governance:** May the source leave the machine, and through which approved service?
3. **Economics:** What are acceptable latency and per-document cost at corpus scale?
4. **Recovery:** Can the pipeline detect poor conversion and route the source for review?

The best design is often a cascade: local conversion first, quality checks second, cloud escalation only for files that fail. This is not merely a cost optimization. It keeps the exceptional cases visible.

## Build a Conversion Gate Before RAG

A common mistake is to convert a folder and immediately embed every result. Once broken reading order and missing tables enter a vector index, the retrieval layer can make them look authoritative.

A safer pipeline records conversion evidence:

```python
from dataclasses import asdict, dataclass
from hashlib import sha256
from pathlib import Path
from time import perf_counter
from markitdown import MarkItDown


@dataclass
class ConversionRecord:
    source: str
    source_sha256: str
    converter: str
    elapsed_ms: int
    output_chars: int
    status: str
    error: str | None = None


converter = MarkItDown(enable_plugins=False)


def convert_one(path: Path) -> tuple[str, ConversionRecord]:
    started = perf_counter()
    source_bytes = path.read_bytes()

    try:
        result = converter.convert(path)
        text = result.text_content
        record = ConversionRecord(
            source=str(path),
            source_sha256=sha256(source_bytes).hexdigest(),
            converter="markitdown-0.1.6-built-in",
            elapsed_ms=round((perf_counter() - started) * 1000),
            output_chars=len(text),
            status="ok" if text.strip() else "empty",
        )
        return text, record
    except Exception as exc:
        record = ConversionRecord(
            source=str(path),
            source_sha256=sha256(source_bytes).hexdigest(),
            converter="markitdown-0.1.6-built-in",
            elapsed_ms=round((perf_counter() - started) * 1000),
            output_chars=0,
            status="error",
            error=f"{type(exc).__name__}: {exc}",
        )
        return "", record
```

Character count is only a smoke test. Add rules matched to your corpus:

- expected phrases or identifiers are present;
- page or section coverage is plausible;
- heading levels do not jump chaotically;
- tables contain expected headers and row counts;
- repeated headers and footers are bounded;
- output does not consist mostly of broken glyphs;
- OCR-required files contain recognized image text;
- secrets and personal data are not written to logs;
- failures enter a retry or review queue instead of becoming empty chunks.

Store the raw conversion artifact before cleaning it. Later normalization should be reproducible and separately versioned.

## A Reproducible Evaluation, Without Invented Benchmarks

I have not included fabricated accuracy percentages or latency claims here. Performance depends on the files, hardware, network, service region, model, and analyzer. Instead, use a small evaluation corpus you can inspect.

### Build the corpus

Select 20–50 documents representing the real distribution:

- a clean text PDF;
- a two-column paper;
- a scan at typical resolution;
- a table-heavy financial report;
- a DOCX with embedded screenshots;
- a PPTX with charts and speaker notes;
- an XLSX with multiple sheets and images;
- malformed or password-protected inputs;
- at least one unusually large file.

For each file, create a short checklist of must-preserve facts: title, section order, table headers, totals, footnotes, chart labels, and key identifiers. This is cheaper than producing a full ground-truth transcription and more relevant to retrieval.

### Run the candidates

Pin configuration for each path:

- MarkItDown version and installed extras;
- plugin version and enabled state;
- LLM provider, exact model, prompt, and temperature if configurable;
- Azure service, analyzer ID, region, and API version;
- retry policy and timeout.

Run every candidate into a separate output directory. Never overwrite results from another strategy.

### Score what matters

Use a simple weighted score:

| Dimension | Question | Example weight |
|---|---|---:|
| Text coverage | Are required facts present? | 30% |
| Reading order | Can a reader follow the argument? | 20% |
| Tables | Are headers and values associated correctly? | 15% |
| Visual evidence | Are image labels or meanings preserved? | 10% |
| Noise | Are duplicates, headers, and glyph errors controlled? | 10% |
| Operations | Are latency, cost, and failure rates acceptable? | 15% |

Then test downstream retrieval. Ask questions whose answers depend on tables, footnotes, and image text—not only the first paragraph. Record whether the retrieved chunk contains the supporting evidence. A Markdown file can look elegant while quietly losing the one number that matters.

Expected observations, not guaranteed results, are:

- built-in conversion should be fastest and cheapest for native text;
- OCR paths should recover more image text but add cost and variability;
- layout services should help complex pages but may still require normalization;
- every strategy will have documents that need manual review.

These are hypotheses for your experiment, not results.

## Where MarkItDown Fails

### PDF reading order

Multi-column layouts, floating captions, sidebars, and footnotes can be interleaved. The output may contain all the words in the wrong order. Word count alone will not catch this.

### Tables

Markdown tables are intentionally simple. Merged cells, nested headers, rotated labels, and page-spanning tables do not map cleanly. Consider storing extracted tables as structured JSON or CSV beside the narrative Markdown.

### Equations and diagrams

A visible equation may be a text object, embedded image, or drawing primitives. A diagram’s meaning often lies in spatial relationships that OCR alone cannot express. Preserve the original page reference and consider a description model or specialized parser.

### OCR confidence

LLM Vision can produce fluent text even when the image is ambiguous. Fluency is not confidence. For regulated or numerical documents, require verification against the source image and avoid treating generated text as a certified transcription.

### Spreadsheet semantics

Cell values are not the whole workbook. Formulas, hidden sheets, formatting conventions, comments, named ranges, and charts may carry meaning. Decide explicitly which parts belong in retrieval and which require a spreadsheet-aware extraction path.

### Very large or hostile inputs

Archives can expand dramatically, HTML can be deeply nested, and media can trigger expensive calls. Version 0.1.6 includes fixes for PDF memory growth and deeply nested HTML, but production services still need file-size limits, archive limits, timeouts, and resource isolation.

## Security and Operations

Document conversion processes untrusted content through a graph of parsers. Treat it like file upload handling, not like string formatting.

- Run workers with minimal filesystem and network privileges.
- Allowlist extensions and verify content type; do not trust filenames alone.
- Enforce compressed and expanded size limits for archives.
- Keep MarkItDown and optional parsers patched.
- Enable only reviewed plugins. Plugin packages execute Python code.
- Keep API keys in a secret store or environment, never in source or Markdown.
- Redact sensitive document content from logs and exception traces.
- Apply timeouts, concurrency limits, and cost budgets to cloud calls.
- Record whether fallback occurred; a silent OCR fallback can become silent data loss.
- Retain source-to-output provenance and make deletion policies cover derived Markdown.

The [MarkItDown repository](https://github.com/microsoft/markitdown) explicitly frames the tool for user-initiated conversion and warns about exposure to untrusted content. If you expose it as a service, the surrounding sandbox is your responsibility.

## MarkItDown vs. Pandoc, Marker, and Docling

These projects overlap, but they optimize for different jobs.

### Pandoc

[Pandoc](https://pandoc.org/) is a broad document-format converter with a rich internal document model. Choose it when converting among authored markup and publishing formats—Markdown, HTML, DOCX, EPUB, LaTeX—and when filters, citations, templates, or controlled output matter. It is not primarily an OCR system for scanned PDFs.

### Marker

[Marker](https://github.com/datalab-to/marker) focuses on converting documents, especially PDFs, with model-assisted handling of layout, tables, equations, and images. It is a stronger candidate when difficult PDF structure is the center of the problem and local model execution is acceptable. Its model and compute footprint are a different operational trade-off from MarkItDown’s lightweight built-in path.

### Docling

[Docling](https://github.com/docling-project/docling) provides a document-processing pipeline and structured document representation, with particular attention to layout, tables, reading order, and multiple export formats. Choose it when downstream code benefits from a richer intermediate model rather than Markdown alone.

### The practical answer

Use MarkItDown when input breadth, a small Python/CLI interface, and LLM-ready Markdown are valuable. Use Pandoc for authored-format conversion and publishing workflows. Evaluate Marker or Docling when PDF layout, equations, and structured parsing dominate.

Do not choose from a feature checklist. Run the same representative corpus through the candidates and inspect the evidence your application cannot afford to lose.

## A Production Pattern That Ages Well

A durable ingestion service can stay simple:

1. fingerprint and quarantine the source;
2. detect format and risk;
3. run the least expensive approved converter;
4. validate required evidence and output quality;
5. escalate failed cases to OCR or a layout service;
6. store raw output, normalized output, and provenance;
7. chunk only after structural checks;
8. sample retrieval answers against source pages;
9. reprocess when converter versions or policies change.

The escalation policy should be code and configuration, not tribal knowledge. For example:

```text
native Office text      -> built-in
embedded image text     -> markitdown-ocr
complex/scanned PDF     -> Document Intelligence
domain fields or video  -> Content Understanding
publishing fidelity     -> leave this pipeline
```

This keeps MarkItDown in its proper role: a capable component inside an evidence-preserving system.

## Conclusion

MarkItDown 0.1.6 is useful because it makes the ordinary path ordinary. Many documents can become compact Markdown through one CLI or Python interface, and optional capabilities let you address image text, complex layouts, and multimodal analysis.

But optional capabilities are not interchangeable. The OCR plugin uses LLM Vision and must be installed and enabled. LLM image descriptions interpret visuals. Azure Document Intelligence extracts document layout. Azure Content Understanding adds multimodal analyzers and structured fields. Each changes cost, privacy, latency, and failure behavior.

The deeper lesson is quieter: conversion quality is not a property of a tool in isolation. It is a relationship between a source, a question, and the evidence that must survive. Choose the smallest bridge that carries that evidence, measure it on your own documents, and keep the original shore in view.

## Official References

- [Microsoft MarkItDown repository and README](https://github.com/microsoft/markitdown)
- [MarkItDown 0.1.6 release notes](https://github.com/microsoft/markitdown/releases/tag/v0.1.6)
- [`markitdown-ocr` plugin documentation](https://github.com/microsoft/markitdown/tree/main/packages/markitdown-ocr)
- [MarkItDown package on PyPI](https://pypi.org/project/markitdown/)
- [Azure AI Content Understanding documentation](https://learn.microsoft.com/azure/ai-services/content-understanding/)
- [Azure AI Document Intelligence documentation](https://learn.microsoft.com/azure/ai-services/document-intelligence/)
