"use client";
import Link from "next/link";
export default function BlogError({ reset }) {
  return <main style={{ padding: "160px 24px", maxWidth: 720, margin: "auto" }}><h1>We couldn’t load this article</h1><p>The article service may be temporarily unavailable. Please try again.</p><button onClick={reset}>Try again</button><p><Link href="/blog">Back to the journal</Link></p></main>;
}
