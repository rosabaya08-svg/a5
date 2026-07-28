import type { NextConfig } from "next";
import path from "node:path";

const firebaseServerStubPath = path.join(process.cwd(), "lib/firebase/serverSdkStub.ts");

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        "firebase/app": firebaseServerStubPath,
        "firebase/app-check": firebaseServerStubPath,
        "firebase/auth": firebaseServerStubPath,
        "firebase/firestore": firebaseServerStubPath,
        "firebase/storage": firebaseServerStubPath,
      };
    }

    return config;
  },
};

export default nextConfig;
