export default {
  reactStrictMode: true,
  async redirects() {
    const host = [{ type: "host", value: "cashpay-tau.vercel.app" }];
    return [
      { source: "/", has: host, destination: "https://www.cashpayt.xyz/", permanent: false },
      { source: "/:path((?!api/).*)", has: host, destination: "https://www.cashpayt.xyz/:path", permanent: false },
    ];
  },
};
