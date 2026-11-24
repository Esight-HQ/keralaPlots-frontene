import Nav from "../../componants/nav/nav";
import Footer from "../../componants/footer/footer";
import { notFound, permanentRedirect } from "next/navigation";
import { getBlog } from "../blogRepository";
import { relatedBlogs, safeUrl, SITE_URL } from "../blogModel.mjs";
import { truncateAtWord, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "../../lib/seoHelper";
import BlogDetailsClient from "./BlogDetailsClient";
import { sanitizeCmsHtml, HTML_CONTENT_PATTERN } from "../../lib/sanitizeHtml.server";
import { jsonLdHtml } from "../../lib/jsonLd";
import styles from "./blogDetails.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { article } = await getBlog(id);
  if (!article) return { title: "Article not found | KeralaPlots", robots: { index: false, follow: false } };
  const title = truncateAtWord(article.meta_title || article.title, MAX_TITLE_LENGTH);
  const description = truncateAtWord(article.meta_description || article.excerpt, MAX_DESCRIPTION_LENGTH);
  return {
    title, description, keywords: [article.primary_keyword, ...article.secondaryKeywords].filter(Boolean),
    alternates: { canonical: article.canonical }, robots: { index: article.indexable, follow: true },
    openGraph: { type: "article", title, description, url: article.canonical, siteName: "KeralaPlots", locale: "en_IN", publishedTime: article.publishedAt || undefined, modifiedTime: article.updatedAt || undefined, authors: [article.author], images: [{ url: new URL(article.image, SITE_URL).href, alt: article.imageAlt }] },
    twitter: { card: "summary_large_image", title, description, images: [new URL(article.image, SITE_URL).href] },
  };
}

export default async function BlogDetailsPage({ params }) {
  const { id } = await params;
  const { article, catalog } = await getBlog(id);
  if (!article) notFound();
  if (String(article.id) === id && article.slug !== id) permanentRedirect(article.href);
  const related = relatedBlogs(article, catalog.posts);
  // CMS HTML is cleaned here on the server; the client renders only the cleaned copy.
  const isHtml = typeof article.content === "string" && HTML_CONTENT_PATTERN.test(article.content);
  const safeArticle = { ...article, content: isHtml ? null : article.content, contentHtml: isHtml ? sanitizeCmsHtml(article.content) : "" };
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting", headline: article.title, description: article.excerpt, image: new URL(article.image, SITE_URL).href, datePublished: article.publishedAt || undefined, dateModified: article.updatedAt || undefined, author: { "@type": article.author === "KeralaPlots Editorial Team" ? "Organization" : "Person", name: article.author }, publisher: { "@type": "Organization", name: "KeralaPlots", url: SITE_URL }, mainEntityOfPage: safeUrl(article.canonical), articleSection: article.category };
  return <div className={styles.pageWrapper}><Nav /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(schema) }} /><BlogDetailsClient article={safeArticle} related={related} /><Footer /></div>;
}
