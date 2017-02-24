'use strict';

const util = require('util');
const DOMParser = require('xmldom').DOMParser;

/**
 * Parses a JavaScript object from an XML DOM element.  Specifically, the
 * element is expected to be an xmldom.DOMParser element.
 *
 * Attributes become properties starting with the '@' character.
 * Simple data becomes a property named '$' if there are attributes
 * on the enclosing element.
 * Simple data is always a String.
 * Element names that appear multiple times become a single Array property.
 *
 * @param element {Element} The XML DOM element.
 * @returns {Object} A JavaScript object containing the same information.
 */
function parseObjectFromElement(element) {
  let children = element.childNodes;
  let elementCount = 0;
  let obj = {};
  let txt = '';
  for (var c = 0; c < children.length; c++) {
    let child = children.item(c);
    if (child.localName) {
      elementCount += 1;
      // TODO: either prefix or namespaceURI to disambiguate
      if (obj[child.localName]) {
        if (!Array.isArray(obj[child.localName])) {
          obj[child.localName] = [obj[child.localName]];
        }
        obj[child.localName].push(parseObjectFromElement(child));
      } else {
        obj[child.localName] = parseObjectFromElement(child);
      }
    } else if (child.data) {
      txt += child.data.trim();
    }
  }
  if (elementCount || element.attributes.length) {
    if (txt) {
      obj.$ = txt;
    }
    for (var a = 0; a < element.attributes.length; a++) {
      // TODO: name has prefix
      obj[`@${element.attributes.item(a).name}`] = element.attributes.item(a).value;
    }
    return obj;
  }
  return txt;
}

/**
 * Parses a JavaScript object from an XML string.
 *
 * The rules from {@link parseObjectFromElement} apply.
 *
 * @param xml {String} The XML string.
 * @returns {Object} A JavaScript object containing the same information.
 */
function parseObjectFromXml(xml) {
  let doc = new DOMParser().parseFromString(xml, 'text/xml');
  //console.log(util.inspect(doc.documentElement, {depth:6}));
  return parseObjectFromElement(doc.documentElement);
}

module.exports.parseObjectFromElement = parseObjectFromElement;
module.exports.parseObjectFromXml = parseObjectFromXml;
