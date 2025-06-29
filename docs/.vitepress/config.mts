import { withMermaid } from "vitepress-plugin-mermaid";
import { defineConfig } from "vitepress";

export default withMermaid(
  defineConfig({
    lang: "en-US",
    title: "wicketkeeper",
    description: "A Privacy-Friendly, Proof-of-Work Captcha",
    ignoreDeadLinks: true,
    lastUpdated: true,

    appearance: "force-dark",

    sitemap: {
      hostname: "https://wicketkeeper.io",
    },

    head: [
      ["link", { rel: "icon", href: "/assets/logo.svg" }],
      [
        "meta",
        {
          name: "keywords",
          content:
            "wicketkeeper, captcha, proof-of-work, pow, captcha alternative, privacy-friendly captcha, hcaptcha alternative, recaptcha alternative, anti-spam, bot protection, web security",
        },
      ],
      ["meta", { name: "author", content: "a-ve" }],
      [
        "meta",
        {
          property: "og:title",
          content: "Wicketkeeper — A Privacy-Friendly, Proof-of-Work Captcha",
        },
      ],
      [
        "meta",
        {
          property: "og:description",
          content:
            "Wicketkeeper is a privacy-friendly, open-source CAPTCHA alternative using proof-of-work to protect your websites from spam and bots.",
        },
      ],
      ["meta", { property: "og:url", content: "https://wicketkeeper.io" }],
      [
        "meta",
        {
          property: "og:image",
          content: "https://wicketkeeper.io/assets/logo.svg",
        },
      ],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      [
        "meta",
        {
          name: "twitter:title",
          content: "wicketkeeper — A Privacy-Friendly, Proof-of-Work Captcha",
        },
      ],
      [
        "meta",
        {
          name: "twitter:description",
          content:
            "wicketkeeper is a privacy-friendly CAPTCHA alternative using proof-of-work to protect your websites.",
        },
      ],
      [
        "meta",
        {
          name: "twitter:image",
          content: "https://wicketkeeper.io/assets/logo.svg",
        },
      ],
      [
        "script",
        {
          type: "application/ld+json",
        },
        `{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "wicketkeeper",
          "url": "https://wicketkeeper.io",
          "description": "wicketkeeper is a privacy-friendly, open-source CAPTCHA alternative using proof-of-work.",
          "applicationCategory": "SecurityApplication",
          "operatingSystem": "All",
          "image": "https://wicketkeeper.io/assets/logo.svg",
          "author": {
            "@type": "Person",
            "name": "a-ve"
          },
          "license": "https://github.com/a-ve/wicketkeeper/blob/main/LICENSE",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }`,
      ],
    ],

    transformPageData(pageData) {
      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push([
        "link",
        {
          rel: "canonical",
          href: `https://wicketkeeper.io/${pageData.relativePath}`
            .replace(/index\.md$/, "")
            .replace(/\.md$/, ".html"),
        },
      ]);
    },

    themeConfig: {
      siteTitle: "wicketkeeper",
      logo: "/assets/logo.svg",

      nav: [
        { text: "Guide", link: "/guide/" },
        { text: "GitHub", link: "https://github.com/a-ve/wicketkeeper" },
      ],
      sidebar: [
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Core Concepts", link: "/guide/core-concepts" },
            { text: "Full Demo Tutorial", link: "/guide/full-demo-tutorial" },
          ],
        },
        {
          text: "Components",
          items: [
            { text: "Frontend Widget", link: "/components/frontend-widget" },
            { text: "Backend Server", link: "/components/backend-server" },
          ],
        },
        {
          text: "Integration",
          items: [
            {
              text: "Verifying on Your Backend",
              link: "/integration/verifying-on-your-backend",
            },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "API Reference", link: "/reference/api-reference" },
            { text: "FAQ & Troubleshooting", link: "/reference/faq" },
          ],
        },
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/a-ve/wicketkeeper" },
      ],
      editLink: {
        pattern: "https://github.com/a-ve/wicketkeeper/edit/develop/docs/:path",
        text: "Edit this page on GitHub",
      },
    },
  })
);
