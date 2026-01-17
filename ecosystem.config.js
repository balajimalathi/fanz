module.exports = {
  apps: [
    {
      name: "fanz-app",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
}