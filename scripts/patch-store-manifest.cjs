const fs = require("node:fs/promises");

const UAP3_NAMESPACE = "http://schemas.microsoft.com/appx/manifest/uap/windows10/3";
const DEADSMILE_PROTOCOL = /<uap:Extension\s+Category=(['"])windows\.protocol\1\s*>\s*<uap:Protocol\s+Name=(['"])deadsmile\2\s*>[\s\S]*?<\/uap:Protocol>\s*<\/uap:Extension>/;


function escapeXml(value, { attribute = false } = {}) {
  let escaped = String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (attribute) escaped = escaped.replace(/'/g, "&apos;");
  return escaped;
}

function escapeLegacyBuilderStoreValues(xml) {
  const publisher = String(process.env.MICROSOFT_STORE_PUBLISHER || "");
  const publisherDisplayName = String(process.env.MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME || "");

  if (publisher) {
    const raw = `Publisher='${publisher}'`;
    if (xml.includes(raw)) {
      xml = xml.replace(raw, `Publisher='${escapeXml(publisher, { attribute: true })}'`);
    }
  }

  if (publisherDisplayName) {
    const raw = `<PublisherDisplayName>${publisherDisplayName}</PublisherDisplayName>`;
    if (xml.includes(raw)) {
      xml = xml.replace(
        raw,
        `<PublisherDisplayName>${escapeXml(publisherDisplayName)}</PublisherDisplayName>`,
      );
    }
  }

  return xml;
}

function addIgnorableNamespace(xml, namespaceName) {
  const match = xml.match(/IgnorableNamespaces=(['"])([^'"]*)\1/);
  if (match) {
    const names = match[2].trim().split(/[\s,]+/).filter(Boolean);
    if (!names.includes(namespaceName)) names.push(namespaceName);
    return xml.replace(match[0], `IgnorableNamespaces="${names.join(" ")}"`);
  }

  return xml.replace(/<Package\b([^>]*)>/, (_whole, attributes) => (
    `<Package${attributes} IgnorableNamespaces="${namespaceName}">`
  ));
}

async function patchStoreManifest(manifestPath) {
  let xml = await fs.readFile(manifestPath, "utf8");
  xml = escapeLegacyBuilderStoreValues(xml);

  if (!/xmlns:uap3=(['"])/.test(xml)) {
    xml = xml.replace(
      /<Package\b/,
      `<Package xmlns:uap3="${UAP3_NAMESPACE}"`,
    );
  }

  xml = addIgnorableNamespace(xml, "uap3");

  const matches = xml.match(new RegExp(DEADSMILE_PROTOCOL.source, "g")) || [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one deadsmile protocol entry in AppxManifest.xml, found ${matches.length}.`);
  }

  xml = xml.replace(
    DEADSMILE_PROTOCOL,
    [
      '<uap3:Extension Category="windows.protocol">',
      '          <uap3:Protocol Name="deadsmile" Parameters="&quot;%1&quot;" />',
      '        </uap3:Extension>',
    ].join("\n        "),
  );

  await fs.writeFile(manifestPath, xml, "utf8");
}

module.exports = patchStoreManifest;
module.exports.default = patchStoreManifest;
