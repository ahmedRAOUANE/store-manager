import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Extension zips are small (fixtures are <10 KB; the largest
      // realistic extension is well under 1 MB), but the default
      // 1 MB cap is too tight for a zip that includes the full
      // source tree. 10 MB gives headroom while still protecting
      // against accidental multi-megabyte uploads. The Server
      // Action's `extractZipFileFromFormData` further caps at
      // 4.5 MB — that's the service-level limit, matching Vercel's
      // Hobby function-body cap.
      bodySizeLimit: "10mb",
    },
  },
  // serverActions: {
  //   bodySizeLimit: "10mb",
  // },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);