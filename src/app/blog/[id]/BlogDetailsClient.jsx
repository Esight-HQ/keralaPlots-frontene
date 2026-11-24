"use client";

import Link from "next/link";
import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";
import { BlogImage } from "../BlogExplorer";
import { formatDate, safeUrl } from "../blogModel.mjs";
import RelatedProperties from "./RelatedProperties";
import styles from "./blogDetails.module.css";

function InlineText({ text }) {
  return String(text).split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && safeUrl(link[2])) return <a key={i} href={safeUrl(link[2])} rel="noopener noreferrer">{link[1]}</a>;
    return part;
  });
}

function RenderBlogContent({ content }) {
  if (!content) return null;

  // Fallback for plain text or legacy content: parse bullets, headings, and lists
  const lines = String(content).split(/\r?\n/);
  const elements = [];
  let currentList = null;
  let currentListType = null; // 'ul' | 'ol'

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      if (currentListType === "ol") {
        elements.push(<ol key={`ol-${elements.length}`}>{currentList}</ol>);
      } else {
        elements.push(<ul key={`ul-${elements.length}`}>{currentList}</ul>);
      }
      currentList = null;
      currentListType = null;
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    // Bullet match (•, ●, ○, ■, -, *)
    const bulletMatch = line.match(/^[\u2022\u25cf\u25cb\u25a0\-*]\s*(.+)$/);
    // Numbered list match (1., 2), 1 -)
    const numMatch = line.match(/^(\d+)[\.\)\-]\s*(.+)$/);
    // Markdown heading (## Heading)
    const headingMatch = line.match(/^(#{1,3})\s*(.+)$/);

    if (bulletMatch) {
      if (currentListType !== "ul") flushList();
      currentListType = "ul";
      currentList = currentList || [];
      currentList.push(
        <li key={`li-${index}`}>
          <InlineText text={bulletMatch[1]} />
        </li>
      );
    } else if (numMatch) {
      if (currentListType !== "ol") flushList();
      currentListType = "ol";
      currentList = currentList || [];
      currentList.push(
        <li key={`li-${index}`}>
          <InlineText text={numMatch[2]} />
        </li>
      );
    } else if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      if (level <= 2) {
        elements.push(<h2 key={`h-${index}`}><InlineText text={headingMatch[2]} /></h2>);
      } else {
        elements.push(<h3 key={`h-${index}`}><InlineText text={headingMatch[2]} /></h3>);
      }
    } else {
      flushList();
      if (line.length < 80 && !/[.,:;]$/.test(line) && index < lines.length - 1 && lines[index + 1]?.trim()) {
        elements.push(<h3 key={`h3-${index}`}><InlineText text={line} /></h3>);
      } else {
        elements.push(<p key={`p-${index}`}><InlineText text={line} /></p>);
      }
    }
  });

  flushList();

  return <div className={styles.articleRichContent}>{elements}</div>;
}

