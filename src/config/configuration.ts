export default () => ({
  database: {
    uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/copo',
  },
  redis: process.env.REDIS || 'redis://localhost:6379',
  redis_queue: process.env.REDIS_QUEUE || 'redis://localhost:6379',
  copo: {
    apiUrl: process.env.COPO_API_URL || 'https://merchant.copo.vip',
  },
  port: parseInt(process.env.PORT, 10) || 3000,
  site: process.env.SITE || 'production',
});
