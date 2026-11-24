"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RiArrowRightLine, RiSearchLine, RiTimeLine, RiArrowDownSLine, RiBookOpenLine } from "react-icons/ri";
import { BLOG_CATEGORIES, formatDate, DEFAULT_COVER } from "./blogModel.mjs";
import styles from "./blog.module.css";

export function BlogImage({ src, alt, className, eager = false }) {
  // Existing CMS images come from multiple hosts; retain ordinary image support.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading={eager ? "eager" : "lazy"} onError={event => { if (!event.currentTarget.src.endsWith(DEFAULT_COVER)) event.currentTarget.src = DEFAULT_COVER; }} />;
}

export default function BlogExplorer({ posts, unavailable }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All articles");
  const [sort, setSort] = useState("newest");
  const [count, setCount] = useState(6);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const categories = [...new Set([...BLOG_CATEGORIES, ...posts.map(p => p.category)])];
  const filtered = posts.filter(p => (category === "All articles" || p.category === category) && [p.title, p.excerpt, p.category, ...p.tags].join(" ").toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "quick" ? a.readTime - b.readTime : (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
  const reset = () => { setQuery(""); setCategory("All articles"); setCount(6); };
  return <main className={styles.mainContent}>
    <div className={styles.container}>
      <header className={styles.editorialHeader}>
        <p className={styles.eyebrow}>THE KERALAPLOTS JOURNAL</p>
        <h1 className={styles.pageTitle}>A little local knowledge.<br /><span>A better property decision.</span></h1>
        <p className={styles.pageSubtitle}>Practical guides for buying, selling and making a home in Kerala.<br />Start with the questions that matter to you.</p>
        <Link href="/properties" className={styles.discoveryLink}>Find your place in Kerala <RiArrowRightLine /></Link>
      </header>
      {/* {featured && <section className={styles.featured} aria-label="Featured guide">
        <Link href={featured.href} className={styles.featuredImage}><BlogImage src={featured.image} alt={featured.imageAlt} eager className={styles.coverImage} /></Link>
        <div className={styles.featuredBody}>
          <p className={styles.eyebrow}><RiBookOpenLine /> START HERE</p>
          <span className={styles.categoryBadge}>{featured.category}</span>
          <h2><Link href={featured.href}>{featured.title}</Link></h2>
          <p>{featured.excerpt}</p>
          <div className={styles.featuredMeta}>{featured.author} <span>· {featured.readTime} min read</span></div>
          <Link href={featured.href} className={styles.readGuide}>Read the guide <RiArrowRightLine /></Link>
        </div>
      </section>} */}
      <section aria-labelledby="articles-heading" className={styles.articlesSection}>
        <div className={styles.headerRow}>
          <div><p className={styles.eyebrow}>EXPLORE THE JOURNAL</p><h2 id="articles-heading" className={styles.sectionTitle}>Guidance for every next step</h2></div>
          <div className={styles.searchWrapper}><RiSearchLine className={styles.searchIcon} /><input type="search" aria-label="Search articles" placeholder="Search topics, places, questions…" value={query} onChange={e => { setQuery(e.target.value); setCount(6); }} className={styles.searchInput} /></div>
        </div>
        <div className={styles.categories} aria-label="Article categories">{["All articles", ...categories].map(cat => <button type="button" key={cat} aria-pressed={category === cat} className={category === cat ? styles.activeCategory : styles.categoryButton} onClick={() => { setCategory(cat); setCount(6); }}>{cat === "Property Documentation & Legal Awareness" ? "Documentation & Legal" : cat}</button>)}</div>
        <div className={styles.resultsRow}><p role="status">{filtered.length} {filtered.length === 1 ? "article" : "articles"}{category !== "All articles" ? ` in ${category}` : " to explore"}</p><label>Sort by <select value={sort} onChange={e => { setSort(e.target.value); setCount(6); }}><option value="newest">Newest first</option><option value="quick">Quickest read</option></select></label></div>
        {unavailable && <div className={styles.serviceNotice} role="status">Our latest updates are temporarily unavailable. You can still read our editorial guides. <button disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Retrying…" : "Try again"}</button></div>}
        {filtered.length ? <div className={styles.blogGrid}>{filtered.slice(0, count).map(post => <Link href={post.href} key={post.slug} className={styles.blogCard}>
          <div className={styles.cardHeaderImage}><BlogImage src={post.image} alt={post.imageAlt} className={styles.coverImage} /></div>
          <div className={styles.cardBody}><span className={styles.categoryBadge}>{post.category}</span><h3 className={styles.cardTitle}>{post.title}</h3><p className={styles.cardDesc}>{post.excerpt}</p><div className={styles.cardFooter}><span>{formatDate(post.publishedAt)}</span><span className={styles.metaItem}><RiTimeLine /> {post.readTime} min read</span><RiArrowRightLine /></div></div>
        </Link>)}</div> : <div className={styles.noResultsArea}><RiBookOpenLine size={40} /><h3 className={styles.noResultsTitle}>{query ? "No matching articles" : "More guides are on the way"}</h3><p className={styles.noResultsDesc}>{query ? "Try a different topic or clear your filters to explore all our guides." : `We’re preparing useful, carefully researched articles for ${category.toLowerCase()}. Explore another category in the meantime.`}</p><button className={styles.resetSearchBtn} onClick={reset}>View all articles</button></div>}
        {filtered.length > count && <div className={styles.loadMoreWrapper}><button className={styles.loadMoreBtn} onClick={() => setCount(n => n + 6)}>Load more articles <RiArrowDownSLine /></button></div>}
      </section>
      <aside className={styles.nextStep}><div><p className={styles.eyebrow}>FROM READING TO EXPLORING</p><h2>Your next chapter starts with a place.</h2><p>Find plots, homes and commercial spaces that fit your plans.</p></div><Link href="/properties">Explore properties <RiArrowRightLine /></Link></aside>
    </div>
  </main>;
}
