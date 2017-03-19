'use strict';

const dgram = require('dgram');

const server = dgram.createSocket('udp4');

function sendSearch() {
  const buf = 'M-SEARCH * HTTP/1.1\r\n' +
    'HOST: 239.255.255.250:1900\r\n' +
    'MAN: "ssdp:discover"\r\n' +
    'MX: 2\r\n' +
    'ST: ssdp:all\r\n' +
    'USER-AGENT: OS/version UPnP/1.1 product/version\r\n' +
    '\r\n';
  server.send(buf, 0, buf.length, 1900, '239.255.255.250', (err) => {
    if (err) {
      console.log(`search error:\n${err.stack}`);
    } else {
      console.log('Search sent');
    }
  });
}

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`From ${rinfo.address}:${rinfo.port}\n${msg}`);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
  setTimeout(sendSearch, 5000);
});

server.bind(1900);
