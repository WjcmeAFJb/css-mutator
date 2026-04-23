import { defineConfig } from "vitepress";

export default defineConfig({
  title: "CSS Mutator",
  description: "CSS mutation testing for Vite + Vitest — catch visual bugs before your users do",
  base: "/css-mutator/",

  head: [
    ["meta", { name: "theme-color", content: "#667eea" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:title", content: "CSS Mutator" }],
    ["meta", { name: "og:description", content: "CSS mutation testing for Vite + Vitest" }],
  ],

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "API", link: "/api/" },
      { text: "Examples", link: "/examples/" },
      { text: "Architecture", link: "/architecture/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "What is CSS Mutation Testing?", link: "/guide/" },
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "How It Works", link: "/guide/how-it-works" },
          ],
        },
        {
          text: "Configuration",
          items: [
            { text: "CLI Options", link: "/guide/cli" },
            { text: "Vite Plugin", link: "/guide/vite-plugin" },
            { text: "Vitest Browser Mode", link: "/guide/vitest-browser" },
          ],
        },
        {
          text: "Mutation Operators",
          items: [
            { text: "Overview", link: "/guide/mutators" },
            { text: "Writing Visual Tests", link: "/guide/writing-tests" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "Mutator Operators", link: "/api/mutators" },
            { text: "Vite Plugin", link: "/api/vite-plugin" },
            { text: "Orchestrator", link: "/api/orchestrator" },
            { text: "Reporter", link: "/api/reporter" },
            { text: "Types", link: "/api/types" },
          ],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Overview", link: "/architecture/" },
            { text: "Mutation Pipeline", link: "/architecture/pipeline" },
            { text: "CSS Coverage Model", link: "/architecture/coverage" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/WjcmeAFJb/css-mutator" }],

    footer: {
      message: "Released under the LGPL-3.0-or-later License.",
      copyright: "Copyright 2026 CSS Mutator Contributors",
    },

    search: {
      provider: "local",
    },
  },
});
