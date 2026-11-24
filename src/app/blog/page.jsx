import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import BlogExplorer from "./BlogExplorer";
import { getBlogCatalog } from "./blogRepository";
import styles from "./blog.module.css";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { posts, unavailable } = await getBlogCatalog();
  const cards = posts.map(({ id, slug, href, title, excerpt, category, image, imageAlt, publishedAt, readTime, tags, author }) => ({ id, slug, href, title, excerpt, category, image, imageAlt, publishedAt, readTime, tags, author }));
  return <div className={styles.pageWrapper}><Nav /><BlogExplorer posts={cards} unavailable={unavailable} /><Footer /></div>;
}
