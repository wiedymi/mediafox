import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "XiaoMei 小美",
  description:
    "Framework-agnostic, TypeScript-first video player library powered by Mediabunny. Full control over rendering and UI.",

  head: [
    ["meta", { name: "theme-color", content: "#3b82f6" }],
    ["meta", { name: "og:type", content: "website" }],
    [
      "meta",
      { name: "og:title", content: "XiaoMei - Modern Video Player Library" },
    ],
    [
      "meta",
      {
        name: "og:description",
        content:
          "Framework-agnostic, TypeScript-first video player library powered by Mediabunny",
      },
    ],
    [
      "style",
      {},
      `
        .VPNavBarTitle .VPImage {
          margin-right: 8px;
        }
        .logo {
          object-fit: cover !important;
          border-radius: 1000% !important;
          overflow: hidden !important;
          width: 28px !important;
          height: 28px !important;
        }
      `,
    ],
  ],

  appearance: "dark",

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.png",

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      {
        text: "API",
        items: [
          { text: "Player API", link: "/api/player" },
          { text: "Utilities", link: "/api/utilities" },
        ],
      },
      { text: "GitHub", link: "https://github.com/wiedymi/xiaomei" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Basic Usage", link: "/guide/basic-usage" },
          ],
        },
        {
          text: "Framework Integration",
          items: [
            { text: "React", link: "/guide/react" },
            { text: "Vue", link: "/guide/vue" },
            { text: "Angular", link: "/guide/angular" },
            { text: "Svelte", link: "/guide/svelte" },
            { text: "Vanilla JavaScript", link: "/guide/vanilla" },
          ],
        },
        {
          text: "Advanced",
          items: [
            { text: "State Management", link: "/guide/state-management" },
            { text: "Event Handling", link: "/guide/events" },
            { text: "Track Management", link: "/guide/tracks" },
            { text: "Fallback Decoder", link: "/guide/fallback-decoder" },
            { text: "Performance", link: "/guide/performance" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Player", link: "/api/player" },
            { text: "Utilities", link: "/api/utilities" },
            { text: "Types", link: "/api/types" },
            { text: "Events", link: "/api/events" },
            { text: "Errors", link: "/api/errors" },
          ],
        },
        {
          text: "Components",
          items: [
            { text: "EventEmitter", link: "/api/event-emitter" },
            { text: "Store", link: "/api/store" },
            { text: "SourceManager", link: "/api/source-manager" },
            { text: "TrackManager", link: "/api/track-manager" },
            { text: "PlaybackController", link: "/api/playback-controller" },
          ],
        },
      ],
    },

    search: {
      provider: "local",
    },

    footer: {
      message: "MIT License",
    },

    editLink: {
      pattern: "https://github.com/wiedymi/xiaomei/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/wiedymi/xiaomei" },
      { icon: "npm", link: "https://www.npmjs.com/package/xiaomei" },
    ],
  },

  vite: {
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
    worker: {
      format: "es",
    },
  },
});
