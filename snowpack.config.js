// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  exclude: [
    "_*.scss",
  ],
  mount: {
    /* ... */
    src: "/",
    "scrape/dist_data": "/data",
    test: "/test",
  },
  plugins: [
    /* ... */
    "@snowpack/plugin-sass",
    "@snowpack/plugin-postcss",
    "@snowpack/plugin-webpack",
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
    open: "none",
    port: 8081,
  },
  buildOptions: {
    /* ... */
  },
};
