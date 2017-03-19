/**
 * UPnP Discovery (SSDP) Test
 *
 * The discovery service is started, and 5 seconds later a search is sent.
 * Five seconds after that, the content of the discovery message store is logged.
 * The store should contain messages for all services on the network.
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */

'use strict';

const util = require('util');
const discovery = require('./discovery');

/**
 * Inspect an object using our default depth
 *
 * @param {Object} o
 */
function inspect(o) {
  return util.inspect(o, { depth: 8 });
}

/**
 * Find (and print) content directories in the discovery message store.
 */
function findContentDirectories(discoveryServer) {
  const messages = discoveryServer.messageStore.findByST('urn:schemas-upnp-org:service:ContentDirectory:1');
  console.log('findContentDirectories');
  messages.forEach((message) => {
    console.log(message);
  });
}

const discoveryService = new discovery.DiscoveryService();
discoveryService.startService((err, address) => {
  if (err) {
    console.log(`discovery server error:\n${err.stack}`);
  } else {
    console.log(`discovery server listening ${address.address}:${address.port}`);
    console.log('start search in 5 seconds');
    setTimeout(discoveryService.startSearch.bind(discoveryService), 5000, 'ssdp:all', (err2) => {
      if (err2) {
        console.log(`search error:\n${err2.stack}`);
      } else {
        console.log('search sent');
        console.log('print results in 5 seconds');
        setTimeout(() => {
          console.log('content of discovery message store');
          console.log(inspect(discoveryService.messageStore));
          findContentDirectories(discoveryService);
        }, 5000);
      }
    });
  }
});