export default function BlogDetailsClient({ article, related }) {
  return <main className={styles.mainContent}><div className={styles.container}>
    <Link href="/blog" className={styles.backBtn}><RiArrowLeftLine /> Back to the journal</Link>
    <article className={styles.blogDetailsCard}>
      <header className={styles.headerInfo}><span className={styles.categoryBadge}>{article.category}</span><h1 className={styles.mainTitle}>{article.title}</h1><p className={styles.articleExcerpt}>{article.excerpt}</p><div className={styles.metaRow}><span>{article.author}</span>{formatDate(article.publishedAt) && <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>}<span>{article.readTime} min read</span></div>{formatDate(article.updatedAt) && <p className={styles.updated}>Last updated: {formatDate(article.updatedAt)}</p>}</header>
      <figure className={styles.heroFigure}><div className={styles.coverImageContainer}><BlogImage src={article.image} alt={article.imageAlt} eager className={styles.coverImage} /></div>{article.image_caption && <figcaption>{article.image_caption}</figcaption>}</figure>
      <div className={styles.readingLayout}>
        <aside className={styles.toc} aria-label="On this page"><strong>IN THIS GUIDE</strong>{article.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.heading}</a>)}{article.faq.length > 0 && <a href="#questions">Frequently asked questions</a>}<a href="#explore-properties">Explore properties</a></aside>
        <div className={styles.articleBody}>
          {(article.intro || article.excerpt) && <p className={styles.introText}>{article.intro || article.excerpt}</p>}
          {/* contentHtml was sanitized on the server (lib/sanitizeHtml.server.js). */}
          {article.contentHtml ? (
            <div className={styles.articleRichContent} dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          ) : article.content ? (
            <RenderBlogContent content={article.content} />
          ) : null}
          {article.sections.map(section => <section id={section.id} key={section.id} className={styles.articleSection}><h2>{section.heading}</h2>{section.paragraphs.map((p, i) => <p key={i}><InlineText text={p} /></p>)}{section.bullets.length > 0 && <ul>{section.bullets.map((p, i) => <li key={i}><InlineText text={p} /></li>)}</ul>}{section.table?.headers && Array.isArray(section.table.rows) && <div className={styles.tableScroll}><table><thead><tr>{section.table.headers.map((h, i) => <th scope="col" key={i}>{h}</th>)}</tr></thead><tbody>{section.table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>)}
          {article.gallery.length > 0 && <div className={styles.gallery}>{article.gallery.map((image, i) => <figure key={i}><BlogImage src={safeUrl(image.url)} alt={image.alt || article.title} />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>}
          {article.faq.length > 0 && <section id="questions" className={styles.faq}><h2>Your questions, answered</h2>{article.faq.map((item, i) => <details key={i}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
          <aside className={styles.editorialNote}><strong>A note before you decide</strong><p>This article is general educational information from KeralaPlots. For legal, financial or technical decisions, consult an appropriately qualified professional and the relevant authority. A listing or a single document does not establish that a property is suitable or legally clear.</p></aside>
          {article.sources.length > 0 && <section className={styles.sources}><h2>Sources & useful resources</h2><ul>{article.sources.map(source => <li key={source.url}><a href={safeUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul></section>}
          {article.internalLinks.length > 0 && <div className={styles.exploreLinks}>{article.internalLinks.map(link => <Link key={link.href} href={link.href}>{link.label} <RiArrowRightLine /></Link>)}</div>}
          <aside className={styles.articleCta}><h2>Take the next step, at your own pace.</h2><p>{article.cta?.text || "Explore properties on KeralaPlots, build a shortlist and arrange a visit to understand your options."}</p><Link href={safeUrl(article.cta?.href, "/properties")}>{article.cta?.label || "Explore properties"} <RiArrowRightLine /></Link></aside>
          {article.tags.length > 0 && <div className={styles.tags}>{article.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        </div>
      </div>
      {/* <div className={styles.shareSection}><h2 className={styles.shareTitle}>Share this guide</h2><div className={styles.shareButtonsRow}><button className={styles.shareBtn} onClick={() => share("facebook")} aria-label="Share on Facebook"><RiFacebookFill /></button><button className={styles.shareBtn} onClick={() => share("x")} aria-label="Share on X"><RiTwitterXFill /></button><button className={styles.shareBtn} onClick={() => share("linkedin")} aria-label="Share on LinkedIn"><RiLinkedinFill /></button><button className={styles.shareBtn} onClick={copyLink} aria-label="Copy article link"><RiLink /></button></div><p role="status">{copyStatus}</p></div> */}
    </article>
    <RelatedProperties article={article} />
    {related.length > 0 && <section className={styles.relatedSection}><h2 className={styles.relatedTitle}>Keep exploring</h2><div className={styles.relatedGrid}>{related.map(post => <Link href={post.href} key={post.slug} className={styles.relatedCard}><div className={styles.relatedImageContainer}><BlogImage src={post.image} alt={post.imageAlt} className={styles.relatedCover} /></div><div className={styles.relatedCardBody}><span className={styles.relatedCategory}>{post.category}</span><h3 className={styles.relatedCardTitle}>{post.title}</h3><span className={styles.relatedDate}>{post.readTime} min read</span></div></Link>)}</div></section>}
  </div></main>;
}
