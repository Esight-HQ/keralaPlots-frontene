"use client";

/* The 404 screen. It is a client component on purpose: the root not-found
   boundary is part of every page's payload, and rendering Nav/Footer straight
   from a server file made Next.js reuse the home page's JS bundle for them on
   every route. Wrapped like this, every page only references this small view. */
import Link from "next/link";
import Nav from "../nav/nav";
import dynamic from "next/dynamic";
import styles from "../../notFound.module.css";
import { RiHome5Line } from "react-icons/ri";

// Loaded only when the 404 screen actually renders (still server-rendered),
// so the footer's JS isn't attached to every page through this boundary.
const Footer = dynamic(() => import("../footer/footer"));

/* Ghosted 404, city haze and a modern villa — drawn inline so the page ships no
   extra assets and the whole scene scales as one piece. */
function NotFoundScene() {
    return (
        <div className={styles.notFountImg}>
            <img src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/fefb736f-8f2a-43ca-cf86-7efde36cd000/public" alt="404" />
        </div>
    );
}

export default function NotFoundView() {
    return (
        <>
            <Nav />

            <main className={styles.page}>
                <div className={styles.container}>
                    <NotFoundScene />

                    <div className={styles.copy}>
                        <h1 className={styles.title}>Oops! We can&rsquo;t find this page</h1>

                        <p className={styles.lede}>
                            The page you&rsquo;re looking for doesn&rsquo;t exist
                            <br />
                            or may have been moved.
                        </p>

                        <Link href="/" className={styles.homeBtn}>
                            <RiHome5Line aria-hidden="true" />
                            <span>Back to Home</span>
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
