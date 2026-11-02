process.env.NODE_ENV = 'production';
process.env.DIDWA_START_SERVER = 'true';

await import('../server.js');
