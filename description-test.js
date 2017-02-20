/**
 * UPnP Description Test
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */
'use strict';

const os = require('os');
const util = require('util');
const request = require('request');
const discovery = require('./discovery');

const PRODUCT = 'node-upnp';
const PRODUCT_VERSION = '1.0';

function getDescription(uri, callback) {
  const options = {
    uri: uri,
    method: 'GET',
    headers: {
      'user-agent': `${os.platform()}/${os.release()} UPnP/1.1 ${PRODUCT}/${PRODUCT_VERSION}`
    }
  };
  
  request(options, (err, response, body) => {
    callback(err, response, body);
  });
}

/**
 * Find (and print) content directories in the discovery message store.
 */
function findContentDirectories(discoveryServer) {
  let messages = discoveryServer.messageStore.findByST('urn:schemas-upnp-org:service:ContentDirectory:1');
  console.log('findContentDirectories');
  messages.forEach((message) => {
    message.LOCATION.forEach((header) => {
      getDescription(header.value, (err, response, body) => {
        console.log(message);
        if (err) {
          console.error(`Error getting description: ${err}`);
        } else if (response.statusCode != 200) {
          console.log(`Response status code not 200: ${response.statusCode}`);
          if (body) {
            console.log(body);
          }
        } else {
          console.log(body);
        }
      });
    });
  });
}

function findAllDescriptions(discoveryServer) {
  let locations = new Set();
  discoveryServer.messageStore.messages.forEach((message) => {
    message.LOCATION.forEach((header) => {
      locations.add(header.value);
    });
  });
  locations.forEach((location) => {
    getDescription(location, (err, response, body) => {
      console.log(location);
      if (err) {
        console.error(`Error getting description: ${err}`);
      } else if (response.statusCode != 200) {
        console.log(`Response status code not 200: ${response.statusCode}`);
        if (body) {
          console.log(body);
        }
      } else {
        console.log(body);
      }
    });
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
          findAllDescriptions(discoveryServer);
        }, 5000);
      }
    });
  }
});
