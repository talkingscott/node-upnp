/**
 * UPnP Discovery (SSDP) Test
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */
'use strict';

const util = require('util');
const discovery = require('./discovery');

/**
 * Find (and print) content directories in the discovery message store.
 */
function findContentDirectories(discoveryServer) {
  let messages = discoveryServer.messageStore.findByST('urn:schemas-upnp-org:service:ContentDirectory:1');
  console.log('findContentDirectories');
  messages.forEach((message) => {
    console.log(message);
  });
}

const discoveryServer = new discovery.DiscoveryServer();
discoveryServer.startServer((err, address) => {
  if (err) {
    console.log(`discovery server error:\n${err.stack}`);
  } else {
    console.log(`discovery server listening ${address.address}:${address.port}`);
    console.log('start search in 5 seconds');
    setTimeout(discoveryServer.startSearch.bind(discoveryServer), 5000, (err) => {
      if (err) {
        console.log(`search error:\n${err.stack}`);
      } else {
        console.log('search sent');
        console.log('print results in 5 seconds');
        setTimeout(() => {
          console.log('content of discovery message store');
          console.log(util.inspect(discoveryServer.messageStore, {depth: 5}));
          findContentDirectories(discoveryServer);
        }, 5000);
      }
    });
  }
});
