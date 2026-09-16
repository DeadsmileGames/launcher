const { createNotification, createRequest } = require("@itchio/butlerd");

const ProfileLoginWithAPIKey = createRequest("Profile.LoginWithAPIKey");
const FetchProfileOwnedKeys = createRequest("Fetch.ProfileOwnedKeys");
const FetchGameUploads = createRequest("Fetch.GameUploads");
const InstallQueue = createRequest("Install.Queue");
const InstallPerform = createRequest("Install.Perform");
const InstallCancel = createRequest("Install.Cancel");
const Progress = createNotification("Progress");

module.exports = {
  ProfileLoginWithAPIKey,
  FetchProfileOwnedKeys,
  FetchGameUploads,
  InstallQueue,
  InstallPerform,
  InstallCancel,
  Progress,
};