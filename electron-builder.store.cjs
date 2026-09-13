const { build } = require("./package.json");

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required for the Microsoft Store build.`);
  return value;
}

const identityName = required("MICROSOFT_STORE_IDENTITY_NAME");
const publisher = required("MICROSOFT_STORE_PUBLISHER");
const publisherDisplayName = required("MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME");

module.exports = {
  ...build,
  directories: {
    ...build.directories,
    output: "release-store",
    buildResources: "build",
  },
  win: {
    ...build.win,
    target: [
      {
        target: "appx",
        arch: ["x64"],
      },
    ],
  },
  appx: {
    identityName,
    publisher,
    publisherDisplayName,
    applicationId: "DeadsmileGamesLauncher",
    displayName: "Deadsmile Games Launcher",
    backgroundColor: "#0B0C10",
    languages: ["pt-BR", "en-US", "es-ES"],
    minVersion: "10.0.17763.0",
    maxVersionTested: "10.0.26100.0",
    artifactName: "Deadsmile-Games-Launcher-Store-${version}-${arch}.msix",
    electronUpdaterAware: false,
    capabilities: ["internetClient"],
  },
};
