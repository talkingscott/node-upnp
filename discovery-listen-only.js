/**
 * UPnP Discovery (SSDP) Test
 *
 * The discovery service is started, but no search is sent.  Every 60 seconds,
 * the content of the discovery message store is logged.  The store should not
 * have duplicates, as new messages for a service should replace existing ones.
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */

'use strict';

const util = require('util');
const discovery = require('./discovery');

const discoveryService = new discovery.DiscoveryService();

/**
 * Inspect an object using our default depth
 *
 * @param {Object} o
 */
function inspect(o) {
  return util.inspect(o, { depth: 8 });
}

discoveryService.startService((err, address) => {
  if (err) {
    console.log(`discovery server error:\n${err.stack}`);
  } else {
    console.log(`discovery server listening ${address.address}:${address.port}`);
    setInterval(() => {
      console.log('content of discovery message store');
      console.log(inspect(discoveryService.messageStore));
    }, 60000);
  }
});
