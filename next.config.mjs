/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // The dev-mode overlay badge sits over the bottom-left of the page and ends
  // up in screenshots taken for the deck.
  devIndicators: false,
  // The analyst agent reads its grounding documents from disk at request time.
  // Without this they are not traced into the serverless bundle and the agent
  // deploys with no documents to cite, which fails silently rather than loudly.
  outputFileTracingIncludes: {
    "/api/assess": ["./data/library/**/*.md"],
  },
};
export default nextConfig;
