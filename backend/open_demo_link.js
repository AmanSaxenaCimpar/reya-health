const fs = require('fs');
const path = require('path');
const localtunnel = require('localtunnel');

const logFile = path.join(process.env.TEMP || '.', 'reya-demo-link.txt');

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  fs.appendFileSync(logFile, line);
  process.stdout.write(line);
}

(async () => {
  log('connecting');
  const tunnel = await localtunnel({
    port: 8090,
    host: 'https://loca.lt',
    subdomain: 'reya-health-demo',
  });
  log(`url ${tunnel.url}`);
  tunnel.on('error', (error) => log(`error ${error.message}`));
  tunnel.on('close', () => log('closed'));
  tunnel.on('request', (request) => log(`request ${request.method} ${request.path}`));
  setInterval(() => {}, 60 * 60 * 1000);
})().catch((error) => {
  log(`fatal ${error.stack || error.message}`);
  process.exit(1);
});
