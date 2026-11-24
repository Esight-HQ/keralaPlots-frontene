/* The home page lives in the "(home)" route group (the URL is still "/").
   Next.js merges the root page's client manifest into every other route, so
   while this file sat at app/page.js every page also downloaded the home
   page's JavaScript. Inside a route group it only loads on "/". */
import Nav from "../componants/nav/nav";
import HomeBanner from "../home/homeBanner";
import HomeFeaturedProperty from "../home/homeFeaturedProperty";
import HomeFeaturedBuilders from "../home/homeFeaturedBuilders";
import HomeStories from "../home/homeStories";
import HomeCategories from "../home/homeCategories";
import HomeWhyChoose from "../home/homeWhyChoose";
import HomeAgents from "../home/homeAgents";
import HomeServiceProviders from "../home/homeServiceProviders";
import HomeDistricts from "../home/homeDistricts";
import HomeServices from "../home/homeServices";
import Footer from "../componants/footer/footer";
import ChatpierWidget from "../componants/chatWidget/ChatpierWidget";
import { getSeoSettings, generateDynamicMetadata } from "../lib/seoHelper";
import { jsonLdHtml } from "../lib/jsonLd";

export async function generateMetadata() {
  return await generateDynamicMetadata("home", {
    title: "Plots in Kerala | Buy & Sell Property – KeralaPlots",
    description:
      "Explore plots in Kerala, property sale and land for sale. Buy, sell, rent or lease houses, villas and flats on KeralaPlots, a Kerala real estate website.",
    keywords:
      "plots in Kerala, property sale in Kerala, land for sale in Kerala, real estate in Kerala, Kerala real estate website",
    canonical: "https://keralaplots.com",
  });
}

export default async function Home() {
  const homeSeo = await getSeoSettings("home");
  const schemaMarkup = homeSeo?.schema_markup;

  return (
    <main>
      {schemaMarkup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdHtml(schemaMarkup),
          }}
        />
      )}
      <Nav />
      <HomeBanner />
      <HomeStories />
      <HomeCategories />
      <HomeFeaturedProperty />
      <HomeFeaturedBuilders />
      <HomeAgents />
      <HomeServiceProviders />
      <HomeDistricts />
      <HomeServices />
      <HomeWhyChoose />
      <Footer />
      <ChatpierWidget />
    </main>
  );
}
