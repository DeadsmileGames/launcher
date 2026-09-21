const { createNotification, createRequest } = require("@itchio/butlerd");

const ProfileLoginWithOAuthCode = createRequest("Profile.LoginWithOAuthCode");
const ProfileList = createRequest("Profile.List");
const ProfileUseSavedLogin = createRequest("Profile.UseSavedLogin");
const FetchProfileOwnedKeys = createRequest("Fetch.ProfileOwnedKeys");
const FetchGame = createRequest("Fetch.Game");
const FetchGameUploads = createRequest("Fetch.GameUploads");
const InstallQueue = createRequest("Install.Queue");
const InstallPerform = createRequest("Install.Perform");
const InstallCancel = createRequest("Install.Cancel");
const Progress = createNotification("Progress");

module.exports = {
  ProfileLoginWithOAuthCode,
  ProfileList,
  ProfileUseSavedLogin,
  FetchProfileOwnedKeys,
  FetchGame,
  FetchGameUploads,
  InstallQueue,
  InstallPerform,
  InstallCancel,
  Progress,
};
