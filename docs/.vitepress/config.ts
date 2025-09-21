import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "XiaoMei 小美",
  description:
    "Framework-agnostic, TypeScript-first video player library powered by MediaBunny. Full control over rendering and UI.",

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
          "Framework-agnostic, TypeScript-first video player library powered by MediaBunny",
      },
    ],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.svg",

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
      {
        text: "Examples",
        items: [
          { text: "Basic Player", link: "/examples/basic" },
          { text: "Advanced Features", link: "/examples/advanced" },
          { text: "Custom UI", link: "/examples/custom-ui" },
          { text: "Multi-Track", link: "/examples/multi-track" },
          { text: "Live Streaming", link: "/examples/streaming" },
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
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Basic Player", link: "/examples/basic" },
            { text: "Advanced Features", link: "/examples/advanced" },
            { text: "Custom UI", link: "/examples/custom-ui" },
            { text: "Multi-Track", link: "/examples/multi-track" },
            { text: "Live Streaming", link: "/examples/streaming" },
          ],
        },
      ],
    },

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present",
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
